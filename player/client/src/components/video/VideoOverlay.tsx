import React from 'react';
import { Icons } from '../icons';
import { BufferingIndicator } from '../ui';

interface VideoOverlayProps {
  isPlaying: boolean;
  isBuffering: boolean;
  onPlayPause: () => void;
  className?: string;
}

export const VideoOverlay: React.FC<VideoOverlayProps> = ({ isPlaying, isBuffering, onPlayPause, className = '' }) => {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="z-20">
          <BufferingIndicator size="lg" />
        </div>
      )}

      {/* Center Play Button (when paused and not buffering) */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={onPlayPause}
          className="bg-black/50 hover:bg-black/70 rounded-full p-6 text-white transition-colors group z-10"
          aria-label="Play"
        >
          <Icons.Play className="w-16 h-16 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
