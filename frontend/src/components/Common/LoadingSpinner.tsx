import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="teams-loading">
      <div className={`teams-spinner ${sizeClasses[size]}`}>
        <div className="teams-spinner-circle"></div>
      </div>
      {message && <span className="teams-loading-text">{message}</span>}
    </div>
  );
};
