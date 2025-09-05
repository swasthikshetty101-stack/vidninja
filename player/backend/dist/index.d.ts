export declare class PlayerServer {
    private app;
    private config;
    private providerService;
    private tmdbService;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
}
