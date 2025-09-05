import React, { useState, useCallback } from 'react';
import VideoPlayer from './components/VideoPlayer';
import MediaSearch from './components/MediaSearch';
import { apiService } from './services/api';
import { MovieResponse, TvResponse, PlayerState } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [currentHeaders, setCurrentHeaders] = useState<Record<string, string>>({});
  const [mediaInfo, setMediaInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isLoading: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  const handleMediaSelect = useCallback(
    async (media: { type: 'movie' | 'tv'; tmdbId: string; season?: number; episode?: number }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStream(null);

      try {
        console.log('Loading media:', media);

        let response: MovieResponse | TvResponse;

        if (media.type === 'movie') {
          response = await apiService.fetchMovie(media.tmdbId);
        } else {
          if (!media.season || !media.episode) {
            throw new Error('Season and episode are required for TV shows');
          }
          response = await apiService.fetchTvShow(media.tmdbId, media.season, media.episode);
        }

        if (!response.success) {
          throw new Error((response as any).error || 'Failed to fetch media');
        }

        setMediaInfo(response.media);

        if (response.streams && response.streams.length > 0) {
          const stream = response.streams[0];
          console.log('Found stream:', stream);

          // Stream URL is already proxied by the providers, use it directly
          const streamUrl = stream.stream.playlist;

          console.log('Stream URL:', streamUrl);

          setCurrentStream(streamUrl);
          setCurrentHeaders(stream.stream.headers || {});
        } else {
          throw new Error('No streams found for this content');
        }
      } catch (err) {
        console.error('Error loading media:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handlePlayerStateChange = useCallback((state: Partial<PlayerState>) => {
    setPlayerState((prev) => ({ ...prev, ...state }));
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ProviderV Player</h1>
          <p className="text-gray-600">Stream movies and TV shows with automatic provider detection</p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('movies')}
            className={`tab-button ${activeTab === 'movies' ? 'active' : 'inactive'}`}
          >
            Movies
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`tab-button ${activeTab === 'tv' ? 'active' : 'inactive'}`}
          >
            TV Shows
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Media Search */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">{activeTab === 'movies' ? 'Find Movies' : 'Find TV Shows'}</h2>

              <MediaSearch onMediaSelect={handleMediaSelect} className="mb-4" />

              {/* Current Media Info */}
              {mediaInfo && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Now Playing</h3>
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">{mediaInfo.title}</div>
                    <div>{mediaInfo.releaseYear}</div>
                    {mediaInfo.season && (
                      <div>
                        S{mediaInfo.season.number}E{mediaInfo.episode.number}
                      </div>
                    )}
                    <div className="mt-2 text-xs">TMDB ID: {mediaInfo.tmdbId}</div>
                  </div>
                </div>
              )}

              {/* Player Controls Info */}
              {currentStream && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">Playback Info</h3>
                  <div className="text-sm text-gray-600">
                    <div>Status: {playerState.isPlaying ? 'Playing' : 'Paused'}</div>
                    <div>
                      Time: {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                    </div>
                    <div>Volume: {Math.round(playerState.volume * 100)}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Video Player Container */}
              <div className="aspect-video relative">
                {currentStream ? (
                  <VideoPlayer
                    src={currentStream}
                    headers={currentHeaders}
                    onStateChange={handlePlayerStateChange}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-800 text-white">
                    <div className="text-center">
                      <div className="text-xl mb-2">🎬</div>
                      <div className="text-lg font-medium mb-1">No video selected</div>
                      <div className="text-sm text-gray-300">Choose a movie or TV show to start streaming</div>
                    </div>
                  </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="loading-spinner mx-auto mb-4"></div>
                      <div>Loading stream...</div>
                    </div>
                  </div>
                )}

                {/* Error Overlay */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white p-6">
                      <div className="text-xl mb-2">❌</div>
                      <div className="text-lg font-medium mb-2">Error</div>
                      <div className="text-sm text-gray-300 mb-4 max-w-md">{error}</div>
                      <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Player Info Bar */}
              {currentStream && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>Quality: Auto | Format: HLS</div>
                    <div className="flex gap-4">
                      <span>🔗 Proxied Stream</span>
                      <span>🛡️ CORS Enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {!currentStream && !isLoading && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">How to use ProviderV Player</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Enter a TMDB ID for quick access (e.g., 550 for Fight Club)</li>
                  <li>• Or search by title to find movies and TV shows</li>
                  <li>• For TV shows, specify season and episode numbers</li>
                  <li>• Player will automatically find and load available streams</li>
                  <li>• Streams are proxied through our CORS-enabled proxy server</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
