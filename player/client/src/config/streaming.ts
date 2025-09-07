/**
 * Streaming Configuration
 * 
 * Choose between different streaming modes based on your needs:
 * 
 * 1. DIRECT: Stream directly from source (faster, no timeouts, but source visible in dev tools)
 * 2. PROXY: Stream through backend proxy (slower, potential timeouts, but source hidden)
 * 3. HYBRID: Try direct first, fallback to proxy if needed
 */

export type StreamingMode = 'DIRECT' | 'PROXY' | 'HYBRID';

export interface StreamingConfig {
    mode: StreamingMode;
    timeoutMs: number;
    maxRetries: number;
    enableCORS: boolean;
    preferDirectForHLS: boolean;
    preferDirectForMP4: boolean;
}

export const defaultStreamingConfig: StreamingConfig = {
    // Use PROXY mode for reliable streaming through backend
    // Backend handles all video source management and chunked streaming
    mode: 'PROXY',

    // Timeout for proxy mode (increased for better reliability)
    timeoutMs: 180000, // 3 minutes

    // Max retries for failed requests
    maxRetries: 3,

    // Enable CORS headers for direct streaming
    enableCORS: true,

    // Prefer proxy streaming for HLS (better reliability)
    preferDirectForHLS: false,

    // Prefer proxy streaming for MP4 (better reliability)  
    preferDirectForMP4: false,
};/**
 * Get streaming configuration
 * You can modify this to load from environment variables or user preferences
 */
export const getStreamingConfig = (): StreamingConfig => {
    // For browser environment, check for Vite environment variables
    // Vite exposes env vars that start with VITE_ to the browser
    const envMode = (typeof window !== 'undefined' &&
        (window as any).VITE_STREAMING_MODE) as StreamingMode;

    // Or use a simple browser-compatible approach
    // You can also store this in localStorage for user preferences
    const storedMode = typeof localStorage !== 'undefined' ?
        localStorage.getItem('streamingMode') as StreamingMode : null;

    return {
        ...defaultStreamingConfig,
        mode: storedMode || envMode || defaultStreamingConfig.mode,
    };
};

/**
 * Set streaming mode (stores in localStorage for persistence)
 * Use this to switch between modes during development/testing
 */
export const setStreamingMode = (mode: StreamingMode): void => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('streamingMode', mode);
        console.log(`🔧 Streaming mode set to: ${mode}`);
    }
};

/**
 * Helper functions for quick mode switching during development
 */
export const useDirect = () => setStreamingMode('DIRECT');
export const useProxy = () => setStreamingMode('PROXY');
export const useHybrid = () => setStreamingMode('HYBRID');

/**
 * Streaming mode recommendations:
 * 
 * For Development:
 * - Use DIRECT mode for faster development and testing
 * - No backend timeout issues
 * - Source URLs visible in browser dev tools
 * 
 * For Production (Security First):
 * - Use PROXY mode if you need complete source hiding
 * - Consider deploying backend to cloud (Railway, Render, Vercel) to eliminate timeout issues
 * - Backend will need more resources and better network connectivity
 * 
 * For Production (Performance First):
 * - Use DIRECT mode for best user experience
 * - Faster loading, no buffering interruptions
 * - Consider this acceptable for most use cases
 * 
 * For Production (Balanced):
 * - Use HYBRID mode
 * - Try direct streaming first, fallback to proxy if needed
 * - Best of both worlds
 * 
 * Console Commands for Testing:
 * - To use direct streaming: localStorage.setItem('streamingMode', 'DIRECT')
 * - To use proxy streaming: localStorage.setItem('streamingMode', 'PROXY')
 * - To use hybrid streaming: localStorage.setItem('streamingMode', 'HYBRID')
 * - Then refresh the page to apply changes
 */
