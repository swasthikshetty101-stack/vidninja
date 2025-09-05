export class TMDBService {
    constructor(config) {
        this.config = config;
    }
    async getMovieDetails(tmdbId) {
        const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
        if (this.config.tmdbApiKey.startsWith('ey')) {
            // JWT token - don't add to URL params
        }
        else {
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
        console.log(`📡 Fetching TMDB movie details for ID: ${tmdbId}`);
        try {
            const response = await fetch(url.toString(), {
                headers,
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
        }
        catch (error) {
            console.error('❌ TMDB fetch error:', error);
            throw new Error(`Failed to fetch movie details from TMDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getShowDetails(tmdbId, seasonNumber, episodeNumber) {
        console.log(`📡 Fetching TMDB show details for ID: ${tmdbId} S${seasonNumber}E${episodeNumber}`);
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        if (this.config.tmdbApiKey.startsWith('ey')) {
            headers['Authorization'] = `Bearer ${this.config.tmdbApiKey}`;
        }
        // Build URLs
        const seriesUrl = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
        const seasonUrl = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`);
        const episodeUrl = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`);
        if (!this.config.tmdbApiKey.startsWith('ey')) {
            seriesUrl.searchParams.append('api_key', this.config.tmdbApiKey);
            seasonUrl.searchParams.append('api_key', this.config.tmdbApiKey);
            episodeUrl.searchParams.append('api_key', this.config.tmdbApiKey);
        }
        seriesUrl.searchParams.append('append_to_response', 'external_ids');
        try {
            const [seriesResponse, seasonResponse, episodeResponse] = await Promise.all([
                fetch(seriesUrl.toString(), { headers }),
                fetch(seasonUrl.toString(), { headers }),
                fetch(episodeUrl.toString(), { headers }),
            ]);
            if (!seriesResponse.ok) {
                throw new Error(`Series fetch failed: ${seriesResponse.status}`);
            }
            if (!seasonResponse.ok) {
                throw new Error(`Season fetch failed: ${seasonResponse.status}`);
            }
            if (!episodeResponse.ok) {
                throw new Error(`Episode fetch failed: ${episodeResponse.status}`);
            }
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
                    number: seasonNumber,
                    tmdbId: season.id.toString(),
                },
                episode: {
                    number: episodeNumber,
                    tmdbId: episode.id.toString(),
                },
            };
        }
        catch (error) {
            console.error('❌ TMDB show fetch error:', error);
            throw new Error(`Failed to fetch show details from TMDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async searchContent(query, type = 'multi', page = 1) {
        console.log(`🔍 Searching TMDB: "${query}" (type: ${type})`);
        const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
        if (!this.config.tmdbApiKey.startsWith('ey')) {
            url.searchParams.append('api_key', this.config.tmdbApiKey);
        }
        url.searchParams.append('query', query);
        url.searchParams.append('page', page.toString());
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        if (this.config.tmdbApiKey.startsWith('ey')) {
            headers['Authorization'] = `Bearer ${this.config.tmdbApiKey}`;
        }
        try {
            const response = await fetch(url.toString(), { headers });
            if (!response.ok) {
                throw new Error(`TMDB search failed: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('❌ TMDB search error:', error);
            throw new Error(`TMDB search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
