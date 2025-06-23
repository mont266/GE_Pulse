
import React, { useEffect } from 'react';
import { PrivacyPolicyContent } from './PrivacyPolicyContent'; // Separate content component

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-2xl text-[var(--text-primary)] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-primary)]">
          <h2 id="privacy-policy-modal-title" className="text-2xl font-semibold text-[var(--text-accent)]">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close privacy policy"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto pr-2 flex-grow text-sm leading-relaxed">
          <PrivacyPolicyContent />
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-primary)] text-right">
            <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-md bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                aria-label="Close privacy policy"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
