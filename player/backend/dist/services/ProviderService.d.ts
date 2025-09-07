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
export declare class ProviderService {
    private providers;
    private config;
    private fetcher;
    private proxiedFetcher?;
    constructor(config: Config);
    /**
     * Encode a direct stream URL into payload format to hide the source
     */
    private encodeStreamToPayload;
    /**
     * Decode payload URL and extract the actual stream URL (for internal use)
     */
    private decodePayloadUrl;
    /**
     * Process stream URL to always encode as payload for security
     */
    private processStreamUrl;
    private initializeProviders;
    getAvailableProviders(): {
        sources: {
            id: string;
            name: string;
            rank: number;
            type: "embed" | "source";
            mediaTypes: import("../../../../lib/index.js").MediaTypes[] | undefined;
        }[];
        embeds: {
            id: string;
            name: string;
            rank: number;
            type: "embed" | "source";
        }[];
    };
    private convertToScrapeMedia;
    scrapeMovie(media: MediaInfo, requestedProviders?: string[], timeout?: number): Promise<StreamResult[]>;
    scrapeTvShow(media: MediaInfo, requestedProviders?: string[], timeout?: number): Promise<StreamResult[]>;
}
