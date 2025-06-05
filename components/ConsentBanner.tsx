
import React from 'react';

interface ConsentBannerProps {
  onGrant: () => void;
  onDeny: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onGrant, onDeny }) => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] text-[var(--text-primary)] p-4 shadow-2xl z-[100] border-t-2 border-[var(--border-accent)]"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie Consent Banner"
    >
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl">
        <div className="text-sm space-y-1">
          <p className="font-semibold">Your Preferences Matter!</p>
          <p>
            We use local browser storage (similar to cookies) to remember your preferences like theme selection, 
            favorited items, price alerts, and display settings. This helps us enhance your experience on GE Pulse.
          </p>
          <p>Do you consent to us storing these preferences in your browser?</p>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <button
            onClick={onDeny}
            className="px-5 py-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
            aria-label="Decline to store preferences"
          >
            Decline
          </button>
          <button
            onClick={onGrant}
            className="px-5 py-2.5 rounded-md bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
            aria-label="Accept storing preferences"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};