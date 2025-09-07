// Icons configuration using Hugeicons
import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlayIcon,
  PauseIcon,
  GoBackward10SecIcon,
  GoForward10SecIcon,
  VolumeLowIcon,
  VolumeHighIcon,
  VolumeOffIcon,
  SubtitleIcon,
  Settings02Icon,
  PictureInPictureOnIcon,
  FullScreenIcon,
  SquareArrowShrink02Icon,
  ArrowLeft02Icon,
  Cancel01Icon,
  Home01Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
  Film01Icon,
  Tv01Icon,
  Search01Icon,
  Calendar03Icon,
  Clock01Icon,
  FavouriteIcon,
  Download01Icon,
  Share08Icon,
  Bookmark01Icon,
  InformationCircleIcon,
  Loading02Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  CloudIcon,
} from '@hugeicons/core-free-icons';

// Common icon props type for Hugeicons
export interface HugeIconProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

// Export all icons we use in the video player with Hugeicons wrapper
export const Icons = {
  // Navigation icons
  ArrowLeft: (props: HugeIconProps) => <HugeiconsIcon icon={ArrowLeft02Icon} {...props} />,
  X: (props: HugeIconProps) => <HugeiconsIcon icon={Cancel01Icon} {...props} />,
  Home: (props: HugeIconProps) => <HugeiconsIcon icon={Home01Icon} {...props} />,
  ExternalLink: (props: HugeIconProps) => <HugeiconsIcon icon={Share08Icon} {...props} />,

  // Playback controls
  Play: (props: HugeIconProps) => <HugeiconsIcon icon={PlayIcon} {...props} />,
  Pause: (props: HugeIconProps) => <HugeiconsIcon icon={PauseIcon} {...props} />,
  PlayCircle: (props: HugeIconProps) => <HugeiconsIcon icon={PlayIcon} {...props} />,
  PauseCircle: (props: HugeIconProps) => <HugeiconsIcon icon={PauseIcon} {...props} />,
  SkipBack: (props: HugeIconProps) => <HugeiconsIcon icon={GoBackward10SecIcon} {...props} />,
  SkipForward: (props: HugeIconProps) => <HugeiconsIcon icon={GoForward10SecIcon} {...props} />,

  // Volume controls
  Volume: (props: HugeIconProps) => <HugeiconsIcon icon={VolumeHighIcon} {...props} />,
  Volume1: (props: HugeIconProps) => <HugeiconsIcon icon={VolumeLowIcon} {...props} />,
  Volume2: (props: HugeIconProps) => <HugeiconsIcon icon={VolumeHighIcon} {...props} />,
  VolumeOff: (props: HugeIconProps) => <HugeiconsIcon icon={VolumeOffIcon} {...props} />,
  VolumeX: (props: HugeIconProps) => <HugeiconsIcon icon={VolumeOffIcon} {...props} />,

  // Player controls
  Settings: (props: HugeIconProps) => <HugeiconsIcon icon={Settings02Icon} {...props} />,
  PictureInPicture: (props: HugeIconProps) => <HugeiconsIcon icon={PictureInPictureOnIcon} {...props} />,
  Maximize: (props: HugeIconProps) => <HugeiconsIcon icon={FullScreenIcon} {...props} />,
  Minimize: (props: HugeIconProps) => <HugeiconsIcon icon={SquareArrowShrink02Icon} {...props} />,
  Fullscreen: (props: HugeIconProps) => <HugeiconsIcon icon={FullScreenIcon} {...props} />,
  Server: (props: HugeIconProps) => <HugeiconsIcon icon={CloudIcon} {...props} />,
  Captions: (props: HugeIconProps) => <HugeiconsIcon icon={SubtitleIcon} {...props} />,
  ChevronDown: (props: HugeIconProps) => <HugeiconsIcon icon={ArrowDown01Icon} {...props} />,
  MoreHorizontal: (props: HugeIconProps) => <HugeiconsIcon icon={MoreHorizontalIcon} {...props} />,

  // Media types
  Film: (props: HugeIconProps) => <HugeiconsIcon icon={Film01Icon} {...props} />,
  Tv: (props: HugeIconProps) => <HugeiconsIcon icon={Tv01Icon} {...props} />,

  // UI elements
  Search: (props: HugeIconProps) => <HugeiconsIcon icon={Search01Icon} {...props} />,
  Calendar: (props: HugeIconProps) => <HugeiconsIcon icon={Calendar03Icon} {...props} />,
  Clock: (props: HugeIconProps) => <HugeiconsIcon icon={Clock01Icon} {...props} />,
  Star: (props: HugeIconProps) => <HugeiconsIcon icon={FavouriteIcon} {...props} />,
  Download: (props: HugeIconProps) => <HugeiconsIcon icon={Download01Icon} {...props} />,
  Share: (props: HugeIconProps) => <HugeiconsIcon icon={Share08Icon} {...props} />,
  Bookmark: (props: HugeIconProps) => <HugeiconsIcon icon={Bookmark01Icon} {...props} />,
  Info: (props: HugeIconProps) => <HugeiconsIcon icon={InformationCircleIcon} {...props} />,

  // Status icons
  Loader: (props: HugeIconProps) => <HugeiconsIcon icon={Loading02Icon} {...props} />,
  AlertCircle: (props: HugeIconProps) => <HugeiconsIcon icon={AlertCircleIcon} {...props} />,
  CheckCircle: (props: HugeIconProps) => <HugeiconsIcon icon={CheckmarkCircle01Icon} {...props} />,
} as const;

// Icon sizes configuration
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// Helper function to get icon size
export const getIconSize = (size: keyof typeof IconSizes | number = 'md'): number => {
  return typeof size === 'number' ? size : IconSizes[size];
};

// Custom wrapper component for consistent icon styling with Hugeicons
export const Icon: React.FC<HugeIconProps & { icon: keyof typeof Icons }> = ({
  icon,
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.5,
  ...props
}) => {
  const IconComponent = Icons[icon];

  return (
    <IconComponent
      size={typeof size === 'number' ? size : getIconSize(size)}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};
