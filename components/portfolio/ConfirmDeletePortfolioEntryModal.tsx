
import React, { useEffect } from 'react';
import { PortfolioEntry } from '../../src/types';

interface ConfirmDeletePortfolioEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToDelete: PortfolioEntry | null;
  onConfirmDelete: (entryId: string) => void;
  getItemIconUrl: (iconName: string) => string;
  getItemName: (itemId: number) => string;
}

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
};

export const ConfirmDeletePortfolioEntryModal: React.FC<ConfirmDeletePortfolioEntryModalProps> = ({
  isOpen,
  onClose,
  entryToDelete,
  onConfirmDelete,
  getItemIconUrl,
  getItemName,
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

  if (!isOpen || !entryToDelete) {
    return null;
  }

  const itemName = getItemName(entryToDelete.itemId);
  const itemIcon = getItemIconUrl(entryToDelete.itemId.toString()); // Assuming icon mapping uses ID or can be derived

  const handleConfirm = () => {
    onConfirmDelete(entryToDelete.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[90] p-4" // Higher z-index than PortfolioModal
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-portfolio-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="confirm-delete-portfolio-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Confirm Deletion
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

        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Are you sure you want to permanently delete this investment lot? This action cannot be undone.
        </p>

        <div className="mb-6 p-3 bg-[var(--bg-input-secondary)] rounded-md space-y-1">
          <div className="flex items-center">
            <img 
              loading="lazy"
              src={getItemIconUrl(entryToDelete.itemId.toString())} // Assuming getItemIconUrl needs string ID or find item first for icon string
              alt={itemName} 
              className="w-8 h-8 mr-3 object-contain flex-shrink-0"
            />
            <span className="font-medium text-[var(--text-primary)]">{itemName}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Quantity Purchased: {entryToDelete.quantityPurchased.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Purchase Price: {entryToDelete.purchasePricePerItem.toLocaleString()} GP each
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Purchase Date: {formatDate(entryToDelete.purchaseDate)}
          </p>
        </div>

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
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};