import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import '@videojs/http-streaming'; // Import VHS plugin
import 'video.js/dist/video-js.css';

const BasicVideoTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Use setTimeout to ensure DOM is fully mounted
    const timer = setTimeout(() => {
      if (videoRef.current && !playerRef.current) {
        console.log('🎬 Initializing Video.js after DOM mount...');
        console.log('🎬 Video element:', videoRef.current);
        console.log('🎬 Element in DOM:', document.contains(videoRef.current));

        try {
          // Initialize Video.js with explicit dimensions
          const player = videojs(videoRef.current, {
            controls: true,
            fluid: false,
            responsive: false,
            width: 640,
            height: 360,
            preload: 'auto',
            sources: [
              {
                src: 'https://vjs.zencdn.net/v/oceans.mp4',
                type: 'video/mp4',
              },
            ],
          });

          console.log('🎬 Video.js player created:', player);
          playerRef.current = player;

          player.ready(() => {
            console.log('✅ Video.js initialized successfully!');
            console.log('✅ Controls enabled:', player.controls());
            console.log('✅ Player element:', player.el());
            console.log('✅ Player dimensions:', {
              width: player.currentWidth(),
              height: player.currentHeight(),
            });
            setIsReady(true);
          });

          player.on('error', (error: any) => {
            console.error('❌ Video.js error:', error);
          });
        } catch (error) {
          console.error('❌ Failed to initialize Video.js:', error);
        }
      }
    }, 100); // Small delay to ensure DOM mounting

    return () => {
      clearTimeout(timer);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        console.log('🗑️ Disposing Video.js player');
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', border: '2px solid #ccc' }}>
      <h3>Video.js Test - Fixed DOM Mounting</h3>
      <p>Status: {isReady ? '✅ Ready' : '⏳ Loading...'}</p>

      <div
        data-vjs-player
        style={{
          border: '2px solid blue',
          width: '640px',
          height: '360px',
          display: 'block',
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          controls
          preload="auto"
          width="640"
          height="360"
          data-setup="{}"
          style={{
            display: 'block',
            backgroundColor: '#000',
            width: '640px',
            height: '360px',
          }}
        >
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5
            video.
          </p>
        </video>
      </div>
    </div>
  );
};

export default BasicVideoTest;
