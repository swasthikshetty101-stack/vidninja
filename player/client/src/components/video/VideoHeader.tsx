import React from 'react';
import { Icons } from '../icons';

interface VideoHeaderProps {
  title: string;
  year: string;
  onClose?: () => void;
  visible: boolean;
  className?: string;
}

export const VideoHeader: React.FC<VideoHeaderProps> = ({ title, year, onClose, visible, className = '' }) => {
  return (
    <div
      className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {onClose && (
            <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors" aria-label="Go back">
              <Icons.ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="text-white">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-gray-300">{year}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close player"
          >
            <Icons.X className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
