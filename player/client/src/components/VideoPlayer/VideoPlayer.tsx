import React, { useRef, useEffect, useState } from 'react';
import '@videojs/http-streaming';
import 'video.js/dist/video-js.css';
import { useVideoPlayer, useVideoControls, useVideoBuffer } from '../../hooks';
import { VideoHeader, VideoProgressBar, VideoControls, VideoOverlay } from '../video';

interface VideoPlayerProps {
  src: string;
  title: string;
  year: string;
  headers?: Record<string, string>;
  onStateChange?: (state: any) => void;
  onBufferReady?: (ready: boolean) => void; // New callback for buffer ready
  onClose?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  year,
  onStateChange,
  onBufferReady,
  onClose,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string>('');
  const [loadingState, setLoadingState] = useState({
    isInitialLoading: false,
    isSourceLoading: false,
  });

  // Initialize video player with hooks
  const { videoRef, player, loadSource } = useVideoPlayer({
    onReady: () => {
      console.log('✅ VideoPlayer ready');
      setLoadingState((prev) => ({ ...prev, isInitialLoading: false }));
    },
    onPlay: () => {
      console.log('▶️ VideoPlayer: Play event');
      updateState({ isPlaying: true });
      onStateChange?.({ isPlaying: true });
    },
    onPause: () => {
      console.log('⏸️ VideoPlayer: Pause event');
      updateState({ isPlaying: false });
      onStateChange?.({ isPlaying: false });
    },
    onTimeUpdate: (currentTime, duration) => {
      console.log(`🎬 VideoPlayer time update: ${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
      updateState({ currentTime, duration });
      bufferActions.updateBufferRanges(currentTime);
      onStateChange?.({ currentTime, duration });
    },
    onProgress: () => {
      if (controlsState.currentTime > 0) {
        bufferActions.updateBufferRanges(controlsState.currentTime);
      }
    },
    onWaiting: () => {
      // Only show buffering if not in initial loading state
      if (!loadingState.isSourceLoading) {
        bufferActions.setBuffering(true);
        updateState({ isBuffering: true });
      }
    },
    onCanPlay: () => {
      setLoadingState({ isInitialLoading: false, isSourceLoading: false });
      bufferActions.setBuffering(false);
      updateState({ isBuffering: false });
      onStateChange?.({ isLoading: false });
    },
    onCanPlayThrough: () => {
      setLoadingState({ isInitialLoading: false, isSourceLoading: false });
      bufferActions.setBuffering(false);
      updateState({ isBuffering: false });
    },
    onSeeking: () => {
      bufferActions.markSeekTime();
      bufferActions.setBuffering(true);
    },
    onSeeked: () => {
      setTimeout(() => {
        bufferActions.setBuffering(false);
      }, 200); // Reduced from 500ms to 200ms
    },
    onVolumeChange: (volume, muted) => {
      updateState({ volume, isMuted: muted });
      onStateChange?.({ volume, muted });
    },
    onLoadStart: () => {
      setLoadingState((prev) => ({ ...prev, isSourceLoading: true }));
      onStateChange?.({ isLoading: true });
    },
    onError: (error) => {
      console.error('❌ VideoPlayer error:', error);
      setLoadingState({ isInitialLoading: false, isSourceLoading: false });

      // Check if it's a source not supported error
      if (error && typeof error === 'object' && 'target' in error) {
        const videoElement = error.target as any;
        if (videoElement && videoElement.error) {
          const mediaError = videoElement.error;
          console.error('📺 Media Error Details:', {
            code: mediaError.code,
            message: mediaError.message,
            MEDIA_ERR_NETWORK: mediaError.MEDIA_ERR_NETWORK,
            MEDIA_ERR_SRC_NOT_SUPPORTED: mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
          });

          // Handle specific error types
          if (mediaError.code === 4) {
            // MEDIA_ERR_SRC_NOT_SUPPORTED
            console.log('🔄 Source not supported, this could be a network/server issue');
            onStateChange?.({
              error:
                'Stream temporarily unavailable. This is usually due to server connectivity issues. Please try again in a moment.',
            });
          } else if (mediaError.code === 2) {
            // MEDIA_ERR_NETWORK
            console.log('🔄 Network error, server might be overloaded');
            onStateChange?.({
              error: 'Network error while loading video. Please check your connection and try again.',
            });
          }
        }
      }
    },
  });

  // Initialize controls
  const {
    state: controlsState,
    actions: { togglePlayPause, seekRelative, toggleMute, toggleFullscreen, resetControlsTimer, setControlsVisibility },
    updateState,
  } = useVideoControls(player, containerRef);

  // Initialize buffer management
  const { bufferState, ...bufferActions } = useVideoBuffer(player, onBufferReady);

  // Debug buffer state changes
  useEffect(() => {
    console.log(`🎮 VideoPlayer bufferState changed:`, {
      rangesCount: bufferState.ranges.length,
      health: bufferState.health,
      totalBuffered: bufferState.totalBuffered,
      isReadyToPlay: bufferState.isReadyToPlay,
      ranges: bufferState.ranges,
    });
  }, [bufferState]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      updateState({ isFullscreen: !!document.fullscreenElement });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [updateState]);

  // Load source when ready
  useEffect(() => {
    if (src && player && src !== loadedSrc) {
      console.log('🎬 Loading source with enhanced buffering:', src);
      setLoadedSrc(src);
      setLoadingState({ isInitialLoading: true, isSourceLoading: true });

      // Load source with minimal delay for better UX
      setTimeout(() => {
        loadSource(src);
      }, 50); // Reduced from 100ms to 50ms
    }
  }, [src, player, loadSource, loadedSrc]);

  // Mouse move handler for showing controls
  const handleMouseMove = () => {
    resetControlsTimer();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setControlsVisibility(false)}
    >
      {/* Video Element */}
      <div data-vjs-player className="w-full h-full">
        <video
          ref={videoRef}
          className="video-js w-full h-full custom-video-player"
          preload="auto"
          data-setup="{}"
          style={{
            position: 'relative',
            outline: 'none',
          }}
        >
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5
            video.
          </p>
        </video>
      </div>

      {/* Video Header */}
      <VideoHeader title={title} year={year} onClose={onClose} visible={controlsState.showControls} />

      {/* Video Overlay (Play button, buffering) */}
      <VideoOverlay
        isPlaying={controlsState.isPlaying}
        isBuffering={controlsState.isBuffering}
        onPlayPause={togglePlayPause}
      />

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          controlsState.showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <VideoProgressBar
          currentTime={controlsState.currentTime}
          duration={controlsState.duration}
          bufferRanges={bufferState.ranges}
          bufferHealth={bufferState.health}
          onSeek={(time) => player?.currentTime(time)}
          visible={controlsState.showControls}
        />

        {/* Debug buffer state - temp */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ display: 'none' }}>
            {JSON.stringify({ bufferRanges: bufferState.ranges.length, bufferHealth: bufferState.health })}
          </div>
        )}

        {/* Control Buttons */}
        <VideoControls
          isPlaying={controlsState.isPlaying}
          volume={controlsState.volume}
          isMuted={controlsState.isMuted}
          onPlayPause={togglePlayPause}
          onSeekBackward={() => seekRelative(-10)}
          onSeekForward={() => seekRelative(10)}
          onVolumeToggle={toggleMute}
          onFullscreen={toggleFullscreen}
          visible={controlsState.showControls}
        />
      </div>
    </div>
  );
};
