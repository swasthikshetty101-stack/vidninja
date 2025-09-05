import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import '@videojs/http-streaming';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  headers?: Record<string, string>;
  onStateChange?: (state: any) => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, onStateChange, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Video.js player with better DOM checks
  useEffect(() => {
    // Ensure we only initialize once
    if (isInitialized || playerRef.current) {
      return;
    }

    // Wait for DOM to be fully ready
    const initializePlayer = () => {
      if (!videoRef.current || !containerRef.current) {
        console.log('🚫 DOM elements not ready');
        return;
      }

      // Verify element is in DOM
      if (!document.contains(videoRef.current)) {
        console.log('🚫 Element not in DOM, retrying...');
        setTimeout(initializePlayer, 100);
        return;
      }

      console.log('🎬 Initializing VideoPlayer...');
      setIsInitialized(true);

      try {
        const player = videojs(videoRef.current, {
          controls: true,
          fluid: false,
          responsive: false,
          width: '100%',
          height: '100%',
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

        playerRef.current = player;

        player.ready(() => {
          console.log('✅ VideoPlayer ready');
          console.log('✅ Controls enabled:', player.controls());
          setIsReady(true);
        });

        // Event handlers
        player.on('play', () => {
          console.log('▶️ Playing');
          onStateChange?.({ isPlaying: true });
        });

        player.on('pause', () => {
          console.log('⏸️ Paused');
          onStateChange?.({ isPlaying: false });
        });

        player.on('timeupdate', () => {
          if (player && !player.isDisposed()) {
            onStateChange?.({
              currentTime: player.currentTime(),
              duration: player.duration(),
            });
          }
        });

        player.on('volumechange', () => {
          if (player && !player.isDisposed()) {
            onStateChange?.({ volume: player.volume() });
          }
        });

        player.on('loadstart', () => {
          console.log('📡 Loading started');
          onStateChange?.({ isLoading: true });
        });

        player.on('canplay', () => {
          console.log('▶️ Can play - attempting autoplay');
          onStateChange?.({ isLoading: false });

          // Attempt autoplay when stream is ready
          if (src && player && !player.isDisposed()) {
            if (player) {
              player.play().catch((error: any) => {
                console.log('🔇 Autoplay prevented by browser (this is normal):', error);
                console.log('👆 User needs to click play button to start playback');
              });
            }
          }
        });

        player.on('loadeddata', () => {
          console.log('📊 Data loaded - stream is ready');

          // Additional autoplay attempt when data is loaded
          if (src && player && !player.isDisposed() && player.readyState() >= 2) {
            setTimeout(() => {
              if (player && !player.isDisposed()) {
                player.play().catch((error: any) => {
                  console.log('🔇 Autoplay prevented (normal browser behavior):', error);
                });
              }
            }, 500);
          }
        });

        player.on('error', (error: any) => {
          console.error('❌ VideoPlayer error:', error);
        });

        // If we already have a source, load it
        if (src) {
          setTimeout(() => {
            loadSource(src);
          }, 500);
        }
      } catch (error) {
        console.error('❌ Failed to initialize VideoPlayer:', error);
        setIsInitialized(false);
      }
    };

    // Start initialization after a small delay
    setTimeout(initializePlayer, 200);

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        console.log('🗑️ Disposing VideoPlayer');
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setIsInitialized(false);
      setIsReady(false);
    };
  }, []); // Only run once

  // Helper function to load source
  const loadSource = (sourceUrl: string) => {
    if (!playerRef.current || playerRef.current.isDisposed()) {
      console.log('🚫 Player not ready for source loading');
      return;
    }

    console.log('� Loading new source:', sourceUrl);

    try {
      const isHLS = sourceUrl.includes('.m3u8') || sourceUrl.includes('m3u8-proxy');
      console.log('🎯 Setting source:', { sourceUrl, isHLS, type: isHLS ? 'application/x-mpegURL' : 'video/mp4' });

      // Reset player first
      playerRef.current.reset();

      playerRef.current.src({
        src: sourceUrl,
        type: isHLS ? 'application/x-mpegURL' : 'video/mp4',
      });

      console.log('📡 Source set, now loading...');
      playerRef.current.load();

      // Attempt autoplay after source loads
      setTimeout(() => {
        if (playerRef.current && !playerRef.current.isDisposed()) {
          console.log('🎬 Attempting autoplay for new source...');
          playerRef.current.play().catch((error: any) => {
            console.log('🔇 Autoplay prevented for new source:', error);
          });
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error loading source:', error);
    }
  };

  // Update source when it changes - use helper function
  useEffect(() => {
    console.log('🔍 Source effect triggered:', { src, isReady, isInitialized });

    if (src && isReady && playerRef.current) {
      // Small delay to ensure player is fully ready
      setTimeout(() => {
        loadSource(src);
      }, 100);
    } else {
      console.log('� Not ready to load source:', {
        hasSrc: !!src,
        isReady,
        isInitialized,
        hasPlayer: !!playerRef.current,
      });
    }
  }, [src, isReady]); // Depend on both src and isReady

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        data-vjs-player
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          controls
          preload="auto"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
          data-setup="{}"
        >
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5
            video.
          </p>
        </video>
      </div>

      {!isReady && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '14px',
          }}
        >
          ⏳ Initializing player...
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
