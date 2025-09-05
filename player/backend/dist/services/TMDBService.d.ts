import { Config } from '../config';
import { MediaInfo } from './ProviderService';
export interface TMDBSearchResult {
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    overview: string;
    poster_path?: string;
    backdrop_path?: string;
    media_type?: 'movie' | 'tv';
    vote_average: number;
}
export declare class TMDBService {
    private config;
    constructor(config: Config);
    getMovieDetails(tmdbId: string): Promise<MediaInfo>;
    getShowDetails(tmdbId: string, seasonNumber: number, episodeNumber: number): Promise<MediaInfo>;
    searchContent(query: string, type?: 'movie' | 'tv' | 'multi', page?: number): Promise<{
        results: TMDBSearchResult[];
        total_pages: number;
        total_results: number;
    }>;
}
