import { useState, useCallback, useRef } from 'react';

export interface VideoControlsState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    showControls: boolean;
    isBuffering: boolean;
    bufferHealth: number;
}

export interface VideoControlsActions {
    play: () => void;
    pause: () => void;
    togglePlayPause: () => void;
    seek: (time: number) => void;
    seekRelative: (seconds: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    showControls: () => void;
    hideControls: () => void;
    setControlsVisibility: (visible: boolean) => void;
    resetControlsTimer: () => void;
}

export interface UseVideoControlsReturn {
    state: VideoControlsState;
    actions: VideoControlsActions;
    updateState: (updates: Partial<VideoControlsState>) => void;
}

export const useVideoControls = (
    player: any,
    containerRef?: React.RefObject<HTMLElement>
): UseVideoControlsReturn => {
    const [state, setState] = useState<VideoControlsState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        isFullscreen: false,
        showControls: true,
        isBuffering: false,
        bufferHealth: 0,
    });

    const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

    // Update state
    const updateState = useCallback((updates: Partial<VideoControlsState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Auto-hide controls
    const resetHideControlsTimer = useCallback(() => {
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }
        setState(prev => ({ ...prev, showControls: true }));

        hideControlsTimeoutRef.current = setTimeout(() => {
            setState(prev => {
                if (prev.isPlaying) {
                    return { ...prev, showControls: false };
                }
                return prev;
            });
        }, 3000);
    }, []);

    // Player actions
    const play = useCallback(() => {
        if (player && !player.isDisposed()) {
            player.play();
        }
    }, [player]);

    const pause = useCallback(() => {
        if (player && !player.isDisposed()) {
            player.pause();
        }
    }, [player]);

    const togglePlayPause = useCallback(() => {
        if (state.isPlaying) {
            pause();
        } else {
            play();
        }
    }, [state.isPlaying, play, pause]);

    const seek = useCallback((time: number) => {
        if (player && !player.isDisposed()) {
            const clampedTime = Math.max(0, Math.min(state.duration, time));
            player.currentTime(clampedTime);
        }
    }, [player, state.duration]);

    const seekRelative = useCallback((seconds: number) => {
        seek(state.currentTime + seconds);
    }, [seek, state.currentTime]);

    const setVolume = useCallback((volume: number) => {
        if (player && !player.isDisposed()) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            player.volume(clampedVolume);
            if (clampedVolume > 0) {
                player.muted(false);
            }
        }
    }, [player]);

    const toggleMute = useCallback(() => {
        if (player && !player.isDisposed()) {
            player.muted(!state.isMuted);
        }
    }, [player, state.isMuted]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef?.current) return;

        if (state.isFullscreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        } else {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        }
    }, [state.isFullscreen, containerRef]);

    const showControls = useCallback(() => {
        setState(prev => ({ ...prev, showControls: true }));
    }, []);

    const hideControls = useCallback(() => {
        setState(prev => ({ ...prev, showControls: false }));
    }, []);

    const setControlsVisibility = useCallback((visible: boolean) => {
        setState(prev => ({ ...prev, showControls: visible }));
    }, []);

    const actions: VideoControlsActions = {
        play,
        pause,
        togglePlayPause,
        seek,
        seekRelative,
        setVolume,
        toggleMute,
        toggleFullscreen,
        showControls,
        hideControls,
        setControlsVisibility,
        resetControlsTimer: resetHideControlsTimer,
    };

    return {
        state,
        actions,
        updateState,
    };
};
