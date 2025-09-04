# ProviderV Player

Modern web-based streaming player with automatic provider detection and professional Video.js integration.

## ✨ Features

- **🎥 Video.js Integration**: Professional video player with HLS support
- **🔄 Automatic Provider Detection**: Seamlessly finds working streams
- **🎬 Movies & TV Shows**: Complete support for both content types
- **🌐 TMDB Integration**: Rich metadata from The Movie Database
- **🔀 Provider Switching**: Switch between sources without interruption
- **📱 Responsive Design**: Works perfectly on all devices
- **🎯 Simple Interface**: Clean 2-tab design (Movies/TV)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- TMDB API Key
- Simple Proxy running on port 3000

### Installation
```bash
cd player
npm install
```

### Configuration
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings
TMDB_API_KEY=your_tmdb_api_key_here
PLAYER_PORT=3001
```

### Start Server
```bash
node index.js
```

Access the player at: **http://localhost:3001/player**

## 🎮 Usage Guide

### Movies
1. Click the "🎥 Movies" tab
2. Enter a TMDB ID (e.g., `550` for Fight Club)
3. Click "🎬 Play Movie" or press Enter
4. Player automatically finds and streams the movie

### TV Shows
1. Click the "📺 TV Shows" tab
2. Enter TMDB ID (e.g., `1399` for Game of Thrones)
3. Enter Season number (e.g., `1`)
4. Enter Episode number (e.g., `1`)
5. Click "📺 Play Episode" or press Enter

### Provider Switching
- Use the dropdown menu to switch between available providers
- No interruption to playback when switching
- Automatic fallback if a provider fails

## 🛠️ Architecture

```
┌─────────────────────┐
│   Web Interface     │
│   (Video.js)        │
├─────────────────────┤
│   Express Server    │
│   • API Routes      │
│   • Static Files    │
│   • TMDB Client     │
├─────────────────────┤
│   Provider System   │
│   • Source Scrapers │
│   • Embed Scrapers  │
│   • Stream Detection│
└─────────────────────┘
```

## 📚 API Reference

### Movies
```http
GET /api/v1/movie/:tmdbId
```

**Parameters:**
- `tmdbId` (required): The Movie Database ID
- `providers` (optional): Comma-separated provider IDs
- `timeout` (optional): Timeout in milliseconds (default: 30000)

**Response:**
```json
{
  "success": true,
  "media": {
    "type": "movie",
    "title": "Fight Club",
    "releaseYear": 1999,
    "tmdbId": "550",
    "imdbId": "tt0137523"
  },
  "streams": [
    {
      "providerId": "cloudnestra",
      "providerName": "Cloudnestra",
      "stream": {
        "type": "hls",
        "playlist": "https://...",
        "headers": {
          "referer": "https://cloudnestra.com/"
        }
      }
    }
  ]
}
```

### TV Shows
```http
GET /api/v1/tv/:tmdbId/:season/:episode
```

**Parameters:**
- `tmdbId` (required): The Movie Database ID
- `season` (required): Season number
- `episode` (required): Episode number
- `providers` (optional): Comma-separated provider IDs
- `timeout` (optional): Timeout in milliseconds

### Providers List
```http
GET /api/v1/providers
```

Returns all available sources and embeds with their capabilities.

### Health Check
```http
GET /health
```

Returns server status and provider counts.

## 🎨 Customization

### Styling
The player uses a modern gradient design with:
- Purple gradient background
- Glass-morphism effects
- Video.js dark theme
- Responsive breakpoints

### Video.js Configuration
```javascript
{
  fluid: true,
  responsive: true,
  controls: true,
  preload: 'auto',
  html5: {
    hls: {
      enableLowInitialPlaylist: true,
      smoothQualityChange: true,
      overrideNative: true
    }
  }
}
```

## 🔧 Development

### File Structure
```
player/
├── index.js          # Express server
├── package.json      # Dependencies
├── .env.example      # Environment template
└── web/
    └── index.html    # Web interface
```

### Adding New Features
1. **Server-side**: Modify `index.js` for new API endpoints
2. **Client-side**: Update `web/index.html` for UI changes
3. **Styling**: Add CSS in the `<style>` section

### Debugging
- Enable debug logs in the browser console
- Check server logs for provider errors
- Use network tab to inspect API calls

## 🌐 Integration with Simple Proxy

The player automatically uses the simple-proxy for:
- **HLS Streams**: Routes through `/m3u8-proxy` for playlist rewriting
- **CORS Bypass**: Handles header forwarding and restrictions
- **Segment Caching**: Improves streaming performance

## 🔒 Security

- **CORS Protection**: Properly configured for web browsers
- **Input Validation**: Sanitizes TMDB IDs and parameters
- **Error Handling**: Graceful failure without exposing internals
- **Rate Limiting**: Respects provider rate limits

## 📱 Mobile Support

- **Responsive Design**: Adapts to all screen sizes
- **Touch Controls**: Optimized for mobile interaction
- **Performance**: Efficient on mobile connections

## 🆘 Troubleshooting

### Common Issues

**No streams found:**
- Verify TMDB ID is correct
- Check if providers are working
- Try different providers using the dropdown

**Video not loading:**
- Ensure simple-proxy is running on port 3000
- Check browser console for errors
- Verify CORS settings

**Provider errors:**
- Providers may be temporarily down
- Some providers require specific regions
- Try switching to different providers

### Debug Mode
Add debug parameters to see detailed logs:
```javascript
console.log('Debug mode enabled');
// Check browser console for detailed information
```

## 📄 License

Part of the ProviderV project. See main LICENSE file.

---

**Need help?** Check the main ProviderV README or create an issue.
