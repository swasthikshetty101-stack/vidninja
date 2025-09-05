import { Router } from 'express';
import { ProviderService } from '../services/ProviderService';
import { TMDBService } from '../services/TMDBService';
export declare function createProviderRoutes(providerService: ProviderService, tmdbService: TMDBService): Router;
