import {
  getProxyHeaders,
  getAfterResponseHeaders,
  getBlacklistedHeaders,
} from '@/utils/headers';
import {
  createTokenIfNeeded,
  isAllowedToMakeRequest,
  setTokenHeader,
} from '@/utils/turnstile';
import { tmdbBypassFetch } from '@/utils/cloudflare-fetch';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export default defineEventHandler(async (event) => {
  // Handle preflight CORS requests
  if (isPreflightRequest(event)) {
    handleCors(event, {});
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }

  // Only allow GET requests for TMDB
  if (event.node.req.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed - Only GET requests allowed',
    });
  }

  // Parse the URL to extract the TMDB path
  const url = new URL(event.node.req.url!, `http://${event.node.req.headers.host}`);
  const fullPath = url.pathname;

  // Extract the TMDB path after /tmdb-proxy/
  const tmdbPathMatch = fullPath.match(/^\/tmdb-proxy\/(.*)$/);
  const tmdbPath = tmdbPathMatch ? tmdbPathMatch[1] : '';

  if (!tmdbPath) {
    return await sendJson({
      event,
      status: 400,
      data: {
        error: 'Missing TMDB path parameter',
        usage: 'Use /tmdb-proxy/{tmdb-endpoint} where tmdb-endpoint is the TMDB API path',
        examples: [
          '/tmdb-proxy/movie/550',
          '/tmdb-proxy/search/movie?query=fight%20club',
          '/tmdb-proxy/tv/1399/season/1/episode/1',
          '/tmdb-proxy/w500/poster.jpg (for images)',
        ],
      },
    });
  }

  // Check if allowed to make the request
  if (!(await isAllowedToMakeRequest(event))) {
    return await sendJson({
      event,
      status: 401,
      data: {
        error: 'Invalid or missing token',
      },
    });
  }

  // Get TMDB API key from environment
  const tmdbApiKey = useRuntimeConfig(event).tmdbApiKey || process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return await sendJson({
      event,
      status: 500,
      data: {
        error: 'TMDB API key not configured',
        message: 'The proxy server is missing TMDB_API_KEY environment variable',
      },
    });
  }

  // Parse query parameters from the original URL
  const urlParams = new URLSearchParams(url.search);

  // Determine if this is an image request or API request
  let finalPath: string;
  if (tmdbPath.startsWith('w') || tmdbPath.startsWith('original') || tmdbPath.match(/^w\d+/)) {
    // Image request - use image base URL and no API key needed
    const imageUrl = `${TMDB_IMAGE_BASE_URL}/${tmdbPath}${url.search}`;

    try {
      console.log(`🖼️ TMDB Image: ${tmdbPath}`);

      // Use Cloudflare bypass for image requests too
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://localhost:3000/',
        },
      });

      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }

      // Forward the image response
      const imageData = await response.arrayBuffer();

      setResponseHeaders(event, {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400', // Cache images for 24 hours
      });

      return new Uint8Array(imageData);

    } catch (error) {
      console.error('🚫 TMDB Image Error:', error);

      return await sendJson({
        event,
        status: 502,
        data: {
          error: 'Failed to fetch TMDB image',
          message: error instanceof Error ? error.message : 'Unknown error',
          imagePath: tmdbPath,
        },
      });
    }
  } else {
    // API request - inject API key if not present
    if (!urlParams.has('api_key')) {
      urlParams.set('api_key', tmdbApiKey);
    }
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
    finalPath = `${tmdbPath}${queryString}`;
  }

  // Create token if needed
  const token = await createTokenIfNeeded(event);

  try {
    console.log(`🎬 TMDB Cloudflare Bypass: Fetching ${tmdbPath}`);

    // Use Cloudflare bypass fetch for API requests
    const response = await tmdbBypassFetch(finalPath, tmdbApiKey, {
      bypassISP: true,
      maxRetries: 3,
      timeout: 25000,
    });

    // Set response headers
    const responseHeaders = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      'X-TMDB-Proxy': 'cloudflare-bypass',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    setResponseHeaders(event, responseHeaders);
    if (token) setTokenHeader(event, token);

    // Return the response data
    const responseData = await response.text();

    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(responseData);
      return jsonData;
    } catch {
      return responseData;
    }

  } catch (error) {
    console.error('🚫 TMDB Cloudflare Bypass Error:', error);

    // Enhanced error handling for ISP blocks
    let statusCode = 500;
    let errorMessage = 'Cloudflare bypass failed to fetch from TMDB';

    if (error && typeof error === 'object') {
      if ('name' in error && error.name === 'ISPBlockError') {
        statusCode = 502;
        errorMessage = 'ISP is blocking TMDB access even through Cloudflare bypass';
      } else if ('name' in error && error.name === 'AbortError') {
        statusCode = 504;
        errorMessage = 'TMDB request timeout through Cloudflare bypass';
      } else if ('message' in error && typeof error.message === 'string') {
        if (error.message.includes('timeout')) {
          statusCode = 504;
          errorMessage = 'Connection timeout through Cloudflare bypass';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          statusCode = 502;
          errorMessage = 'Network error through Cloudflare bypass';
        }
      }
    }

    // Return a more user-friendly error
    return await sendJson({
      event,
      status: statusCode,
      data: {
        error: errorMessage,
        message: statusCode === 504
          ? 'Cloudflare bypass timeout - TMDB servers are taking too long to respond'
          : statusCode === 502
            ? 'Cloudflare bypass network error - ISP may be blocking all routes to TMDB'
            : 'Cloudflare bypass failed - try again or contact support',
        requestedPath: tmdbPath,
        timestamp: new Date().toISOString(),
        suggestion: statusCode === 502 ? 'Try connecting through a VPN service' : 'Retry the request',
        bypassMethod: 'cloudflare-workers',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
    });
  }
});
