import React, { useRef, useCallback } from 'react';

interface VideoProgressBarProps {
  currentTime: number;
  duration: number;
  bufferRanges?: Array<{ start: number; end: number }>;
  bufferHealth?: number;
  onSeek: (time: number) => void;
  visible: boolean;
  className?: string;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  currentTime,
  duration,
  bufferRanges = [],
  bufferHealth = 0,
  onSeek,
  visible,
  className = '',
}) => {
  const progressRef = useRef<HTMLDivElement>(null);

  // Debug logging - Enhanced to show actual buffer ranges
  React.useEffect(() => {
    console.log(
      `📊 ProgressBar props: currentTime=${currentTime.toFixed(2)}, duration=${duration.toFixed(2)}, bufferRanges=${bufferRanges.length}, bufferHealth=${bufferHealth.toFixed(2)}`,
    );
    if (bufferRanges.length > 0) {
      console.log('🎯 ProgressBar received buffer ranges:', bufferRanges);
      bufferRanges.forEach((range, i) => {
        console.log(`📏 ProgressBar range ${i}: ${range.start.toFixed(2)}s - ${range.end.toFixed(2)}s`);
      });
    } else {
      console.log('❌ ProgressBar received NO buffer ranges');
    }
  }, [currentTime, duration, bufferRanges.length, bufferHealth, bufferRanges]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || duration === 0) return;

      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      onSeek(Math.max(0, Math.min(duration, newTime)));
    },
    [duration, onSeek],
  );

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <div className={`px-4 pb-2 ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Progress Track */}
        <div
          ref={progressRef}
          className="group relative h-1 bg-gray-700/80 cursor-pointer hover:h-2 transition-all duration-200 flex-1"
          onClick={handleSeek}
        >
          {/* Buffer ranges - Clean YouTube-style bars without rounded corners */}
          {bufferRanges.map((range, index) => {
            const startPercent = duration > 0 ? (range.start / duration) * 100 : 0;
            const widthPercent = duration > 0 ? ((range.end - range.start) / duration) * 100 : 0;

            console.log(
              `🎨 Rendering buffer bar ${index}: ${startPercent.toFixed(1)}% to ${(startPercent + widthPercent).toFixed(1)}%`,
            );

            return (
              <div
                key={index}
                className="absolute top-0 h-full bg-white/60"
                style={{
                  left: `${Math.max(0, Math.min(100, startPercent))}%`,
                  width: `${Math.max(0, Math.min(100 - startPercent, widthPercent))}%`,
                  zIndex: 5,
                }}
              />
            );
          })}

          {/* Current progress - Clean rectangular bar */}
          <div
            className="absolute top-0 left-0 h-full bg-red-600"
            style={{
              width: `${progressPercent}%`,
              zIndex: 6,
            }}
          />

          {/* Progress handle - Only visible on hover */}
          <div
            className="absolute top-1/2 w-3 h-3 bg-red-600 rounded-full transform -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border-2 border-white"
            style={{
              left: `${progressPercent}%`,
              zIndex: 7,
            }}
          />

          {/* Buffer health tooltip */}
          {bufferHealth > 0 && (
            <div
              className="absolute -top-8 text-xs text-gray-300 bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
            >
              +{Math.round(bufferHealth)}s buffered
            </div>
          )}
        </div>

        {/* Time display */}
        <div className="text-white text-sm font-mono min-w-max">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
