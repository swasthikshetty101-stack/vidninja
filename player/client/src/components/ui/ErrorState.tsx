import React from 'react';

interface ErrorStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
    };
    secondary?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message, icon, actions, className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center text-white p-8 max-w-md">
        {icon && <div className="flex justify-center mb-4">{icon}</div>}

        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-gray-300 mb-6">{message}</p>

        {actions && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {actions.primary && (
              <button
                onClick={actions.primary.onClick}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {actions.primary.label}
              </button>
            )}
            {actions.secondary && (
              <button
                onClick={actions.secondary.onClick}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {actions.secondary.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
