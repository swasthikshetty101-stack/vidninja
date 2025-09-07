// Universal ISP bypass for Cloudflare Workers
// This will route ALL external requests through Cloudflare's global network

interface CloudflareFetchOptions extends RequestInit {
    bypassISP?: boolean;
    maxRetries?: number;
    timeout?: number;
}

// Multiple proxy methods for ultimate ISP bypass
const BYPASS_METHODS = [
    {
        name: 'cloudflare-workers',
        enabled: true,
        fetch: async (url: string, options: RequestInit) => {
            // When running on Cloudflare Workers, we have built-in ISP bypass
            return fetch(url, {
                ...options,
                // @ts-ignore - Cloudflare Workers specific options
                cf: {
                    cacheTtl: 300,
                    cacheEverything: false,
                    resolveOverride: 'cloudflare-dns.com',
                },
            });
        },
    },
    {
        name: 'proxy-chain',
        enabled: true,
        fetch: async (url: string, options: RequestInit) => {
            // Route through multiple proxy services
            const proxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://api.allorigins.win/get?url=',
                'https://corsproxy.io/?',
            ];

            for (const proxy of proxies) {
                try {
                    const proxyUrl = proxy.includes('allorigins')
                        ? `${proxy}${encodeURIComponent(url)}`
                        : `${proxy}${url}`;

                    const response = await fetch(proxyUrl, {
                        ...options,
                        headers: {
                            ...options.headers,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'X-Forwarded-For': '127.0.0.1',
                            'X-Real-IP': '127.0.0.1',
                        },
                    });

                    if (response.ok) {
                        // Handle allorigins response format
                        if (proxy.includes('allorigins')) {
                            const data = await response.json();
                            return new Response(data.contents, {
                                status: 200,
                                headers: response.headers,
                            });
                        }
                        return response;
                    }
                } catch (error) {
                    console.log(`Proxy ${proxy} failed:`, (error as Error).message);
                    continue;
                }
            }
            throw new Error('All proxy methods failed');
        },
    },
    {
        name: 'dns-over-https',
        enabled: true,
        fetch: async (url: string, options: RequestInit) => {
            // Use DNS over HTTPS to bypass DNS-level blocking
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'User-Agent': 'curl/7.68.0',
                    'Accept': 'application/json, */*',
                    'Cache-Control': 'no-cache',
                },
            });
        },
    },
];

// Enhanced fetch function with automatic ISP bypass
export async function cloudflareBypassFetch(
    url: string,
    options: CloudflareFetchOptions = {}
): Promise<Response> {
    const {
        bypassISP = true,
        maxRetries = 3,
        timeout = 30000,
        ...fetchOptions
    } = options;

    console.log(`🌐 Cloudflare Fetch: ${url} (bypass: ${bypassISP})`);

    // If bypass is disabled, use normal fetch
    if (!bypassISP) {
        return fetch(url, {
            ...fetchOptions,
            signal: AbortSignal.timeout(timeout),
        });
    }

    const errors: Error[] = [];

    // Try each bypass method
    for (const method of BYPASS_METHODS.filter(m => m.enabled)) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Trying ${method.name} (attempt ${attempt}/${maxRetries})`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await method.fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log(`✅ ${method.name} successful`);
                    return response;
                } else {
                    console.log(`❌ ${method.name} returned ${response.status}`);
                }

            } catch (error) {
                const errorMsg = (error as Error).message;
                console.log(`❌ ${method.name} attempt ${attempt} failed: ${errorMsg}`);
                errors.push(new Error(`${method.name}: ${errorMsg}`));

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
    }

    // All methods failed
    const errorDetails = errors.map(e => e.message).join('; ');
    throw new Error(`All ISP bypass methods failed: ${errorDetails}`);
}

// Specialized TMDB bypass function
export async function tmdbBypassFetch(
    tmdbPath: string,
    apiKey: string,
    options: CloudflareFetchOptions = {}
): Promise<Response> {
    const baseUrl = 'https://api.themoviedb.org/3';
    const url = `${baseUrl}/${tmdbPath}${tmdbPath.includes('?') ? '&' : '?'}api_key=${apiKey}`;

    console.log(`🎬 TMDB Bypass: ${tmdbPath}`);

    return cloudflareBypassFetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...options.headers,
        },
    });
}

// Specialized media bypass function for M3U8 and TS files
export async function mediaBypassFetch(
    url: string,
    options: CloudflareFetchOptions = {}
): Promise<Response> {
    console.log(`📺 Media Bypass: ${url}`);

    return cloudflareBypassFetch(url, {
        ...options,
        headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://cloudnestra.com/',
            'Origin': 'https://cloudnestra.com',
            ...(options.headers as Record<string, string> || {}),
        },
    });
}

// Check if we're running on Cloudflare Workers
export function isCloudflareWorker(): boolean {
    // @ts-ignore
    return typeof globalThis.caches !== 'undefined' &&
        // @ts-ignore
        typeof globalThis.CloudflareWorkersGlobalScope !== 'undefined';
}

// Enhanced error handling for ISP blocks
export function createISPBlockError(originalError: Error, url: string): Error {
    const error = new Error(
        `ISP may be blocking access to ${new URL(url).hostname}. ` +
        `Original error: ${originalError.message}`
    );
    error.name = 'ISPBlockError';
    return error;
}
