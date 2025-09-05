import {
  makeProviders,
  makeStandardFetcher,
  makeSimpleProxyFetcher,
  targets,
  setM3U8ProxyUrl,
  setProxyUrl,
  ProviderControls,
  ScrapeMedia,
  MovieMedia,
  ShowMedia,
  SourcererOutput,
  Stream,
  HlsBasedStream,
  FileBasedStream
} from '../../../../lib/index.js';
import { Config } from '../config';

export interface MediaInfo {
  type: 'movie' | 'show';
  title: string;
  releaseYear: number;
  tmdbId: string;
  imdbId: string;
  season?: {
    number: number;
    tmdbId: string;
  };
  episode?: {
    number: number;
    tmdbId: string;
  };
}

export interface StreamResult {
  providerId: string;
  providerName: string;
  stream: {
    playlist: string;
    type: string;
    headers?: Record<string, string>;
    captions?: Array<{
      language: string;
      url: string;
      type: string;
    }>;
  };
  scrapedAt: string;
}

export class ProviderService {
  private providers!: ProviderControls;
  private config: Config;
  private fetcher!: any;
  private proxiedFetcher?: any;

  constructor(config: Config) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders() {
    console.log('🔧 Initializing provider system...');

    // Set proxy URLs for stream proxying
    if (this.config.proxyUrl) {
      setM3U8ProxyUrl(`${this.config.proxyUrl}/m3u8-proxy`);
      setProxyUrl(this.config.proxyUrl);
    }

    // Create fetchers
    this.fetcher = makeStandardFetcher(fetch);

    // Use proxied fetcher if proxy URL is configured
    this.proxiedFetcher = this.config.proxyUrl
      ? makeSimpleProxyFetcher(this.config.proxyUrl, fetch)
      : this.fetcher; // fallback to regular fetcher

    this.providers = makeProviders({
      fetcher: this.fetcher,
      proxiedFetcher: this.proxiedFetcher,
      target: targets.BROWSER, // Use targets.BROWSER to ensure proxy is used
      consistentIpForRequests: true,
      proxyStreams: true, // Enable proxy for stream URLs
    });

    const sources = this.providers.listSources();
    const embeds = this.providers.listEmbeds();

    console.log('✅ Providers initialized successfully');
    console.log(`📦 Available sources: ${sources.length}`);
    console.log(`🔗 Available embeds: ${embeds.length}`);
    console.log(`🔀 Proxy enabled: ${this.config.proxyUrl ? 'Yes' : 'No'}`);
    console.log(`🔀 Stream proxying: ${this.config.proxyUrl ? 'Yes' : 'No'}`);

    if (this.config.proxyUrl) {
      console.log(`🌐 Proxy URL: ${this.config.proxyUrl}`);
      console.log(`🌐 M3U8 Proxy URL: ${this.config.proxyUrl}/m3u8-proxy`);
      console.log(`🌐 General Proxy URL: ${this.config.proxyUrl}`);
    }
  }

  public getAvailableProviders() {
    const sources = this.providers.listSources();
    const embeds = this.providers.listEmbeds();

    return {
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
    };
  }

  private convertToScrapeMedia(media: MediaInfo): ScrapeMedia {
    if (media.type === 'movie') {
      return {
        type: 'movie',
        title: media.title,
        releaseYear: media.releaseYear,
        tmdbId: media.tmdbId,
        imdbId: media.imdbId,
      } as MovieMedia;
    } else {
      if (!media.season || !media.episode) {
        throw new Error('Season and episode are required for TV shows');
      }
      return {
        type: 'show',
        title: media.title,
        releaseYear: media.releaseYear,
        tmdbId: media.tmdbId,
        imdbId: media.imdbId,
        season: media.season,
        episode: media.episode,
      } as ShowMedia;
    }
  }

  public async scrapeMovie(
    media: MediaInfo,
    requestedProviders?: string[],
    timeout: number = 30000
  ): Promise<StreamResult[]> {
    console.log(`🎬 Scraping movie: ${media.title} (${media.releaseYear})`);

    // Get available providers for movies
    let availableProviders = this.providers.listSources()
      .filter(p => !p.mediaTypes || p.mediaTypes.includes('movie'))
      .sort((a, b) => b.rank - a.rank);

    // Filter by requested providers if specified
    if (requestedProviders && requestedProviders.length > 0) {
      availableProviders = availableProviders.filter(p => requestedProviders.includes(p.id));
    }

    console.log(`🔍 Using ${availableProviders.length} providers`);

    const streams: StreamResult[] = [];

    // Try providers in order of rank (highest first)
    for (const provider of availableProviders.slice(0, 5)) {
      try {
        console.log(`🚀 Trying provider: ${provider.name}`);
        console.log(`🔧 Using proxy: ${this.config.proxyUrl ? 'Yes' : 'No'}`);

        const scrapeMedia = this.convertToScrapeMedia(media);

        console.log(`🔧 Fetcher type: ${this.config.proxyUrl ? 'Proxied' : 'Direct'}`);

        const scrapePromise = this.providers.runSourceScraper({
          id: provider.id,
          media: scrapeMedia,
        });

        const result = await Promise.race([
          scrapePromise,
          new Promise<SourcererOutput>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]) as SourcererOutput;

        if (result.stream && result.stream.length > 0) {
          const stream = result.stream[0];

          // Handle different stream types
          let streamUrl: string;
          if (stream.type === 'hls') {
            streamUrl = (stream as HlsBasedStream).playlist;
          } else if (stream.type === 'file') {
            // Get the best quality from file-based stream
            const fileStream = stream as FileBasedStream;
            const qualities = fileStream.qualities;
            const bestQuality = qualities['1080'] || qualities['720'] || qualities['480'] || qualities['360'];
            streamUrl = bestQuality?.url || '';
          } else {
            console.warn(`Unknown stream type: ${(stream as any).type}`);
            continue;
          }

          if (!streamUrl) {
            console.warn('No valid stream URL found');
            continue;
          }

          streams.push({
            providerId: provider.id,
            providerName: provider.name,
            stream: {
              playlist: streamUrl,
              type: stream.type,
              headers: stream.headers,
              captions: stream.captions,
            },
            scrapedAt: new Date().toISOString(),
          });

          console.log(`✅ Successfully scraped from ${provider.name}`);
          console.log(`🔗 Stream URL: ${streamUrl}`);

          // Stop after finding first working stream
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`❌ Provider ${provider.name} failed: ${errorMessage}`);
      }
    }

    if (streams.length === 0) {
      console.warn('⚠️ No streams found for this movie');
    }

    return streams;
  }

  public async scrapeTvShow(
    media: MediaInfo,
    requestedProviders?: string[],
    timeout: number = 30000
  ): Promise<StreamResult[]> {
    console.log(`📺 Scraping TV show: ${media.title} S${media.season?.number}E${media.episode?.number}`);

    // Get available providers for TV shows
    let availableProviders = this.providers.listSources()
      .filter(p => !p.mediaTypes || p.mediaTypes.includes('show'))
      .sort((a, b) => b.rank - a.rank);

    // Filter by requested providers if specified
    if (requestedProviders && requestedProviders.length > 0) {
      availableProviders = availableProviders.filter(p => requestedProviders.includes(p.id));
    }

    console.log(`🔍 Using ${availableProviders.length} providers`);

    const streams: StreamResult[] = [];

    // Try providers in order of rank (highest first)
    for (const provider of availableProviders.slice(0, 5)) {
      try {
        console.log(`🚀 Trying provider: ${provider.name}`);

        const scrapeMedia = this.convertToScrapeMedia(media);

        const result = await Promise.race([
          this.providers.runSourceScraper({
            media: scrapeMedia,
            id: provider.id,
            disableOpensubtitles: true,
          }),
          new Promise<SourcererOutput>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]) as SourcererOutput;

        if (result.stream && result.stream.length > 0) {
          const stream = result.stream[0];

          // Handle different stream types
          let streamUrl: string;
          if (stream.type === 'hls') {
            streamUrl = (stream as HlsBasedStream).playlist;
          } else if (stream.type === 'file') {
            // Get the best quality from file-based stream
            const fileStream = stream as FileBasedStream;
            const qualities = fileStream.qualities;
            const bestQuality = qualities['1080'] || qualities['720'] || qualities['480'] || qualities['360'];
            streamUrl = bestQuality?.url || '';
          } else {
            console.warn(`Unknown stream type: ${(stream as any).type}`);
            continue;
          }

          if (!streamUrl) {
            console.warn('No valid stream URL found');
            continue;
          }

          streams.push({
            providerId: provider.id,
            providerName: provider.name,
            stream: {
              playlist: streamUrl,
              type: stream.type,
              headers: stream.headers,
              captions: stream.captions,
            },
            scrapedAt: new Date().toISOString(),
          });

          console.log(`✅ Successfully scraped from ${provider.name}`);
          console.log(`🔗 Stream URL: ${streamUrl}`);

          // Stop after finding first working stream
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`❌ Provider ${provider.name} failed: ${errorMessage}`);
      }
    }

    if (streams.length === 0) {
      console.warn('⚠️ No streams found for this TV show episode');
    }

    return streams;
  }
}
