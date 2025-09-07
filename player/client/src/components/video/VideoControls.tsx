import React, { useState } from 'react';
import { Icons } from '../icons';

interface VideoControlsProps {
  // Playback state
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;

  // Actions
  onPlayPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onVolumeToggle: () => void;
  onFullscreen: () => void;

  // Optional actions
  onSettings?: () => void;
  onCaptions?: () => void;
  onPictureInPicture?: () => void;

  // Visibility
  visible: boolean;
  className?: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  volume,
  isMuted,
  onPlayPause,
  onSeekBackward,
  onSeekForward,
  onVolumeToggle,
  onFullscreen,
  onSettings,
  onCaptions,
  onPictureInPicture,
  visible,
  className = '',
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  if (!visible) return null;

  return (
    <div className={`flex items-center justify-between px-8 py-6 ${className}`}>
      {/* Left Controls */}
      <div className="flex items-center space-x-6">
        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Icons.Pause className="w-10 h-10" /> : <Icons.Play className="w-10 h-10" />}
        </button>

        {/* Rewind 10s */}
        <button
          onClick={onSeekBackward}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label="Skip back 10 seconds"
        >
          <Icons.SkipBack className="w-8 h-8" />
        </button>

        {/* Forward 10s */}
        <button
          onClick={onSeekForward}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label="Skip forward 10 seconds"
        >
          <Icons.SkipForward className="w-8 h-8" />
        </button>

        {/* Volume */}
        <button
          onClick={onVolumeToggle}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <Icons.VolumeX className="w-8 h-8" /> : <Icons.Volume2 className="w-8 h-8" />}
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-6">
        {/* More Options */}
        <div className="relative">
          <button
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
            aria-label="More options"
          >
            <span className="text-sm">Episodes & More</span>
            <Icons.ChevronDown className="w-5 h-5" />
          </button>
          {showMoreOptions && (
            <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-4 min-w-48">
              <div className="text-white text-sm">
                <p>No recommendations available</p>
              </div>
            </div>
          )}
        </div>

        {/* Captions */}
        {onCaptions && (
          <button
            onClick={onCaptions}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Captions"
          >
            <Icons.Captions className="w-8 h-8" />
          </button>
        )}

        {/* Settings */}
        {onSettings && (
          <button
            onClick={onSettings}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Settings"
          >
            <Icons.Settings className="w-8 h-8" />
          </button>
        )}

        {/* Picture in Picture */}
        {onPictureInPicture && (
          <button
            onClick={onPictureInPicture}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Picture in Picture"
          >
            <Icons.PictureInPicture className="w-8 h-8" />
          </button>
        )}

        {/* Fullscreen */}
        <button
          onClick={onFullscreen}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label="Toggle fullscreen"
        >
          <Icons.Maximize className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
