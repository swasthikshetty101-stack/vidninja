import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';

// Import the compiled provider library
import { makeProviders, makeStandardFetcher } from '../lib/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlayerServer {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      port: config.port || process.env.PLAYER_PORT || 3001,
      tmdbApiKey: config.tmdbApiKey || process.env.TMDB_API_KEY,
      proxyUrl: config.proxyUrl || process.env.MOVIE_WEB_PROXY_URL,
      enableCors: config.enableCors ?? true,
    };

    if (!this.config.tmdbApiKey) {
      throw new Error('TMDB API key is required. Set TMDB_API_KEY environment variable.');
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize the provider system
    this.providers = makeProviders({
      fetcher: makeStandardFetcher(fetch),
      proxiedFetcher: this.config.proxyUrl ? makeStandardFetcher(fetch) : undefined,
      target: 'native',
      consistentIpForRequests: true,
    });

    console.log('Providers initialized successfully');
    console.log('Available sources:', this.providers.listSources().length);
    console.log('Available embeds:', this.providers.listEmbeds().length);
  }

  setupMiddleware() {
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: true,
        credentials: true,
      }));
    }

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files
    this.app.use('/player', express.static(path.join(__dirname, 'web')));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        providers: {
          sources: this.providers?.listSources().length || 0,
          embeds: this.providers?.listEmbeds().length || 0,
        },
      });
    });

    // Movie endpoint
    this.app.get('/api/v1/movie/:tmdbId', async (req, res) => {
      try {
        const { tmdbId } = req.params;
        const { providers: requestedProviders, timeout = 30000 } = req.query;

        console.log(`Movie request for TMDB ID: ${tmdbId}`);

        // Get movie details from TMDB
        const movieDetails = await this.getMovieDetailsFromTMDB(tmdbId);

        // Get available providers
        let availableProviders = this.providers.listSources()
          .filter(p => !p.mediaTypes || p.mediaTypes.includes('movie'))
          .sort((a, b) => b.rank - a.rank);

        // Filter providers if specified
        if (requestedProviders) {
          const requestedIds = requestedProviders.split(',');
          availableProviders = availableProviders.filter(p => requestedIds.includes(p.id));
        }

        console.log(`Using ${availableProviders.length} providers`);

        // Try to scrape streams
        const streams = [];
        for (const provider of availableProviders.slice(0, 3)) { // Limit to top 3 providers
          try {
            console.log(`Trying provider: ${provider.name}`);

            const scrapePromise = this.providers.runSourceScraper({
              media: movieDetails,
              id: provider.id,
              disableOpensubtitles: true,
            });

            const result = await Promise.race([
              scrapePromise,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), parseInt(timeout))
              ),
            ]);

            if (result.stream && result.stream.length > 0) {
              streams.push({
                providerId: provider.id,
                providerName: provider.name,
                stream: result.stream[0],
                scrapedAt: new Date().toISOString(),
              });
              console.log(`Successfully scraped from ${provider.name}`);
              break; // Stop after finding first working stream
            }
          } catch (error) {
            console.warn(`Provider ${provider.name} failed:`, error.message);
          }
        }

        res.json({
          success: true,
          media: movieDetails,
          streams,
          providersAvailable: availableProviders.map(p => ({
            id: p.id,
            name: p.name,
            rank: p.rank,
          })),
        });

      } catch (error) {
        console.error('Movie scraping error:', error);
        res.status(500).json({
          error: 'Scraping failed',
          message: error.message,
          tmdbId: req.params.tmdbId,
        });
      }
    });

    // TV Show endpoint
    this.app.get('/api/v1/tv/:tmdbId/:season/:episode', async (req, res) => {
      try {
        const { tmdbId, season, episode } = req.params;
        const { providers: requestedProviders, timeout = 30000 } = req.query;

        console.log(`TV request for TMDB ID: ${tmdbId} S${season}E${episode}`);

        // Get show details from TMDB
        const showDetails = await this.getShowDetailsFromTMDB(tmdbId, season, episode);

        // Get available providers
        let availableProviders = this.providers.listSources()
          .filter(p => !p.mediaTypes || p.mediaTypes.includes('show'))
          .sort((a, b) => b.rank - a.rank);

        // Filter providers if specified
        if (requestedProviders) {
          const requestedIds = requestedProviders.split(',');
          availableProviders = availableProviders.filter(p => requestedIds.includes(p.id));
        }

        console.log(`Using ${availableProviders.length} providers`);

        // Try to scrape streams
        const streams = [];
        for (const provider of availableProviders.slice(0, 3)) {
          try {
            console.log(`Trying provider: ${provider.name}`);

            const result = await Promise.race([
              this.providers.runSourceScraper({
                media: showDetails,
                id: provider.id,
                disableOpensubtitles: true,
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), parseInt(timeout))
              ),
            ]);

            if (result.stream && result.stream.length > 0) {
              streams.push({
                providerId: provider.id,
                providerName: provider.name,
                stream: result.stream[0],
                scrapedAt: new Date().toISOString(),
              });
              console.log(`Successfully scraped from ${provider.name}`);
              break;
            }
          } catch (error) {
            console.warn(`Provider ${provider.name} failed:`, error.message);
          }
        }

        res.json({
          success: true,
          media: showDetails,
          streams,
          providersAvailable: availableProviders.map(p => ({
            id: p.id,
            name: p.name,
            rank: p.rank,
          })),
        });

      } catch (error) {
        console.error('TV scraping error:', error);
        res.status(500).json({
          error: 'Scraping failed',
          message: error.message,
          tmdbId: req.params.tmdbId,
        });
      }
    });

    // Get providers endpoint
    this.app.get('/api/v1/providers', (req, res) => {
      const sources = this.providers.listSources();
      const embeds = this.providers.listEmbeds();

      res.json({
        success: true,
        sources: sources.map(s => ({
          id: s.id,
          name: s.name,
          rank: s.rank,
          type: s.type,
          mediaTypes: s.mediaTypes,
        })),
        embeds: embeds.map(e => ({
          id: e.id,
          name: e.name,
          rank: e.rank,
          type: e.type,
        })),
      });
    });

    // Proxy endpoint for streams to handle CORS
    this.app.get('/proxy', async (req, res) => {
      try {
        const { url, ...headers } = req.query;

        if (!url) {
          return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`Proxying request to: ${url}`);

        // Parse headers from query parameters
        const requestHeaders = {};
        Object.keys(headers).forEach(key => {
          if (key.startsWith('h_')) {
            const headerName = key.substring(2).replace(/_/g, '-');
            requestHeaders[headerName] = headers[key];
          }
        });

        // Add some default headers
        requestHeaders['User-Agent'] = requestHeaders['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

        const response = await fetch(url, {
          headers: requestHeaders,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Copy response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Add CORS headers
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        responseHeaders['Access-Control-Allow-Headers'] = '*';

        // Set headers
        Object.entries(responseHeaders).forEach(([key, value]) => {
          res.set(key, value);
        });

        // Stream the response
        response.body.pipe(res);

      } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
          error: 'Proxy failed',
          message: error.message,
        });
      }
    });    // TMDB search endpoint
    this.app.get('/api/v1/tmdb/search', async (req, res) => {
      try {
        const { q: query, type = 'multi', page = 1 } = req.query;

        if (!query) {
          return res.status(400).json({
            error: 'Query parameter is required',
          });
        }

        const results = await this.searchTMDB(query, type, page);
        res.json({
          success: true,
          results,
        });
      } catch (error) {
        console.error('TMDB search error:', error);
        res.status(500).json({
          error: 'TMDB search failed',
          message: error.message,
        });
      }
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      });
    });
  }

  async getMovieDetailsFromTMDB(tmdbId) {
    const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);

    if (this.config.tmdbApiKey.startsWith('ey')) {
      // JWT token
    } else {
      url.searchParams.append('api_key', this.config.tmdbApiKey);
    }

    url.searchParams.append('append_to_response', 'external_ids');

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (this.config.tmdbApiKey.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${this.config.tmdbApiKey}`;
    }

    console.log(`Fetching TMDB movie details: ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), {
        headers,
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
      }

      const movie = await response.json();

      if (!movie.release_date) {
        throw new Error(`Movie "${movie.title}" has no release date`);
      }

      return {
        type: 'movie',
        title: movie.title,
        releaseYear: parseInt(movie.release_date.split('-')[0]),
        tmdbId,
        imdbId: movie.imdb_id || movie.external_ids?.imdb_id || '',
      };
    } catch (error) {
      console.error('TMDB fetch error details:', error);
      throw new Error(`Failed to fetch movie details from TMDB: ${error.message}`);
    }
  }

  async getShowDetailsFromTMDB(tmdbId, seasonNumber, episodeNumber) {
    // Get series details
    const seriesUrl = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
    if (!this.config.tmdbApiKey.startsWith('ey')) {
      seriesUrl.searchParams.append('api_key', this.config.tmdbApiKey);
    }
    seriesUrl.searchParams.append('append_to_response', 'external_ids');

    const headers = { 'Accept': 'application/json' };
    if (this.config.tmdbApiKey.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${this.config.tmdbApiKey}`;
    }

    const [seriesResponse, seasonResponse, episodeResponse] = await Promise.all([
      fetch(seriesUrl.toString(), { headers }),
      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${this.config.tmdbApiKey}`, { headers }),
      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${this.config.tmdbApiKey}`, { headers }),
    ]);

    const [series, season, episode] = await Promise.all([
      seriesResponse.json(),
      seasonResponse.json(),
      episodeResponse.json(),
    ]);

    return {
      type: 'show',
      title: series.name,
      releaseYear: parseInt(series.first_air_date.split('-')[0]),
      tmdbId,
      imdbId: series.external_ids?.imdb_id || '',
      season: {
        number: parseInt(seasonNumber),
        tmdbId: season.id.toString(),
      },
      episode: {
        number: parseInt(episodeNumber),
        tmdbId: episode.id.toString(),
      },
    };
  }

  async searchTMDB(query, type, page) {
    const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
    if (!this.config.tmdbApiKey.startsWith('ey')) {
      url.searchParams.append('api_key', this.config.tmdbApiKey);
    }
    url.searchParams.append('query', query);
    url.searchParams.append('page', page.toString());

    const headers = { 'Accept': 'application/json' };
    if (this.config.tmdbApiKey.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${this.config.tmdbApiKey}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    return response.json();
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);

      this.server.listen(this.config.port, () => {
        console.log(`🚀 Player server started on port ${this.config.port}`);
        console.log(`🎮 Web player: http://localhost:${this.config.port}/player`);
        console.log(`🔌 API: http://localhost:${this.config.port}/api/v1`);
        console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

// Start the server
const server = new PlayerServer();

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

export { PlayerServer };
