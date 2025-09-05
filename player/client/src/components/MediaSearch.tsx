import React, { useState } from 'react';
import { TMDBSearchResult } from '../types';
import { apiService } from '../services/api';

interface MediaSearchProps {
  onMediaSelect: (media: { type: 'movie' | 'tv'; tmdbId: string; season?: number; episode?: number }) => void;
  className?: string;
}

const MediaSearch: React.FC<MediaSearchProps> = ({ onMediaSelect, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBSearchResult | null>(null);
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [directTmdbId, setDirectTmdbId] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await apiService.searchTMDB(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMediaClick = (media: TMDBSearchResult) => {
    setSelectedMedia(media);

    if (media.media_type === 'movie' || (!media.media_type && media.title)) {
      // It's a movie - play directly
      onMediaSelect({
        type: 'movie',
        tmdbId: media.id.toString(),
      });
    }
    // For TV shows, user needs to specify season/episode
  };

  const handleTvPlay = () => {
    if (!selectedMedia) return;

    onMediaSelect({
      type: 'tv',
      tmdbId: selectedMedia.id.toString(),
      season: parseInt(season),
      episode: parseInt(episode),
    });
  };

  const handleDirectPlay = () => {
    if (!directTmdbId.trim()) return;

    const tmdbId = directTmdbId.trim();

    // For direct input, ask user to specify type
    const mediaType = tmdbId.includes('movie') || confirm('Is this a movie? (Cancel for TV show)') ? 'movie' : 'tv';

    if (mediaType === 'movie') {
      onMediaSelect({
        type: 'movie',
        tmdbId: tmdbId.replace(/\D/g, ''), // Extract only numbers
      });
    } else {
      onMediaSelect({
        type: 'tv',
        tmdbId: tmdbId.replace(/\D/g, ''), // Extract only numbers
        season: parseInt(season),
        episode: parseInt(episode),
      });
    }
  };

  return (
    <div className={`media-search ${className}`}>
      {/* Direct TMDB ID Input */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Quick Play with TMDB ID</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={directTmdbId}
            onChange={(e) => setDirectTmdbId(e.target.value)}
            placeholder="Enter TMDB ID (e.g., 550 for Fight Club)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleDirectPlay}
            disabled={!directTmdbId.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Play
          </button>
        </div>

        {/* Season/Episode for TV */}
        <div className="flex gap-2">
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="Season"
            min="1"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <input
            type="number"
            value={episode}
            onChange={(e) => setEpisode(e.target.value)}
            placeholder="Episode"
            min="1"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <span className="text-sm text-gray-500 py-1">For TV shows</span>
        </div>
      </div>

      {/* Search Interface */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Search Movies & TV Shows</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for movies or TV shows..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Search Results:</h4>
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleMediaClick(result)}
                className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
              >
                <div className="font-medium">{result.title || result.name}</div>
                <div className="text-sm text-gray-600">
                  {result.release_date || result.first_air_date} •{result.media_type || (result.title ? 'movie' : 'tv')}{' '}
                  • ID: {result.id}
                </div>
                {result.overview && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{result.overview.substring(0, 100)}...</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TV Show Season/Episode Selection */}
      {selectedMedia && (selectedMedia.media_type === 'tv' || (!selectedMedia.media_type && selectedMedia.name)) && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Playing: {selectedMedia.title || selectedMedia.name}</h4>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Season:</label>
            <input
              type="number"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              min="1"
              className="w-16 px-2 py-1 border border-gray-300 rounded"
            />
            <label className="text-sm">Episode:</label>
            <input
              type="number"
              value={episode}
              onChange={(e) => setEpisode(e.target.value)}
              min="1"
              className="w-16 px-2 py-1 border border-gray-300 rounded"
            />
            <button onClick={handleTvPlay} className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              Play Episode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaSearch;
