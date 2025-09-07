import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { LoadingSpinner, ErrorState } from '../components/ui';
import { apiService } from '../services/api';
import { TvResponse } from '../types';
import { Icons } from '../components/icons';

export const TVPlayerPage: React.FC = () => {
  const { tmdbId, season, episode } = useParams<{
    tmdbId: string;
    season: string;
    episode: string;
  }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTVShow = useCallback(async (tvTmdbId: string, seasonNum: string, episodeNum: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const seasonNumber = parseInt(seasonNum, 10);
      const episodeNumber = parseInt(episodeNum, 10);

      if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
        throw new Error('Invalid season or episode number');
      }

      const response: TvResponse = await apiService.fetchTvShow(tvTmdbId, seasonNumber, episodeNumber);

      if (!response.success) {
        throw new Error((response as any).error || 'Failed to fetch TV show');
      }

      setMediaInfo(response.media);

      if (response.streams && response.streams.length > 0) {
        const stream = response.streams[0];
        setStreamUrl(stream.stream.playlist);
      } else {
        throw new Error('No streams found for this episode');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tmdbId && season && episode) {
      loadTVShow(tmdbId, season, episode);
    } else {
      setError('Missing TMDB ID, season, or episode parameter');
      setIsLoading(false);
    }
  }, [tmdbId, season, episode, loadTVShow]);

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    if (tmdbId && season && episode) {
      loadTVShow(tmdbId, season, episode);
    }
  }, [tmdbId, season, episode, loadTVShow]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black">
        <ErrorState
          title="Error Loading TV Show"
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
          className="w-full h-full"
        />
      </div>
    );
  }

  if (isLoading || !streamUrl || !mediaInfo) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <LoadingSpinner size={120} className="mb-6" />
          <h1 className="text-xl font-semibold mb-2">Loading TV Show</h1>
          <p className="text-gray-300">TMDB ID: {tmdbId}</p>
          <p className="text-gray-300">
            Season {season}, Episode {episode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <VideoPlayer
        src={streamUrl}
        title={`${mediaInfo.title} - S${season}E${episode}`}
        year={mediaInfo.releaseYear}
        onClose={handleClose}
      />
    </div>
  );
};
