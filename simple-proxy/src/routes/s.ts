import { setResponseHeaders, getQuery, sendError, createError, defineEventHandler, isPreflightRequest, handleCors } from 'h3';
import { getCachedSegment } from './m3u8-proxy';

// Check if caching is disabled via environment variable
const isCacheDisabled = () => process.env.DISABLE_CACHE === 'true';

/**
 * Short URL handler for video segments (replaces ts-proxy)
 * Handles URLs like /s/{payload} for shorter, more disguised URLs
 */
export default defineEventHandler(async (event) => {
  // Handle CORS preflight requests
  if (isPreflightRequest(event)) return handleCors(event, {});

  if (process.env.DISABLE_M3U8 === 'true') {
    return sendError(event, createError({
      statusCode: 404,
      statusMessage: 'TS proxying is disabled'
    }));
  }

  // Extract payload from the URL path
  const pathParts = event.path?.split('/') || [];
  const payloadBase64 = pathParts[pathParts.length - 1];

  if (!payloadBase64) {
    return sendError(event, createError({
      statusCode: 400,
      statusMessage: 'Invalid segment URL format'
    }));
  }

  let url: string;
  let headers: any = {};

  try {
    // Decode payload to get actual URL and headers
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
    const payloadData = JSON.parse(payloadJson);

    url = payloadData.url;
    headers = payloadData.headers || {};

    console.log('🔓 Decoded segment payload for secure streaming');
  } catch (error) {
    console.error('❌ Failed to decode segment payload:', error);
    return sendError(event, createError({
      statusCode: 400,
      statusMessage: 'Invalid payload format'
    }));
  }

  try {
    // Only check cache if caching is enabled
    if (!isCacheDisabled()) {
      const cachedSegment = getCachedSegment(url);

      if (cachedSegment) {
        setResponseHeaders(event, {
          'Content-Type': cachedSegment.headers['content-type'] || 'video/mp2t',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Credentials': 'false',
          'Cache-Control': 'public, max-age=3600' // Allow caching of TS segments
        });

        return cachedSegment.data;
      }
    }

    const response = await globalThis.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
        ...(headers as HeadersInit),
      }
    });

    // Handle rate limiting with retry
    if (response.status === 429) {
      console.warn(`Rate limited for URL: ${url}, waiting and retrying...`);
      // Wait before retry (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Retry once
      const retryResponse = await globalThis.fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
          ...(headers as HeadersInit),
        }
      });

      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch TS file after retry: ${retryResponse.status} ${retryResponse.statusText}`);
      }

      setResponseHeaders(event, {
        'Content-Type': retryResponse.headers.get('content-type') || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'false',
        'Cache-Control': 'public, max-age=3600' // Allow caching of TS segments
      });

      // Return the binary data directly
      return new Uint8Array(await retryResponse.arrayBuffer());
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch TS file: ${response.status} ${response.statusText}`);
    }

    setResponseHeaders(event, {
      'Content-Type': response.headers.get('content-type') || 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      'Cache-Control': 'public, max-age=3600' // Allow caching of TS segments
    });

    // Return the binary data directly
    return new Uint8Array(await response.arrayBuffer());
  } catch (error: any) {
    console.error('Error proxying TS file:', error);
    return sendError(event, createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.message || 'Error proxying TS file'
    }));
  }
});
