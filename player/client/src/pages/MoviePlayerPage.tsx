import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { LoadingSpinner, ErrorState } from '../components/ui';
import { apiService } from '../services/api';
import { MovieResponse } from '../types';
import { Icons } from '../components/icons';

export const MoviePlayerPage: React.FC = () => {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const loadedMovieRef = useRef<string | null>(null);

  const [loadingStage, setLoadingStage] = useState<'tmdb' | 'stream' | 'buffering' | 'ready'>('tmdb');
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [currentHeaders, setCurrentHeaders] = useState<Record<string, string>>({});
  const [mediaInfo, setMediaInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoBuffered, setIsVideoBuffered] = useState(false);

  const loadMovie = useCallback(
    async (movieTmdbId: string) => {
      // Prevent multiple calls for the same movie that's already loaded or loading
      if (loadedMovieRef.current === movieTmdbId && currentStream) {
        console.log('Skipping duplicate request for', movieTmdbId);
        return;
      }

      console.log('Starting to load movie with TMDB ID:', movieTmdbId);
      loadedMovieRef.current = movieTmdbId;
      setLoadingStage('tmdb');
      setError(null);

      try {
        console.log('Calling API for movie:', movieTmdbId);

        const response: MovieResponse = await apiService.fetchMovie(movieTmdbId);

        if (!response.success) {
          throw new Error((response as any).error || 'Failed to fetch movie');
        }

        setMediaInfo(response.media);
        setLoadingStage('stream');

        if (response.streams && response.streams.length > 0) {
          const stream = response.streams[0];
          console.log('Found movie stream:', stream);

          const streamUrl = stream.stream.playlist;
          console.log('Movie Stream URL:', streamUrl);

          setCurrentStream(streamUrl);
          setCurrentHeaders(stream.stream.headers || {});
          setLoadingStage('buffering');
          // Video will transition to 'ready' when buffering is complete
        } else {
          throw new Error('No streams found for this movie');
        }
      } catch (err) {
        console.error('Error loading movie:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          tmdbId: movieTmdbId,
        });
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoadingStage('tmdb');
        loadedMovieRef.current = null; // Reset on error to allow retry
      }
    },
    [currentStream],
  );

  useEffect(() => {
    console.log('useEffect triggered with tmdbId:', tmdbId, 'loadedMovieRef.current:', loadedMovieRef.current);
    if (tmdbId && loadedMovieRef.current !== tmdbId) {
      console.log('Calling loadMovie for tmdbId:', tmdbId);
      loadMovie(tmdbId);
    } else if (!tmdbId) {
      console.log('No tmdbId provided');
      setError('No TMDB ID provided');
    } else {
      console.log('Already loaded tmdbId:', tmdbId);
    }
  }, [tmdbId, loadMovie]);

  const handleVideoBuffered = useCallback(() => {
    console.log('Video buffered and ready to play');
    setIsVideoBuffered(true);
    setLoadingStage('ready');
  }, []);

  const handleBufferReady = useCallback(
    (ready: boolean) => {
      console.log('🎯 Buffer ready callback:', ready);
      if (ready && loadingStage === 'buffering') {
        console.log('✅ 3+ seconds buffered, transitioning to ready state');
        handleVideoBuffered();
      }
    },
    [loadingStage, handleVideoBuffered],
  );

  const handleRetry = useCallback(() => {
    if (tmdbId) {
      loadedMovieRef.current = null;
      setCurrentStream(null);
      setMediaInfo(null);
      setIsVideoBuffered(false);
      loadMovie(tmdbId);
    }
  }, [tmdbId, loadMovie]);

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black">
        <ErrorState
          title="Error Loading Movie"
          message={error}
          icon={<Icons.AlertCircle className="w-16 h-16 text-red-400" />}
          actions={{
            primary: {
              label: 'Retry',
              onClick: handleRetry,
            },
            secondary: {
              label: 'Go Back',
              onClick: handleClose,
            },
          }}
          className="fixed inset-0"
        />
      </div>
    );
  }

  // Loading state - show until video is fully buffered and ready
  if (loadingStage !== 'ready' || !currentStream || !isVideoBuffered) {
    const getLoadingMessage = () => {
      switch (loadingStage) {
        case 'tmdb':
          return 'Fetching movie data...';
        case 'stream':
          return 'Finding best stream...';
        case 'buffering':
          return 'Loading Content';
        default:
          return 'Loading...';
      }
    };

    return (
      <div className="fixed inset-0 bg-black">
        {/* Show loading overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black">
          <div className="text-center text-white">
            <LoadingSpinner size={120} className="mb-6" />
            <p className="text-lg text-gray-300">{getLoadingMessage()}</p>
          </div>
        </div>

        {/* Pre-load video player in background during buffering */}
        {loadingStage === 'buffering' && currentStream && mediaInfo && (
          <div className="absolute inset-0 opacity-0 pointer-events-none">
            <VideoPlayer
              src={currentStream}
              title={mediaInfo.title}
              year={mediaInfo.releaseYear}
              headers={currentHeaders}
              onClose={handleClose}
              onBufferReady={handleBufferReady}
              onStateChange={(state) => {
                // Primary: Buffer-based ready state
                // Fallback: Traditional ready state after 2 seconds
                if (state.isLoading === false && !isVideoBuffered) {
                  console.log('📺 Video can play (fallback), scheduling ready state...');
                  setTimeout(() => {
                    if (loadingStage === 'buffering' && !isVideoBuffered) {
                      console.log('🔄 Fallback: Transitioning to ready state');
                      handleVideoBuffered();
                    }
                  }, 2000); // 2-second delay to allow buffer system to work first
                }
              }}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    );
  }

  // Video player state - show when everything is ready
  if (loadingStage === 'ready' && currentStream && mediaInfo && isVideoBuffered) {
    return (
      <div className="fixed inset-0 bg-black">
        <VideoPlayer
          src={currentStream}
          title={mediaInfo.title}
          year={mediaInfo.releaseYear}
          headers={currentHeaders}
          onClose={handleClose}
          onBufferReady={handleBufferReady}
          onStateChange={(state) => {
            // Handle video state changes
            if (state.isLoading === false && !isVideoBuffered) {
              handleVideoBuffered();
            }
          }}
          className="w-full h-full"
        />
      </div>
    );
  }

  // Fallback state - if we have a stream but something went wrong
  return (
    <div className="fixed inset-0 bg-black">
      <ErrorState
        title="Video Unavailable"
        message="Unable to load the video stream. Please try again."
        icon={<Icons.Film className="w-16 h-16 text-gray-400" />}
        actions={{
          primary: {
            label: 'Retry',
            onClick: handleRetry,
          },
          secondary: {
            label: 'Go Back',
            onClick: handleClose,
          },
        }}
        className="fixed inset-0"
      />
    </div>
  );
};
