export interface MediaItem {
    type: 'movie' | 'show';
    title: string;
    releaseYear: number;
    tmdbId: string;
    imdbId?: string;
    season?: {
        number: number;
        tmdbId: string;
    };
    episode?: {
        number: number;
        tmdbId: string;
    };
}

export interface Stream {
    providerId: string;
    providerName: string;
    stream: {
        type: string;
        playlist: string;
        headers?: Record<string, string>;
        captions?: Caption[];
    };
    scrapedAt: string;
}

export interface Caption {
    id: string;
    language: string;
    url: string;
    type: 'srt' | 'vtt' | 'ass';
}

export interface Provider {
    id: string;
    name: string;
    rank: number;
    type: string;
    mediaTypes?: string[];
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface MovieResponse {
    success: boolean;
    media: MediaItem;
    streams: Stream[];
    providersAvailable: Provider[];
}

export interface TvResponse {
    success: boolean;
    media: MediaItem;
    streams: Stream[];
    providersAvailable: Provider[];
}

export interface TMDBSearchResult {
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    overview: string;
    poster_path?: string;
    media_type?: string;
}

export interface PlayerState {
    isLoading: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    quality?: string;
    error?: string;
}

export interface PlayerProps {
    src?: string;
    headers?: Record<string, string>;
    onStateChange?: (state: Partial<PlayerState>) => void;
    className?: string;
}
