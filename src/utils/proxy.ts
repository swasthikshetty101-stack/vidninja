import { flags } from '@/entrypoint/utils/targets';
import { Stream } from '@/providers/streams';

// Default proxy URL for general purpose proxying
let DEFAULT_PROXY_URL = 'https://proxy.nsbx.ru/proxy';
// Default M3U8 proxy URL for HLS stream proxying
let CONFIGURED_M3U8_PROXY_URL = 'https://proxy2.pstream.mov';

/**
 * Set a custom proxy URL for general purpose proxying
 * @param proxyUrl - The base URL of the general proxy
 */
export function setProxyUrl(proxyUrl: string): void {
  DEFAULT_PROXY_URL = proxyUrl;
}

/**
 * Set a custom M3U8 proxy URL to use for all M3U8 proxy requests
 * @param proxyUrl - The base URL of the M3U8 proxy
 */
export function setM3U8ProxyUrl(proxyUrl: string): void {
  CONFIGURED_M3U8_PROXY_URL = proxyUrl;
}

/**
 * Get the currently configured M3U8 proxy URL
 * @returns The configured M3U8 proxy URL
 */
export function getM3U8ProxyUrl(): string {
  return CONFIGURED_M3U8_PROXY_URL;
}

export function requiresProxy(stream: Stream): boolean {
  if (!stream.flags.includes(flags.CORS_ALLOWED) || !!(stream.headers && Object.keys(stream.headers).length > 0))
    return true;
  return false;
}

export function setupProxy(stream: Stream): Stream {
  const headers = stream.headers && Object.keys(stream.headers).length > 0 ? stream.headers : undefined;

  if (stream.type === 'hls') {
    // Use M3U8 proxy format for HLS streams
    const encodedUrl = encodeURIComponent(stream.playlist);
    const encodedHeaders = headers ? encodeURIComponent(JSON.stringify(headers)) : '';
    stream.playlist = `${CONFIGURED_M3U8_PROXY_URL}?url=${encodedUrl}${encodedHeaders ? `&headers=${encodedHeaders}` : ''}`;
  }

  if (stream.type === 'file') {
    // For file streams, use the payload format (for TS segments, etc.)
    const payload = {
      type: 'mp4' as const,
      headers,
      options: {},
    };

    Object.entries(stream.qualities).forEach((entry) => {
      const filePayload = { ...payload, url: entry[1].url };
      entry[1].url = `${DEFAULT_PROXY_URL}?${new URLSearchParams({ payload: Buffer.from(JSON.stringify(filePayload)).toString('base64url') })}`;
    });
  }

  stream.headers = {};
  stream.flags = [flags.CORS_ALLOWED];
  return stream;
}

/**
 * Creates a proxied M3U8 URL using the configured M3U8 proxy
 * @param url - The original M3U8 URL to proxy
 * @param headers - Headers to include with the request
 * @returns The proxied M3U8 URL
 */
export function createM3U8ProxyUrl(url: string, headers: Record<string, string> = {}): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedHeaders = encodeURIComponent(JSON.stringify(headers));
  return `${CONFIGURED_M3U8_PROXY_URL}/m3u8-proxy?url=${encodedUrl}${headers ? `&headers=${encodedHeaders}` : ''}`;
}

/**
 * Updates an existing M3U8 proxy URL to use the currently configured proxy
 * @param url - The M3U8 proxy URL to update
 * @returns The updated M3U8 proxy URL
 */
export function updateM3U8ProxyUrl(url: string): string {
  if (url.includes('/m3u8-proxy?url=')) {
    return url.replace(/https:\/\/[^/]+\/m3u8-proxy/, `${CONFIGURED_M3U8_PROXY_URL}/m3u8-proxy`);
  }
  return url;
}
