import { Request, Response } from 'express';
/**
 * Decode payload endpoint - converts payload URLs back to direct stream URLs
 * This is used by the video player to get the actual stream URL from the encoded payload
 */
export declare const decodePayload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Stream proxy endpoint - serves the actual video stream through our backend
 * This allows Video.js to access the stream directly while hiding the source
 */
export declare const streamProxy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
