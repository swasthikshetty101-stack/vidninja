import React from 'react';

interface BufferingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BufferingIndicator: React.FC<BufferingIndicatorProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-white/30 border-t-white rounded-full animate-spin`} />
    </div>
  );
};
