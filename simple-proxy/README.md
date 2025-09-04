# Simple Proxy for ProviderV

Advanced reverse proxy specifically designed for HLS streaming and CORS bypass, integrated with the ProviderV streaming platform.

## 🌟 Integration with ProviderV

This proxy is part of the **ProviderV** streaming platform and provides:
- **HLS Stream Proxying**: Specialized handling for .m3u8 playlists
- **CORS Bypass**: Allows browser access to restricted streaming sources
- **Segment Caching**: Improves performance by caching .ts video segments
- **Header Forwarding**: Maintains required headers like referer and origin

## ✨ Features

### Core Capabilities
- **M3U8 Playlist Rewriting**: Automatically rewrites HLS playlists to route through proxy
- **TS Segment Caching**: Intelligent caching of video segments with cleanup
- **Header Management**: Secure handling of restricted headers
- **Multi-Platform Support**: Deployable on various platforms via Nitro

### ProviderV Specific
- **Port 3000**: Runs alongside ProviderV Player (port 3001)
- **Automatic Integration**: Player automatically routes HLS streams through proxy
- **Provider Support**: Works with all ProviderV scrapers (Cloudnestra, RidoMovies, etc.)
- **Performance Optimization**: Prefetches segments for smooth playback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation
```bash
cd simple-proxy
pnpm install
```

### Development Mode
```bash
pnpm run dev
# or
npm run dev
```

Server starts on: **http://localhost:3000**

### Production Build
```bash
# For different platforms
pnpm run build:node        # Node.js server
pnpm run build:cloudflare  # Cloudflare Workers
pnpm run build:aws         # AWS Lambda
pnpm run build:netlify     # Netlify Edge Functions
```

## 🛠️ API Endpoints

### HLS Proxy
```http
GET /m3u8-proxy?url={ENCODED_URL}&headers={ENCODED_JSON}
```

**Purpose**: Proxies HLS playlist files and rewrites URLs to route through proxy

**Parameters**:
- `url`: URL-encoded playlist URL
- `headers`: URL-encoded JSON object with required headers

**Example**:
```javascript
const proxyUrl = `http://localhost:3000/m3u8-proxy?url=${encodeURIComponent(playlistUrl)}&headers=${encodeURIComponent(JSON.stringify({
  "referer": "https://cloudnestra.com/",
  "origin": "https://cloudnestra.com"
}))}`;
```

### TS Segment Proxy
```http
GET /ts-proxy?url={ENCODED_URL}&headers={ENCODED_JSON}
```

**Purpose**: Proxies video segments (.ts files) with caching

**Features**:
- Automatic caching of segments
- Cache expiry (2 hours)
- Size limits (2000 entries max)
- Performance optimization

### General Proxy
```http
GET /?destination={ENCODED_URL}
```

**Purpose**: General purpose proxy for other requests

### Cache Statistics
```http
GET /m3u8-proxy/cache-stats
```

Returns cache performance metrics:
```json
{
  "entries": 150,
  "totalSizeMB": "45.2",
  "avgEntrySizeKB": "315.8",
  "maxSize": 2000,
  "expiryHours": 2
}
```

## 🔧 Configuration

### Environment Variables
```bash
# .env file
DISABLE_CACHE=false           # Set to 'true' to disable caching
DISABLE_M3U8=false           # Set to 'true' to disable M3U8 proxying
```

### Caching Configuration
```javascript
const CACHE_MAX_SIZE = 2000;           // Maximum cache entries
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;  // 2 hours expiry
```

## 🏗️ Architecture

### Request Flow
```
[ProviderV Player] 
       ↓
[HLS Stream URL with headers]
       ↓
[Simple Proxy - Port 3000]
       ↓
┌─────────────┬─────────────┐
│ M3U8 Proxy  │ TS Proxy    │
│ • Rewrites  │ • Caches    │
│ • Headers   │ • Streams   │
└─────────────┴─────────────┘
       ↓
[Original Streaming Source]
```

### Integration Points
1. **ProviderV Player** sends HLS URLs to proxy
2. **M3U8 Proxy** rewrites playlists to route through proxy
3. **TS Proxy** serves segments with caching
4. **Headers** maintained throughout the proxy chain

## 📊 Performance Features

### Intelligent Caching
- **Prefetching**: Automatically prefetches upcoming segments
- **Cleanup**: Periodic removal of expired entries
- **Size Management**: Automatic cleanup when cache limit reached
- **Memory Efficient**: Stores segments as Uint8Array

### Streaming Optimization
- **Segment Prediction**: Prefetches next segments based on playlist
- **Parallel Downloads**: Multiple segment downloads
- **Cache Hits**: Instant delivery of cached segments
- **Background Cleanup**: Non-blocking cache maintenance

## 🌐 Platform Deployment

### Node.js (Current Setup)
```bash
pnpm run build:node
pnpm start
```

### Cloudflare Workers
```bash
pnpm run build:cloudflare
# Deploy to Cloudflare
```

### AWS Lambda
```bash
pnpm run build:aws
# Deploy to AWS
```

### Netlify Edge Functions
```bash
pnpm run build:netlify
# Deploy to Netlify
```

## 🔒 Security Features

### Header Protection
- **Sanitization**: Cleans dangerous headers
- **Validation**: Ensures proper header format
- **Forwarding**: Maintains required streaming headers

### Access Control
- **CORS Headers**: Automatically added for browser compatibility
- **Origin Validation**: Configurable origin restrictions
- **Rate Limiting**: Built-in protection against abuse

## 🧪 Testing with ProviderV

### Manual Testing
1. Start simple-proxy: `pnpm run dev`
2. Start ProviderV player: `cd ../player && node index.js`
3. Access player: `http://localhost:3001/player`
4. Play a movie/show and verify proxy usage in logs

### Proxy Verification
```bash
# Test M3U8 proxy
curl "http://localhost:3000/m3u8-proxy?url=PLAYLIST_URL"

# Test TS proxy
curl "http://localhost:3000/ts-proxy?url=SEGMENT_URL"

# Check cache stats
curl "http://localhost:3000/m3u8-proxy/cache-stats"
```

## 📈 Monitoring

### Log Output
- **Request Logging**: All proxy requests logged
- **Cache Events**: Prefetch and cleanup events
- **Error Tracking**: Detailed error information
- **Performance Metrics**: Cache hit rates and timing

### Debug Mode
```javascript
// Enable debug logs
console.log('Cache size:', segmentCache.size);
console.log('Prefetching segment:', url);
```

## 🆘 Troubleshooting

### Common Issues

**Proxy not starting:**
- Check if port 3000 is available
- Verify Node.js version (18+)
- Run `pnpm install` to ensure dependencies

**Streams not proxying:**
- Verify ProviderV player is using correct proxy URL
- Check proxy logs for errors
- Ensure headers are properly encoded

**Cache not working:**
- Check `DISABLE_CACHE` environment variable
- Verify disk space availability
- Monitor cache statistics endpoint

**CORS errors:**
- Verify proxy is returning correct CORS headers
- Check browser console for specific errors
- Ensure proxy URL is accessible from player

### Performance Issues
- **High Memory Usage**: Reduce `CACHE_MAX_SIZE`
- **Slow Startup**: Check network connectivity to streaming sources
- **Cache Misses**: Verify prefetching is working correctly

## 🔧 Development

### Adding New Features
1. **New Endpoints**: Add routes in `src/routes/`
2. **Cache Logic**: Modify caching in `m3u8-proxy.ts`
3. **Header Handling**: Update header utilities
4. **Platform Support**: Configure in `nitro.config.ts`

### Code Structure
```
src/
├── routes/
│   ├── index.ts          # General proxy
│   ├── m3u8-proxy.ts     # HLS playlist proxy
│   └── ts-proxy.ts       # Segment proxy
└── utils/
    ├── body.ts           # Request body handling
    └── headers.ts        # Header management
```

## 📄 License

See LICENSE file in the main ProviderV repository.

---

**Part of ProviderV**: This proxy is specifically designed for the ProviderV streaming platform. For standalone usage, refer to the original movie-web/P-Stream documentation.
