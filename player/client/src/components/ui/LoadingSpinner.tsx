import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 200, className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        width={size}
        height={size}
        style={{ transformOrigin: 'center' }} // Fixed: moved to style prop
      >
        <defs>
          <radialGradient id="spinner-gradient" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".3" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset=".6" stopColor="#FFFFFF" stopOpacity=".6" />
            <stop offset=".8" stopColor="#FFFFFF" stopOpacity=".3" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          fill="none"
          stroke="url(#spinner-gradient)"
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray="200 1000"
          strokeDashoffset="0"
          cx="100"
          cy="100"
          r="70"
          style={{ transformOrigin: 'center' }} // Fixed: moved to style prop
        >
          <animateTransform
            type="rotate"
            attributeName="transform"
            calcMode="spline"
            dur="2"
            values="360;0"
            keyTimes="0;1"
            keySplines="0 0 1 1"
            repeatCount="indefinite"
          />
        </circle>

        <circle
          fill="none"
          opacity=".2"
          stroke="#FFFFFF"
          strokeWidth="15"
          strokeLinecap="round"
          cx="100"
          cy="100"
          r="70"
          style={{ transformOrigin: 'center' }} // Fixed: moved to style prop
        />
      </svg>
    </div>
  );
};
