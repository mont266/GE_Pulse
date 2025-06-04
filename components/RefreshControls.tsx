
import React from 'react';
import { AUTO_REFRESH_INTERVAL_SECONDS } from '../constants';

interface RefreshControlsProps {
  isAutoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  timeToNextRefresh: number;
  isLoading: boolean;
  isItemSelected: boolean;
}

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export const RefreshControls: React.FC<RefreshControlsProps> = ({
  isAutoRefreshEnabled,
  onToggleAutoRefresh,
  onManualRefresh,
  timeToNextRefresh,
  isLoading,
  isItemSelected,
}) => {
  if (!isItemSelected) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(1, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-[var(--bg-secondary-alpha)] rounded-lg mb-4">
      <div className="flex items-center space-x-3">
        <label htmlFor="autoRefreshToggle" className="flex items-center cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              id="autoRefreshToggle" 
              className="sr-only" 
              checked={isAutoRefreshEnabled} 
              onChange={onToggleAutoRefresh}
              disabled={!isItemSelected || isLoading}
            />
            <div className={`block w-12 h-6 rounded-full transition-colors bg-[${isAutoRefreshEnabled ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
            <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${isAutoRefreshEnabled ? 'translate-x-6' : ''}`}></div>
          </div>
          <span className="ml-3 text-sm font-medium text-[var(--text-secondary)]">Auto-Refresh</span>
        </label>
        {isAutoRefreshEnabled && (
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            Next in: {timeToNextRefresh > 0 && timeToNextRefresh <= AUTO_REFRESH_INTERVAL_SECONDS ? formatTime(timeToNextRefresh) : formatTime(AUTO_REFRESH_INTERVAL_SECONDS)}
          </span>
        )}
      </div>

      <button
        onClick={onManualRefresh}
        disabled={!isItemSelected || isLoading}
        className="flex items-center justify-center px-4 py-2 bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Refresh item data"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--text-on-interactive)]"></div>
        ) : (
          <RefreshIcon />
        )}
        <span className="ml-2">Refresh Now</span>
      </button>
    </div>
  );
};
