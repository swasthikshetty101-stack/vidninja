import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from './config/index';
import { ProviderService } from './services/ProviderService';
import { TMDBService } from './services/TMDBService';
import { createProviderRoutes } from './routes/providers';
// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class PlayerServer {
    constructor() {
        this.config = getConfig();
        this.app = express();
        // Initialize services
        this.providerService = new ProviderService(this.config);
        this.tmdbService = new TMDBService(this.config);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // CORS
        if (this.config.enableCors) {
            this.app.use(cors({
                origin: true,
                credentials: true,
            }));
        }
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
        // Serve static files (React app)
        const clientPath = path.join(__dirname, '../../client');
        this.app.use('/app', express.static(clientPath));
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                config: {
                    port: this.config.port,
                    proxyEnabled: !!this.config.proxyUrl,
                    proxyUrl: this.config.proxyUrl,
                    environment: this.config.nodeEnv,
                },
                providers: this.providerService.getAvailableProviders(),
            });
        });
        // Serve static files from client build
        this.app.use('/app', express.static(path.join(__dirname, '../../client/dist')));
        // API routes
        this.app.use('/api/v1', createProviderRoutes(this.providerService, this.tmdbService));
        // React app fallback - serve index.html for any /app routes not matched by static files
        this.app.get(/^\/app/, (req, res) => {
            res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
        });
        // Root redirect
        this.app.get('/', (req, res) => {
            res.redirect('/app');
        });
        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('❌ Unhandled error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: this.config.nodeEnv === 'development' ? err.message : 'Something went wrong',
            });
        });
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
            });
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            const server = this.app.listen(this.config.port, () => {
                console.log('🚀 ProviderV Player Server started');
                console.log(`📋 Port: ${this.config.port}`);
                console.log(`⚛️  React app: http://localhost:${this.config.port}/app`);
                console.log(`🔌 API: http://localhost:${this.config.port}/api/v1`);
                console.log(`📊 Health: http://localhost:${this.config.port}/health`);
                resolve();
            });
            server.on('error', reject);
            // Graceful shutdown
            const shutdown = () => {
                console.log('🔄 Shutting down gracefully...');
                server.close(() => {
                    console.log('✅ Server closed');
                    process.exit(0);
                });
            };
            process.on('SIGTERM', shutdown);
            process.on('SIGINT', shutdown);
        });
    }
}
// Start server if this file is run directly
// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new PlayerServer();
    server.start().catch((error) => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}
