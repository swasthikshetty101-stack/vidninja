import { setResponseHeaders, getQuery, sendError, createError, getRequestHost, getRequestProtocol, defineEventHandler, isPreflightRequest, handleCors } from 'h3';

// Check if caching is disabled via environment variable
const isCacheDisabled = () => process.env.DISABLE_CACHE === 'true';

function parseURL(req_url: string, baseUrl?: string) {
  if (baseUrl) {
    return new URL(req_url, baseUrl).href;
  }

  const match = req_url.match(/^(?:(https?:)?\/\/)?(([^\/?]+?)(?::(\d{0,5})(?=[\/?]|$))?)([\/?][\S\s]*|$)/i);

  if (!match) {
    return null;
  }

  if (!match[1]) {
    if (/^https?:/i.test(req_url)) {
      return null;
    }

    // Scheme is omitted
    if (req_url.lastIndexOf("//", 0) === -1) {
      // "//" is omitted
      req_url = "//" + req_url;
    }
    req_url = (match[4] === "443" ? "https:" : "http:") + req_url;
  }

  try {
    const parsed = new URL(req_url);
    if (!parsed.hostname) {
      // "http://:1/" and "http:/notenoughslashes" could end up here
      return null;
    }
    return parsed.href;
  } catch (error) {
    return null;
  }
}

/**
 * Short URL handler for m3u8 playlists (replaces m3u8-proxy)
 * Handles URLs like /p/{payload} for shorter, more disguised URLs
 */
async function proxyM3U8(event: any) {
  // Extract payload from the URL path
  const pathParts = event.path?.split('/') || [];
  const payloadBase64 = pathParts[pathParts.length - 1];

  if (!payloadBase64) {
    return sendError(event, createError({
      statusCode: 400,
      statusMessage: 'Invalid playlist URL format'
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

    console.log('🔓 Decoded M3U8 payload for secure streaming');
  } catch (error) {
    console.error('❌ Failed to decode M3U8 payload:', error);
    return sendError(event, createError({
      statusCode: 400,
      statusMessage: 'Invalid payload format'
    }));
  }

  try {
    const response = await globalThis.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
        ...(headers as HeadersInit),
      }
    });

    // Handle rate limiting with retry for M3U8
    if (response.status === 429) {
      console.warn(`Rate limited for M3U8 URL: ${url}, waiting and retrying...`);
      // Wait before retry (2-5 seconds for M3U8)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Retry once
      const retryResponse = await globalThis.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
          ...(headers as HeadersInit),
        }
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text().catch(() => '');
        console.error(`Failed to fetch M3U8 after retry: ${retryResponse.status} ${retryResponse.statusText} for URL: ${url}`);
        console.error(`Response body: ${errorText}`);
        throw new Error(`Failed to fetch M3U8 after retry: ${retryResponse.status} ${retryResponse.statusText}`);
      }

      const m3u8Content = await retryResponse.text();
      return processM3U8Content(m3u8Content, url, headers, event);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`Failed to fetch M3U8: ${response.status} ${response.statusText} for URL: ${url}`);
      console.error(`Response body: ${errorText}`);
      throw new Error(`Failed to fetch M3U8: ${response.status} ${response.statusText}`);
    }

    const m3u8Content = await response.text();
    return processM3U8Content(m3u8Content, url, headers, event);
  } catch (error: any) {
    console.error('Error proxying M3U8:', error);
    return sendError(event, createError({
      statusCode: 500,
      statusMessage: error.message || 'Error proxying M3U8 file'
    }));
  }
}

// Extract M3U8 processing logic into separate function for reuse
function processM3U8Content(m3u8Content: string, url: string, headers: any, event: any) {
  // Get the base URL for the host
  const host = getRequestHost(event);
  const proto = getRequestProtocol(event);
  const baseProxyUrl = `${proto}://${host}`;

  if (m3u8Content.includes("RESOLUTION=")) {
    // This is a master playlist with multiple quality variants
    const lines = m3u8Content.split("\n");
    const newLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("#")) {
        if (line.startsWith("#EXT-X-KEY:")) {
          // Proxy the key URL
          const regex = /https?:\/\/[^\""\s]+/g;
          const keyUrl = regex.exec(line)?.[0];
          if (keyUrl) {
            // Create payload for key URL to hide source
            const keyPayload = {
              type: 'key',
              url: keyUrl,
              headers: headers || {},
              timestamp: Date.now()
            };
            const keyPayloadBase64 = Buffer.from(JSON.stringify(keyPayload)).toString('base64');

            const proxyKeyUrl = `${baseProxyUrl}/s/${keyPayloadBase64}`;
            newLines.push(line.replace(keyUrl, proxyKeyUrl));
          } else {
            newLines.push(line);
          }
        } else if (line.startsWith("#EXT-X-MEDIA:")) {
          // Proxy alternative media URLs (like audio streams)
          const regex = /https?:\/\/[^\""\s]+/g;
          const mediaUrl = regex.exec(line)?.[0];
          if (mediaUrl) {
            // Create payload for media URL to hide source
            const mediaPayload = {
              type: 'm3u8',
              url: mediaUrl,
              headers: headers || {},
              timestamp: Date.now()
            };
            const mediaPayloadBase64 = Buffer.from(JSON.stringify(mediaPayload)).toString('base64');

            const proxyMediaUrl = `${baseProxyUrl}/p/${mediaPayloadBase64}`;
            newLines.push(line.replace(mediaUrl, proxyMediaUrl));
          } else {
            newLines.push(line);
          }
        } else {
          newLines.push(line);
        }
      } else if (line.trim()) {
        // This is a quality variant URL
        const variantUrl = parseURL(line, url);
        if (variantUrl) {
          // Create payload for variant URL to hide source
          const variantPayload = {
            type: 'm3u8',
            url: variantUrl,
            headers: headers || {},
            timestamp: Date.now()
          };
          const variantPayloadBase64 = Buffer.from(JSON.stringify(variantPayload)).toString('base64');

          newLines.push(`${baseProxyUrl}/p/${variantPayloadBase64}`);
        } else {
          newLines.push(line);
        }
      } else {
        // Empty line, preserve it
        newLines.push(line);
      }
    }

    // Set appropriate headers
    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    return newLines.join("\n");
  } else {
    // This is a media playlist with segments
    const lines = m3u8Content.split("\n");
    const newLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("#")) {
        if (line.startsWith("#EXT-X-KEY:")) {
          // Proxy the key URL
          const regex = /https?:\/\/[^\""\s]+/g;
          const keyUrl = regex.exec(line)?.[0];
          if (keyUrl) {
            // Create payload for key URL to hide source
            const keyPayload = {
              type: 'key',
              url: keyUrl,
              headers: headers || {},
              timestamp: Date.now()
            };
            const keyPayloadBase64 = Buffer.from(JSON.stringify(keyPayload)).toString('base64');

            const proxyKeyUrl = `${baseProxyUrl}/s/${keyPayloadBase64}`;
            newLines.push(line.replace(keyUrl, proxyKeyUrl));
          } else {
            newLines.push(line);
          }
        } else {
          newLines.push(line);
        }
      } else if (line.trim() && !line.startsWith("#")) {
        // This is a segment URL (.ts file)
        const segmentUrl = parseURL(line, url);
        if (segmentUrl) {
          // Create payload for segment URL to hide source
          const segmentPayload = {
            type: 'ts',
            url: segmentUrl,
            headers: headers || {},
            timestamp: Date.now()
          };
          const segmentPayloadBase64 = Buffer.from(JSON.stringify(segmentPayload)).toString('base64');

          newLines.push(`${baseProxyUrl}/s/${segmentPayloadBase64}`);
        } else {
          newLines.push(line);
        }
      } else {
        // Comment or empty line, preserve it
        newLines.push(line);
      }
    }

    // Set appropriate headers
    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    return newLines.join("\n");
  }
}

export default defineEventHandler(async (event) => {
  // Handle CORS preflight requests
  if (isPreflightRequest(event)) return handleCors(event, {});

  if (process.env.DISABLE_M3U8 === 'true') {
    return sendError(event, createError({
      statusCode: 404,
      statusMessage: 'M3U8 proxying is disabled'
    }));
  }

  return await proxyM3U8(event);
});
