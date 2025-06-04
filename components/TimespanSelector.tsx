
import React from 'react';
import { Timespan } from '../types';
import { TIMESPAN_OPTIONS } from '../constants';

interface TimespanSelectorProps {
  selectedTimespan: Timespan;
  onSelectTimespan: (timespan: Timespan) => void;
}

export const TimespanSelector: React.FC<TimespanSelectorProps> = ({ selectedTimespan, onSelectTimespan }) => {
  return (
    <div className="flex justify-center space-x-2 sm:space-x-3 my-4">
      {TIMESPAN_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onSelectTimespan(option.value)}
          className={`px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md font-medium transition-all duration-150 ease-in-out
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
