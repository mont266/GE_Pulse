import React, { useEffect } from 'react';
import { ChangelogEntry } from '../types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ChangelogEntry[];
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, entries }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" // z-index higher than settings modal if opened from there
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-lg text-[var(--text-primary)] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="changelog-modal-title" className="text-2xl font-semibold text-[var(--text-accent)]">Application Changelog</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close changelog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 flex-grow">
          {entries.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No changelog entries available.</p>
          ) : (
            entries.map((entry, index) => (
              <div key={entry.version} className={`py-4 ${index < entries.length -1 ? 'border-b border-[var(--border-primary)]' : ''}`}>
                <h3 className="text-xl font-semibold text-[var(--text-accent)]">{entry.version}</h3>
                <p className="text-xs text-[var(--text-muted)] mb-2">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)] text-sm pl-2">
                  {entry.changes.map((change, idx) => (
                    <li key={idx}>{change}</li>
                  ))}
                </ul>
                {entry.notes && (
                  <p className="mt-3 text-sm italic text-[var(--text-secondary)] bg-[var(--bg-input-secondary)] p-2 rounded-md">{entry.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-6 text-right">
            <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-md bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                aria-label="Close changelog"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
