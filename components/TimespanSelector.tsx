
import React, { useState, useEffect, useCallback } from 'react';
import { Timespan } from '../types';
import { TIMESPAN_OPTIONS } from '../constants';

interface TimespanSelectorProps {
  selectedTimespan: Timespan;
  onSelectTimespan: (timespan: Timespan) => void;
}

const MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind

export const TimespanSelector: React.FC<TimespanSelectorProps> = ({ selectedTimespan, onSelectTimespan }) => {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const handleResize = useCallback(() => {
    setIsMobileView(window.innerWidth < MOBILE_BREAKPOINT);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  if (isMobileView) {
    return (
      <div className="my-4 w-full max-w-xs mx-auto">
        <div className="relative">
          <select
            value={selectedTimespan}
            onChange={(e) => onSelectTimespan(e.target.value as Timespan)}
            className="w-full appearance-none p-3 pr-10 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
          >
            {TIMESPAN_OPTIONS.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                // Note: Styling options directly is limited and browser-dependent.
                // Background/text on options usually inherit from select or browser defaults.
                // For truly custom option styling, a custom dropdown component would be needed.
                className="text-[var(--text-primary)] bg-[var(--bg-input)]" 
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-muted)]">
            <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center flex-wrap gap-2 sm:gap-3 my-4">
      {TIMESPAN_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onSelectTimespan(option.value)}
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-all duration-150 ease-in-out
            ${selectedTimespan === option.value 
              ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)] shadow-md hover:bg-[var(--bg-interactive-hover)]' 
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input-secondary)] focus:bg-[var(--bg-input-secondary)]'
            }
            focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-75`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};