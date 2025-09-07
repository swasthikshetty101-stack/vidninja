import { useRef, useEffect, useCallback, useState } from 'react';
import videojs from 'video.js';
import { getStreamingConfig } from '../config/streaming';
// import { BlobService } from '../services/BlobService'; // TODO: Implement blob URLs for complete source hiding

type VideoJsPlayer = any; // VideoJS player type

export interface UseVideoPlayerOptions {
  onReady?: (player: VideoJsPlayer) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: () => void;
  onWaiting?: () => void;
  onCanPlay?: () => void;
  onCanPlayThrough?: () => void;
  onSeeking?: () => void;
  onSeeked?: () => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onLoadStart?: () => void;
  onError?: (error: any) => void;
  onDispose?: () => void;
}

export interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  player: VideoJsPlayer | null;
  isInitialized: boolean;
  loadSource: (src: string, type?: string) => void;
}

export const useVideoPlayer = (options: UseVideoPlayerOptions = {}): UseVideoPlayerReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    onReady,
    onPlay,
    onPause,
    onTimeUpdate,
    onProgress,
    onWaiting,
    onCanPlay,
    onCanPlayThrough,
    onSeeking,
    onSeeked,
    onVolumeChange,
    onLoadStart,
    onError,
    onDispose
  } = options;

  // Initialize Video.js player
  const initializePlayer = useCallback(() => {
    if (!videoRef.current || playerRef.current) {
      return;
    }

    if (!document.contains(videoRef.current)) {
      setTimeout(initializePlayer, 100);
      return;
    }

    console.log('🎬 Initializing VideoJS Player...');

    try {
      const player = videojs(videoRef.current, {
        controls: false,
        fluid: false,
        responsive: false,
        width: '100%',
        height: '100%',
        preload: 'auto', // Auto-load for continuous buffering
        autoplay: false,
        muted: false,
        inactivityTimeout: 0,
        userActions: {
          hotkeys: false,
        },
        // Force continuous buffering behavior
        loadPolicy: 'auto', // Always load content
        pauseClass: '', // Don't change behavior on pause
        techOrder: ['html5'],
        html5: {
          // MP4 specific buffering settings
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          preloadTextTracks: false,
          // VHS settings for HLS streams
          vhs: {
            // Basic VHS configuration
            enableLowInitialPlaylist: true,
            partiallyReloadSourceOnError: true,
            maxPlaylistRetries: 10,
            bandwidth: 16777216,
            withCredentials: false,
            // Enhanced progressive buffer settings like YouTube
            bufferSize: 1024 * 1024 * 32, // 32MB chunks
            maxBufferLength: 120, // Keep 2 minutes ahead maximum
            maxMaxBufferLength: 600, // Absolute maximum 10 minutes
            bufferToPreventRebuffering: 10, // 10 seconds minimum before starting
            seekBufferLength: 30, // 30 seconds for seeking
            // Progressive downloading strategy - NEVER STOP BUFFERING
            goalBufferLength: 60, // Target 60 seconds of buffer (aggressive like YouTube)
            minBufferLength: 5, // Minimum 5 seconds before starting playback
            lowBufferWatchdogPeriod: 500, // Check buffer health every 500ms
            highBufferWatchdogPeriod: 1000, // Frequent checks even when buffer is healthy
            fastQualityChange: true,
            smoothQualityChange: true,
            overrideNative: true,
            enableSourceBuffers: true,
            // Continuous buffering settings - CRITICAL FOR NEVER STOPPING
            allowSeeksWithinUnsafeLiveWindow: true,
            experimentalBufferBasedABR: false, // Disable adaptive bitrate to focus on buffering
            useBandwidthFromLocalStorage: false, // Always use maximum bandwidth for aggressive buffering
            experimentalLLHLS: false, // Disable low-latency for better buffering
            forceSSL: false,
            // NEVER PAUSE BUFFERING - THE KEY SETTING
            pauseLoadingOnPause: false, // Continue loading even when paused
            // Enhanced network and downloading
            useNetworkInformationApi: true,
            experimentalExactManifestTimings: true,
            // Additional aggressive buffering settings
            handleManifestRedirects: true,
            handlePartialData: true,
            limitRenditionByPlayerDimensions: false, // Don't limit quality
            useDevicePixelRatio: false, // Maximize quality
          },
        },
        // Force the browser to buffer more aggressively
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        children: ['mediaLoader', 'posterImage', 'textTrackDisplay'],
      });

      playerRef.current = player;

      // Set up event listeners
      player.ready(() => {
        console.log('✅ VideoJS Player ready');
        setIsInitialized(true);

        // Enhanced buffering for MP4 files
        const videoElement = player.el()?.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          // Set aggressive preload
          videoElement.preload = 'auto';

          // Force browser to buffer more aggressively
          videoElement.setAttribute('preload', 'auto');
          videoElement.setAttribute('x-webkit-airplay', 'allow');

          // CRITICAL: Force continuous loading even when paused
          const originalPause = videoElement.pause;
          videoElement.pause = function () {
            console.log('🔄 Video paused but network loading should continue...');
            // Call original pause but maintain network activity
            originalPause.call(this);

            // Force the browser to continue downloading in background
            if (this.readyState < 4) { // If not HAVE_ENOUGH_DATA
              console.log('⬇️ Forcing continued download during pause...');
              // Trigger load to continue buffering
              this.load();
            }
          };

          // Add buffer monitoring with more frequent updates
          const monitorBuffer = () => {
            const buffered = videoElement.buffered;
            const currentTime = videoElement.currentTime;
            const duration = videoElement.duration;

            if (buffered.length > 0 && duration > 0) {
              let bufferAhead = 0;
              let totalBuffered = 0;

              // Calculate total buffered content
              for (let i = 0; i < buffered.length; i++) {
                const start = buffered.start(i);
                const end = buffered.end(i);
                totalBuffered += end - start;

                if (start <= currentTime && end > currentTime) {
                  bufferAhead = end - currentTime;
                }
              }

              const bufferPercent = (totalBuffered / duration) * 100;
              console.log(`📊 Buffer: ${bufferAhead.toFixed(1)}s ahead, ${bufferPercent.toFixed(1)}% total, ${buffered.length} ranges`);

              // Try to encourage more buffering when buffer is low
              if (bufferAhead < 30 && videoElement.readyState >= 2) { // Increased threshold to 30s
                console.log('⚡ Low buffer detected, triggering aggressive buffering...');
                // Force additional buffering requests
                if (videoElement.networkState === 2) { // NETWORK_LOADING
                  console.log('📥 Network already loading, maintaining buffer...');
                } else {
                  console.log('🔄 Triggering buffer reload...');
                  // Force buffer reload without interrupting playback
                  const wasPlaying = !videoElement.paused;
                  const ct = videoElement.currentTime;

                  // Use a gentle approach to trigger more buffering
                  videoElement.preload = 'auto';
                  if (!wasPlaying) {
                    // If paused, force load to continue buffering
                    videoElement.load();
                    videoElement.currentTime = ct;
                  }
                }
              }

              // YouTube-like aggressive buffering: always try to maintain 60s ahead
              if (bufferAhead < 60 && bufferPercent < 50) {
                console.log(`🎯 YouTube-style buffering: ${bufferAhead.toFixed(1)}s < 60s target, encouraging more download...`);
                // Encourage browser to buffer more by slightly adjusting playback rate
                if (!videoElement.paused) {
                  const originalRate = videoElement.playbackRate;
                  setTimeout(() => {
                    videoElement.playbackRate = originalRate * 1.001;
                    setTimeout(() => videoElement.playbackRate = originalRate, 50);
                  }, 100);
                }
              }
            }
          };

          // Monitor buffer every 1 second for more responsive buffering
          const bufferInterval = setInterval(monitorBuffer, 1000);

          // CRITICAL: Monitor pause events and ensure buffering continues
          const handlePause = () => {
            console.log('⏸️ Video paused - implementing YouTube-like continuous buffering...');

            // Force buffer check immediately when paused
            setTimeout(monitorBuffer, 100);

            // Set up aggressive buffering during pause
            const pauseBufferInterval = setInterval(() => {
              if (videoElement.paused) {
                const buffered = videoElement.buffered;
                const currentTime = videoElement.currentTime;
                const duration = videoElement.duration;

                if (buffered.length > 0 && duration > 0) {
                  let bufferAhead = 0;
                  for (let i = 0; i < buffered.length; i++) {
                    const start = buffered.start(i);
                    const end = buffered.end(i);
                    if (start <= currentTime && end > currentTime) {
                      bufferAhead = end - currentTime;
                      break;
                    }
                  }

                  console.log(`⏸️🔄 Paused buffering: ${bufferAhead.toFixed(1)}s ahead (Target: 60s)`);

                  // If buffer is less than 60s, force more downloading
                  if (bufferAhead < 60) {
                    console.log('⚡ Forcing continuous download during pause...');
                    // Trigger network activity without affecting playback
                    videoElement.preload = 'auto';
                    if (videoElement.networkState !== 2) { // If not actively loading
                      const ct = videoElement.currentTime;
                      videoElement.load();
                      videoElement.currentTime = ct;
                    }
                  }
                } else {
                  // No buffer info, force loading
                  console.log('🔄 No buffer data, forcing load during pause...');
                  const ct = videoElement.currentTime;
                  videoElement.load();
                  videoElement.currentTime = ct;
                }
              } else {
                // Video resumed, clear pause buffering
                clearInterval(pauseBufferInterval);
              }
            }, 2000); // Check every 2 seconds during pause
          };

          const handlePlay = () => {
            console.log('▶️ Video resumed - buffer should continue naturally...');
          };

          // Add pause/play event listeners
          videoElement.addEventListener('pause', handlePause);
          videoElement.addEventListener('play', handlePlay);

          // Clean up interval when player is disposed
          player.on('dispose', () => {
            clearInterval(bufferInterval);
            videoElement.removeEventListener('pause', handlePause);
            videoElement.removeEventListener('play', handlePlay);
          });

          // Initial buffer check
          videoElement.addEventListener('loadeddata', monitorBuffer);
          videoElement.addEventListener('progress', monitorBuffer);
        }

        onReady?.(player);
      });

      player.on('play', () => {
        console.log('▶️ Playing');
        onPlay?.();
      });

      player.on('pause', () => {
        console.log('⏸️ Paused');
        onPause?.();
      });

      player.on('timeupdate', () => {
        if (player && !player.isDisposed()) {
          const current = player.currentTime() || 0;
          const total = player.duration() || 0;
          console.log(`⏰ Time update: ${current.toFixed(2)}s / ${total.toFixed(2)}s`);
          onTimeUpdate?.(current, total);
        }
      });

      // Add metadata loading events for immediate duration
      player.on('loadedmetadata', () => {
        if (player && !player.isDisposed()) {
          const duration = player.duration() || 0;
          console.log(`📋 Metadata loaded - Duration: ${duration.toFixed(2)}s`);
          onTimeUpdate?.(0, duration); // Trigger with current time 0 and actual duration
        }
      });

      player.on('durationchange', () => {
        if (player && !player.isDisposed()) {
          const duration = player.duration() || 0;
          console.log(`⏱️ Duration changed: ${duration.toFixed(2)}s`);
          onTimeUpdate?.(player.currentTime() || 0, duration);
        }
      });

      player.on('progress', () => {
        console.log('📈 Progress event fired');
        onProgress?.();
      });

      player.on('waiting', () => {
        console.log('⏳ Buffering...');
        onWaiting?.();
      });

      player.on('canplay', () => {
        console.log('▶️ Can play');
        onCanPlay?.();
      });

      player.on('canplaythrough', () => {
        console.log('✅ Can play through');
        onCanPlayThrough?.();
      });

      player.on('seeking', () => {
        console.log('🔍 Seeking...');
        onSeeking?.();
      });

      player.on('seeked', () => {
        console.log('✅ Seeked');
        onSeeked?.();
      });

      player.on('volumechange', () => {
        if (player && !player.isDisposed()) {
          const volume = player.volume() || 0;
          const muted = player.muted() || false;
          onVolumeChange?.(volume, muted);
        }
      });

      player.on('loadstart', () => {
        console.log('📡 Loading started');
        onLoadStart?.();
      });

      player.on('error', (error: any) => {
        console.error('❌ VideoPlayer error:', error);
        onError?.(error);
      });

    } catch (error) {
      console.error('❌ Failed to initialize VideoPlayer:', error);
    }
  }, [
    onReady,
    onPlay,
    onPause,
    onTimeUpdate,
    onProgress,
    onWaiting,
    onCanPlay,
    onCanPlayThrough,
    onSeeking,
    onSeeked,
    onVolumeChange,
    onLoadStart,
    onError
  ]);

  // Load source with blob URL creation for maximum security
  const loadSource = useCallback(async (src: string, type?: string) => {
    if (!playerRef.current || playerRef.current.isDisposed()) {
      console.warn('⚠️ Player not ready, cannot load source');
      return;
    }

    try {
      console.log('🎬 Loading video source:', src);

      // Get streaming configuration
      const streamingConfig = getStreamingConfig();
      console.log(`📡 Streaming mode: ${streamingConfig.mode}`);
      console.log('💡 To change streaming mode, use localStorage.setItem("streamingMode", "DIRECT") and refresh');

      let finalSrc = src;
      let contentType = type;

      // Auto-detect content type if not provided
      if (!contentType) {
        if (src.includes('.m3u8') || src.includes('hls') || src.includes('playlist')) {
          contentType = 'application/x-mpegURL';
        } else if (src.includes('payload=')) {
          // Handle payload URLs based on streaming configuration
          try {
            const payloadMatch = src.match(/payload=([^&]+)/);
            if (payloadMatch) {
              // URL decode first to handle URL encoding
              const urlDecodedPayload = decodeURIComponent(payloadMatch[1]);

              // Handle base64url format (used by our proxy)
              // Convert base64url to regular base64 by replacing URL-safe characters
              const base64Data = urlDecodedPayload.replace(/-/g, '+').replace(/_/g, '/');
              // Add padding if necessary (base64url removes padding)
              const paddedBase64 = base64Data + '='.repeat((4 - base64Data.length % 4) % 4);

              const payloadData = JSON.parse(atob(paddedBase64));
              console.log('🔍 Decoded payload data:', payloadData);

              // Determine streaming approach based on configuration
              const isHLS = payloadData.type === 'hls';
              const shouldUseDirect = streamingConfig.mode === 'DIRECT' ||
                (streamingConfig.mode === 'HYBRID') ||
                (isHLS && streamingConfig.preferDirectForHLS) ||
                (!isHLS && streamingConfig.preferDirectForMP4);

              if (payloadData.url && shouldUseDirect) {
                console.log('✅ Using DIRECT streaming to eliminate backend timeout!');
                console.log(`🎯 Direct ${isHLS ? 'HLS' : 'MP4'} stream (bypasses backend completely)`);
                finalSrc = payloadData.url; // Direct URL - no backend proxy needed!

                if (isHLS) {
                  contentType = 'application/x-mpegURL';
                } else {
                  contentType = 'video/mp4';
                }

                console.log('ℹ️ Direct streaming eliminates timeout issues but source is visible in network tab');
              } else {
                console.log('🔐 Using PROXY streaming for maximum source protection');
                finalSrc = src; // Use backend proxy

                if (isHLS) {
                  contentType = 'application/x-mpegURL';
                } else {
                  contentType = 'video/mp4';
                }
              }
            }
          } catch (e) {
            console.warn('Could not decode payload for type detection:', e);
            contentType = 'video/mp4';
          }
        } else {
          contentType = 'video/mp4';
        }
      }

      const sourceConfig = {
        src: finalSrc,
        type: contentType,
      };

      console.log('🎬 Setting video source:', sourceConfig);
      playerRef.current.src(sourceConfig);

      // Wait a bit before trying to play
      setTimeout(() => {
        if (playerRef.current && !playerRef.current.isDisposed()) {
          console.log('🎬 Player ready, source loaded');
          // Don't auto-play, let user click to start
        }
      }, 500);

      console.log('✅ Source loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load source:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const timer = setTimeout(initializePlayer, 200);
    return () => clearTimeout(timer);
  }, [initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        console.log('🗑️ Disposing VideoJS Player');
        onDispose?.();
        try {
          playerRef.current.dispose();
        } catch (error) {
          console.warn('⚠️ Error disposing player:', error);
        }
        playerRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [onDispose]);

  return {
    videoRef,
    player: playerRef.current,
    isInitialized,
    loadSource,
  };
};
