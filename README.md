# ProviderV - Streaming Media Platform

A complete streaming media platform consisting of three integrated components:

## 🎬 Components

### 1. **Provider System** (`src/`)
Advanced media scraping engine with support for movies and TV shows from multiple providers.

### 2. **Player Interface** (`player/`)
Modern web player with Video.js integration and automatic provider switching.

### 3. **Simple Proxy** (`simple-proxy/`)
Specialized HLS proxy server for bypassing CORS restrictions and caching video segments.

## ✨ Features

- **🔄 Automatic Provider Detection**: 12+ sources and 30+ embeds with intelligent fallback
- **🎥 Professional Video Player**: Video.js integration with HLS streaming support
- **🌐 CORS Bypass**: Advanced proxy system for seamless streaming
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔀 Provider Switching**: Switch between different sources without interruption
- **📺 Movies & TV Shows**: Complete support for both content types
- **🎯 TMDB Integration**: Rich metadata from The Movie Database

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- TMDB API Key

### 1. Install Dependencies
```bash
# Main provider system
npm install

# Player server
cd player && npm install

# Simple proxy
cd ../simple-proxy && pnpm install
```

### 2. Configuration
```bash
# Copy environment files
cp player/.env.example player/.env
cp simple-proxy/.env.example simple-proxy/.env

# Add your TMDB API key to player/.env
TMDB_API_KEY=your_api_key_here
```

### 3. Start Services
```bash
# Terminal 1: Start simple-proxy (port 3000)
cd simple-proxy && npm run dev

# Terminal 2: Start player server (port 3001)
cd player && node index.js

# Access the player at: http://localhost:3001/player
```

## 🎮 Usage

1. **Movies**: Enter TMDB ID (e.g., 550 for Fight Club)
2. **TV Shows**: Enter TMDB ID, season, and episode numbers
3. **Auto-streaming**: Player automatically finds and streams content
4. **Provider Switching**: Use dropdown to switch between available sources

## 🛠️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Simple Proxy  │    │  Player Server  │    │   Provider Lib  │
│   (Port 3000)   │◄───┤   (Port 3001)   │◄───┤   (Compiled)    │
│                 │    │                 │    │                 │
│ • HLS Proxy     │    │ • Web Interface │    │ • Media Scraping│
│ • CORS Bypass   │    │ • TMDB API      │    │ • 12+ Sources   │
│ • Segment Cache │    │ • Provider API  │    │ • 30+ Embeds    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📚 API Endpoints

### Player Server (Port 3001)
- `GET /api/v1/movie/:tmdbId` - Get movie streams
- `GET /api/v1/tv/:tmdbId/:season/:episode` - Get TV episode streams
- `GET /api/v1/providers` - List available providers
- `GET /health` - Health check

### Simple Proxy (Port 3000)
- `GET /m3u8-proxy` - HLS playlist proxy with URL rewriting
- `GET /ts-proxy` - Video segment proxy with caching
- `GET /?destination=URL` - General purpose proxy

## 🔧 Development

### Build Provider Library
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

## 📦 Provider Support

Currently supports providers including:
- Cloudnestra ✅
- RidoMovies
- FshareTV
- And many more...

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with the player interface
5. Submit a pull request

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Note**: This is for educational purposes. Ensure you comply with copyright laws in your jurisdiction.
