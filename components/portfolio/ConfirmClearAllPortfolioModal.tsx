
import React, { useEffect } from 'react';

interface ConfirmClearAllPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearAll: () => void;
}

export const ConfirmClearAllPortfolioModal: React.FC<ConfirmClearAllPortfolioModalProps> = ({
  isOpen,
  onClose,
  onConfirmClearAll,
}) => {
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

  const handleConfirm = () => {
    onConfirmClearAll(); // This will call clearAllPortfolioData which now includes notification
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" // Higher z-index than PortfolioModal
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-clear-all-portfolio-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="confirm-clear-all-portfolio-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Confirm Clear All Data
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close confirmation modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Are you sure you want to permanently delete <strong className="text-[var(--price-low)]">ALL</strong> portfolio data? 
          This action will remove all your investments and sales records and cannot be undone.
        </p>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-[var(--error-bg)] hover:bg-[var(--error-bg)]/80 text-[var(--error-text)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--error-text)]/70"
          >
            Yes, Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
