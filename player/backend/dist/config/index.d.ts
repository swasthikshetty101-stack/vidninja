export interface Config {
    port: number;
    tmdbApiKey: string;
    proxyUrl?: string;
    enableCors: boolean;
    nodeEnv: string;
}
export declare function getConfig(): Config;
