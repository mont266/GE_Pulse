
import React, { useState, useEffect } from 'react';
import { ChangelogEntry } from '../types';
import { ChevronDownIcon } from '../../components/Icons'; // Corrected path

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ChangelogEntry[];
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, entries }) => {
  const [expandedEntries, setExpandedEntries] = useState<string[]>(() =>
    entries.length > 0 ? [entries[0].version] : []
  );

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Ensure expanded state is valid and default to latest if needed
      setExpandedEntries(currentExpanded => {
        const validExpanded = currentExpanded.filter(version =>
          entries.some(entry => entry.version === version)
        );
        if (validExpanded.length === 0 && entries.length > 0) {
          return [entries[0].version];
        }
        return validExpanded;
      });
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, entries, onClose]); // Added onClose to dependencies

  if (!isOpen) {
    return null;
  }

  const toggleEntry = (version: string) => {
    setExpandedEntries(prevExpanded =>
      prevExpanded.includes(version)
        ? prevExpanded.filter(v => v !== version)
        : [...prevExpanded, version]
    );
  };

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
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--border-primary)]">
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

        <div className="space-y-1 overflow-y-auto pr-2 flex-grow">
          {entries.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No changelog entries available.</p>
          ) : (
            entries.map((entry, index) => {
              const isExpanded = expandedEntries.includes(entry.version);
              return (
                <div key={entry.version} className={`py-1 ${index < entries.length -1 ? 'border-b border-[var(--border-primary)]' : ''}`}>
                  <button
                    onClick={() => toggleEntry(entry.version)}
                    className="w-full flex items-center justify-between py-3 px-2 rounded-md hover:bg-[var(--bg-input-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-modal)] transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`changelog-details-${entry.version}`}
                  >
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-[var(--text-accent)]">{entry.version}</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-[var(--text-secondary)] transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div 
                      id={`changelog-details-${entry.version}`} 
                      className="pt-2 pb-3 pl-4 pr-2 text-sm space-y-2"
                      role="region"
                    >
                      <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)]">
                        {entry.changes.map((change, idx) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                      {entry.notes && (
                        <p className="mt-2 text-sm italic text-[var(--text-secondary)] bg-[var(--bg-input-secondary)] p-2 rounded-md">{entry.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="mt-6 pt-4 border-t border-[var(--border-primary)] text-right">
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
