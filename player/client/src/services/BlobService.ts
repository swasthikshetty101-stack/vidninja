/**
 * Blob Service for creating and managing blob URLs to hide video sources
 * This service creates blob URLs that completely hide the actual stream sources
 */

interface BlobCache {
    [key: string]: {
        blob: Blob;
        url: string;
        timestamp: number;
        type: string;
    };
}

class BlobServiceClass {
    private cache: BlobCache = {};
    private readonly CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startCleanupInterval();
    }

    /**
     * Start periodic cleanup of expired blob URLs
     */
    private startCleanupInterval() {
        if (this.cleanupInterval) return;

        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredBlobs();
        }, 2 * 60 * 1000); // Cleanup every 2 minutes
    }

    /**
     * Clean up expired blob URLs to prevent memory leaks
     */
    private cleanupExpiredBlobs() {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of Object.entries(this.cache)) {
            if (now - entry.timestamp > this.CACHE_EXPIRY) {
                URL.revokeObjectURL(entry.url);
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => delete this.cache[key]);

        if (expiredKeys.length > 0) {
            console.log(`🧹 Cleaned up ${expiredKeys.length} expired blob URLs`);
        }
    }

    /**
     * Create a blob URL from a payload URL
     * This completely hides the source by downloading content and creating a blob
     */
    async createBlobFromPayload(payloadUrl: string): Promise<string> {
        try {
            // Check if we already have this blob cached
            const cacheKey = this.generateCacheKey(payloadUrl);
            const cached = this.cache[cacheKey];

            if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY) {
                console.log('🎯 Using cached blob URL');
                return cached.url;
            }

            console.log('📦 Creating blob URL from payload...');

            // Fetch the content through our secure payload system
            const response = await fetch(payloadUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch content for blob: ${response.status}`);
            }

            // Get content type from response headers
            const contentType = response.headers.get('content-type') || 'video/mp4';

            // Create blob from response data
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: contentType });

            // Create blob URL
            const blobUrl = URL.createObjectURL(blob);

            // Cache the blob
            this.cache[cacheKey] = {
                blob,
                url: blobUrl,
                timestamp: Date.now(),
                type: contentType
            };

            console.log('✅ Blob URL created successfully');
            console.log('🔒 Original source completely hidden');

            return blobUrl;

        } catch (error) {
            console.error('❌ Failed to create blob URL:', error);
            // Fallback to original payload URL if blob creation fails
            return payloadUrl;
        }
    }

    /**
     * Create blob URL for HLS playlist content
     * For HLS, we need to modify the playlist to use blob URLs for segments
     */
    async createHlsBlobPlaylist(payloadUrl: string): Promise<string> {
        try {
            console.log('🎬 Creating HLS blob playlist...');

            // Fetch the m3u8 playlist content
            const response = await fetch(payloadUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.apple.mpegurl,*/*',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch HLS playlist: ${response.status}`);
            }

            let playlistContent = await response.text();

            // For now, return the original playlist content as blob
            // In the future, we could process segment URLs to create blob URLs for each segment
            const blob = new Blob([playlistContent], { type: 'application/vnd.apple.mpegurl' });
            const blobUrl = URL.createObjectURL(blob);

            console.log('✅ HLS blob playlist created');
            return blobUrl;

        } catch (error) {
            console.error('❌ Failed to create HLS blob playlist:', error);
            return payloadUrl;
        }
    }

    /**
     * Generate cache key from payload URL
     */
    private generateCacheKey(payloadUrl: string): string {
        // Extract payload from URL and use it as cache key
        const url = new URL(payloadUrl);
        const payload = url.searchParams.get('payload') || payloadUrl;
        return btoa(payload).slice(0, 32); // Use first 32 chars of base64 as key
    }

    /**
     * Revoke a specific blob URL
     */
    revokeBlobUrl(blobUrl: string) {
        try {
            URL.revokeObjectURL(blobUrl);

            // Remove from cache
            for (const [key, entry] of Object.entries(this.cache)) {
                if (entry.url === blobUrl) {
                    delete this.cache[key];
                    break;
                }
            }

            console.log('🗑️ Blob URL revoked successfully');
        } catch (error) {
            console.warn('⚠️ Failed to revoke blob URL:', error);
        }
    }

    /**
     * Clear all cached blobs
     */
    clearAllBlobs() {
        for (const entry of Object.values(this.cache)) {
            URL.revokeObjectURL(entry.url);
        }
        this.cache = {};
        console.log('🧹 All blob URLs cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const entries = Object.values(this.cache);
        const totalSize = entries.reduce((sum, entry) => sum + entry.blob.size, 0);

        return {
            count: entries.length,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            oldestTimestamp: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null
        };
    }

    /**
     * Destroy the service and clean up all resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clearAllBlobs();
    }
}

// Export singleton instance
export const BlobService = new BlobServiceClass();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        BlobService.destroy();
    });
}
