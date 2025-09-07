import { useState, useCallback, useRef, useEffect } from 'react';

export interface BufferRange {
  start: number;
  end: number;
}

export interface BufferState {
  ranges: BufferRange[];
  health: number; // Seconds of buffer ahead
  isBuffering: boolean;
  totalBuffered: number; // Total seconds buffered
  bufferPercentage: number; // Percentage of video buffered
  isReadyToPlay: boolean; // Has at least 10 seconds buffered
}

export const useVideoBuffer = (player: any, onReadyToPlay?: (ready: boolean) => void) => {
  const [bufferState, setBufferState] = useState<BufferState>({
    ranges: [],
    health: 0,
    isBuffering: false,
    totalBuffered: 0,
    bufferPercentage: 0,
    isReadyToPlay: false,
  });

  const lastSeekTimeRef = useRef<number | null>(null);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef(player); // Keep stable reference

  // Update player ref when it changes
  useEffect(() => {
    playerRef.current = player;
    console.log('🎮 useVideoBuffer - Player reference updated:', !!player);
  }, [player]);

  // Update buffer ranges from video element
  const updateBufferRanges = useCallback((currentTime: number) => {
    console.log(`🔍 updateBufferRanges called with currentTime: ${currentTime.toFixed(2)}s`);

    const currentPlayer = playerRef.current; // Use ref instead of closure
    console.log('🎮 Player status:', !!currentPlayer, currentPlayer ? 'ready' : 'not ready');

    if (!currentPlayer) {
      console.log('❌ No player available - using playerRef');
      return;
    }

    try {
      // Get the video element directly from the player
      const videoElement = currentPlayer.el()?.querySelector('video');
      console.log('🎬 VideoElement found:', !!videoElement);

      if (!videoElement) {
        console.log('❌ No video element found');
        return;
      }

      // Check if video element has buffered data
      const buffered = videoElement.buffered;
      const duration = videoElement.duration;

      console.log(`📊 Video element - buffered: ${!!buffered}, duration: ${duration}, buffered.length: ${buffered?.length || 0}`);

      if (!buffered || !duration || isNaN(duration)) {
        console.log('❌ No buffered data or invalid duration');
        return;
      }

      const ranges: BufferRange[] = [];

      // Extract buffer ranges with detailed logging
      for (let i = 0; i < buffered.length; i++) {
        try {
          const start = buffered.start(i);
          const end = buffered.end(i);

          // Only include buffer ranges that are ahead of current playback time
          // This prevents showing buffer bars for already-played content
          if (end > currentTime) {
            // Adjust start time to not show buffer for already-played content
            const adjustedStart = Math.max(start, currentTime);
            ranges.push({ start: adjustedStart, end });
            console.log(`📏 Buffer range ${i} (ahead): ${adjustedStart.toFixed(2)}s - ${end.toFixed(2)}s (original: ${start.toFixed(2)}s - ${end.toFixed(2)}s)`);
          } else {
            console.log(`🚫 Skipping buffer range ${i} (already played): ${start.toFixed(2)}s - ${end.toFixed(2)}s`);
          }
        } catch (rangeError) {
          console.warn(`⚠️ Error reading buffer range ${i}:`, rangeError);
        }
      }

      // Calculate buffer health (seconds ahead of current position)
      let bufferHealth = 0;
      let totalBuffered = 0;

      for (const range of ranges) {
        totalBuffered += range.end - range.start;
        if (range.start <= currentTime && range.end > currentTime) {
          bufferHealth = range.end - currentTime;
        }
      }

      // Calculate buffer percentage
      const bufferPercentage = duration > 0 ? (totalBuffered / duration) * 100 : 0;

      // Check if ready to play (more reasonable threshold: 3 seconds OR can play through)
      const isReadyToPlay = bufferHealth >= 3; // Reduced from 10 to 3 seconds      // Log buffer info for debugging
      console.log(`🎯 Buffer Analysis: ${ranges.length} ranges, ${bufferHealth.toFixed(1)}s ahead, ${totalBuffered.toFixed(1)}s total, ${bufferPercentage.toFixed(1)}% buffered, ready: ${isReadyToPlay}`);

      setBufferState(prev => {
        // Improved buffering logic - only show buffering if buffer is critically low
        const shouldBuffer = bufferHealth < 3; // Simplified for now

        const newState = {
          ...prev,
          ranges,
          health: bufferHealth,
          totalBuffered,
          bufferPercentage,
          isReadyToPlay,
          isBuffering: shouldBuffer,
        };

        // Notify when ready state changes
        if (prev.isReadyToPlay !== isReadyToPlay && onReadyToPlay) {
          onReadyToPlay(isReadyToPlay);
        }

        console.log(`📊 Setting buffer state: ${ranges.length} ranges, health: ${bufferHealth.toFixed(1)}s, ready: ${isReadyToPlay}`);
        return newState;
      });
    } catch (error) {
      console.warn('⚠️ Buffer range update error:', error);
    }
  }, []); // Remove player dependency to prevent stale closures

  // Check if currently seeking
  const isSeeking = useCallback(() => {
    return lastSeekTimeRef.current && Date.now() - lastSeekTimeRef.current < 2000;
  }, []);

  // Mark seeking time for buffering detection
  const markSeekTime = useCallback(() => {
    lastSeekTimeRef.current = Date.now();
  }, []);

  // Debug player availability changes
  useEffect(() => {
    console.log('🎮 useVideoBuffer - Player changed:', !!player);
    if (player) {
      console.log('✅ Player is now available in useVideoBuffer');
      // Try to update buffer ranges immediately if we have time info
      if (player.currentTime && typeof player.currentTime === 'function') {
        const currentTime = player.currentTime();
        console.log(`🔄 Player available, trying immediate buffer update with time: ${currentTime}`);
        // Small delay to ensure VideoJS is fully ready
        setTimeout(() => {
          updateBufferRanges(currentTime);
        }, 100);
      }
    } else {
      console.log('❌ Player is not available in useVideoBuffer');
    }
  }, [player]); // Keep updateBufferRanges out of dependencies

  // Set buffering state with debouncing to prevent flicker
  const setBuffering = useCallback((isBuffering: boolean) => {
    // Clear any existing timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }

    if (isBuffering) {
      // Show buffering immediately when needed
      setBufferState(prev => ({
        ...prev,
        isBuffering: true,
      }));
    } else {
      // Delay hiding buffering to prevent flicker
      bufferingTimeoutRef.current = setTimeout(() => {
        setBufferState(prev => ({
          ...prev,
          isBuffering: false,
        }));
      }, 300); // 300ms delay before hiding buffering
    }
  }, []);

  return {
    bufferState,
    updateBufferRanges,
    setBuffering,
    markSeekTime,
    isSeeking,
  };
};
