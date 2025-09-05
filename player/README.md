# ProviderV Player - React + Video.js Streaming Interface

A modern web player interface for the ProviderV streaming platform, built with React 18, TypeScript, and Video.js.

## 🎬 Features

- **🎥 Professional Video Player**: Video.js 8.x with HLS streaming support
- **⚡ React 18 + TypeScript**: Modern frontend with full type safety
- **� TMDB Integration**: Rich metadata from The Movie Database
- **� Auto Provider Switching**: Intelligent fallback between streaming sources
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **� CORS Handling**: Seamless integration with simple-proxy
- **🎮 Intuitive UI**: Clean interface with Tailwind CSS styling

## 🏗️ Architecture

```
Frontend (Vite + React)     Backend (Express.js)     Provider System
┌─────────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│                     │    │                   │    │                 │
│ • React Components  │◄───┤ • REST API        │◄───┤ • Media Scraping│
│ • Video.js Player   │    │ • TMDB API        │    │ • Provider Logic│
│ • TypeScript        │    │ • Provider Calls  │    │ • Stream URLs   │
│ • Tailwind CSS      │    │ • Error Handling  │    │ • Metadata      │
│                     │    │                   │    │                 │
└─────────────────────┘    └───────────────────┘    └─────────────────┘
         │                           │
         └───────────────────────────┘
              Port 5173 → Port 3001
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- TMDB API Key

### 1. Install Dependencies
```bash
cd player
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your TMDB API key
TMDB_API_KEY=your_api_key_here
```

### 3. Start Development
```bash
# Start backend server (port 3001)
node index.js

# In another terminal, start frontend (port 5173)
npm run dev:client

# Access the player at: http://localhost:5173
```

## 🎮 Usage

### Movies
1. Enter TMDB ID (e.g., `550` for Fight Club)
2. Click "Play"
3. Player automatically finds and loads streams

### TV Shows
1. Enter TMDB ID (e.g., `1399` for Game of Thrones)
2. Enter season and episode numbers
3. Click "Play"
4. Player loads the specific episode

### Player Controls
- **Play/Pause**: Space bar or click play button
- **Seek**: Click on progress bar or use arrow keys
- **Volume**: Click volume icon or use up/down arrows
- **Fullscreen**: Click fullscreen button or press F

## 🛠️ Development

### Project Structure
```
player/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── VideoPlayer.tsx    # Video.js integration
│   │   │   ├── MediaSearch.tsx    # Search interface
│   │   │   └── App.tsx            # Main application
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript definitions
│   │   └── index.css       # Tailwind styles
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
├── backend/                # Express.js backend
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   └── app.js            # Express app setup
├── index.js               # Backend entry point
├── package.json           # Backend dependencies
└── README.md
```

### Available Scripts

#### Backend
```bash
npm start          # Start production server
npm run dev        # Start with auto-reload
npm run dev:server # Backend only with watch mode
```

#### Frontend
```bash
npm run dev:client # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### API Endpoints

#### Movies
```http
GET /api/v1/movie/:tmdbId
```
**Response:**
```json
{
  "success": true,
  "media": {
    "title": "Fight Club",
    "releaseYear": "1999",
    "tmdbId": "550"
  },
  "streams": [
    {
      "providerId": "cloudnestra",
      "providerName": "Cloudnestra",
      "stream": {
        "playlist": "http://localhost:3000/m3u8-proxy?url=...",
        "headers": {}
      }
    }
  ]
}
```

#### TV Shows
```http
GET /api/v1/tv/:tmdbId/:season/:episode
```
**Response:**
```json
{
  "success": true,
  "media": {
    "title": "Game of Thrones",
    "releaseYear": "2011",
    "tmdbId": "1399",
    "season": { "number": 1 },
    "episode": { "number": 1 }
  },
  "streams": [...] 
}
```

## 🎨 UI Components

### VideoPlayer Component
- **Video.js Integration**: Professional video player with HLS support
- **Event Handling**: Play, pause, seek, volume, error handling
- **Stream Loading**: Automatic source detection and loading
- **Responsive**: Adapts to container size

### MediaSearch Component
- **TMDB ID Input**: Quick access with movie/TV show IDs
- **Season/Episode**: TV show specific controls
- **Search Interface**: Title-based search (future enhancement)

### App Component
- **State Management**: Player state, loading states, error handling
- **API Integration**: Calls to backend services
- **UI Layout**: Responsive grid layout with Tailwind CSS

## 🔧 Configuration

### Environment Variables
```bash
# .env file
TMDB_API_KEY=your_tmdb_api_key
VITE_API_BASE_URL=http://localhost:3001
```

### Video.js Configuration
```typescript
const player = videojs(videoElement, {
  controls: true,
  fluid: false,
  responsive: false,
  preload: 'auto',
  techOrder: ['html5'],
  html5: {
    vhs: {
      enableLowInitialPlaylist: true,
      allowSeeksWithinUnsafeLiveWindow: true,
      partiallyReloadSourceOnError: true,
    },
  },
});
```

## � Troubleshooting

### Common Issues

**Video not loading:**
- Check if simple-proxy is running on port 3000
- Verify CORS headers in browser network tab
- Check console for Video.js errors

**TMDB API errors:**
- Verify API key in `.env` file
- Check rate limits (40 requests per 10 seconds)
- Ensure TMDB ID is valid

**Player not initializing:**
- Check Video.js console logs
- Verify DOM element is mounted
- Check for JavaScript errors

### Debug Mode
Enable detailed logging:
```typescript
// In VideoPlayer.tsx
console.log('🎬 Video.js debug enabled');
```

## 🚀 Production Deployment

### Build Frontend
```bash
npm run build
```

### Environment Variables
```bash
NODE_ENV=production
TMDB_API_KEY=your_production_key
```

### Nginx Configuration
```nginx
server {
    listen 80;
    root /path/to/player/dist;
    
    location /api {
        proxy_pass http://localhost:3001;
    }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow TypeScript and React best practices
4. Test with both movies and TV shows
5. Submit pull request

## 📄 License

See root LICENSE file for details.

---

**Built with ❤️ using React, TypeScript, and Video.js**
