import { MovieResponse, TvResponse, Provider, TMDBSearchResult } from '../types';

class ApiService {
  private baseUrl: string;
  private proxyUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    this.proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3000';
  }

  async fetchMovie(tmdbId: string, providers?: string[]): Promise<MovieResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/movie/${tmdbId}`);

    if (providers && providers.length > 0) {
      url.searchParams.set('providers', providers.join(','));
    }

    console.log('🌐 API Service: Making request to:', url.toString());

    const response = await fetch(url.toString());

    console.log('📡 API Service: Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to fetch movie: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 API Service: Response data:', data);

    return data;
  }

  async fetchTvShow(tmdbId: string, season: number, episode: number, providers?: string[]): Promise<TvResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/tv/${tmdbId}/${season}/${episode}`);

    if (providers && providers.length > 0) {
      url.searchParams.set('providers', providers.join(','));
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch TV show: ${response.statusText}`);
    }

    return response.json();
  }

  async getProviders(): Promise<{ sources: Provider[]; embeds: Provider[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/providers`);

    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async searchTMDB(query: string, type: 'movie' | 'tv' | 'multi' = 'multi'): Promise<TMDBSearchResult[]> {
    const url = new URL(`${this.baseUrl}/api/v1/tmdb/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('type', type);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to search TMDB: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.results || [];
  }

  getProxiedUrl(originalUrl: string, headers?: Record<string, string>): string {
    if (originalUrl.includes('.m3u8')) {
      // Use simple-proxy for HLS streams
      const url = new URL(`${this.proxyUrl}/m3u8-proxy`);
      url.searchParams.set('url', originalUrl);

      if (headers) {
        url.searchParams.set('headers', JSON.stringify(headers));
      }

      return url.toString();
    } else {
      // Use regular proxy for other content
      const url = new URL(`${this.baseUrl}/proxy`);
      url.searchParams.set('url', originalUrl);

      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          url.searchParams.set(`h_${key.replace(/-/g, '_')}`, value);
        });
      }

      return url.toString();
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
