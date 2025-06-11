
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioEntry, ItemMapInfo, PortfolioEntryUpdate } from '../../src/types';
import { ITEM_IMAGE_BASE_URL } from '../../constants';

// Helper: Parse shorthand (e.g., 100k, 2.5m) - suitable for both price and quantity
const parseShorthandValue = (value: string): number | null => {
  const cleanedValue = value.trim().toLowerCase();
  if (!cleanedValue) return null;
  let multiplier = 1;
  let numericPartStr = cleanedValue;

  if (cleanedValue.endsWith('k')) {
    multiplier = 1000;
    numericPartStr = cleanedValue.slice(0, -1);
  } else if (cleanedValue.endsWith('m')) {
    multiplier = 1000000;
    numericPartStr = cleanedValue.slice(0, -1);
  } else if (cleanedValue.endsWith('b')) {
    multiplier = 1000000000;
    numericPartStr = cleanedValue.slice(0, -1);
  }
  
  if (numericPartStr === '' || isNaN(parseFloat(numericPartStr))) {
     if (cleanedValue.match(/^[0-9.]+$/)) { 
        const num = parseFloat(cleanedValue);
        return !isNaN(num) && num > 0 ? Math.floor(num) : null;
    }
    return null;
  }
  const numericValue = parseFloat(numericPartStr);
  if (isNaN(numericValue) || numericValue <= 0) return null;
  const finalValue = numericValue * multiplier;
  return finalValue > 0 ? Math.floor(finalValue) : null;
};

interface EditInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit: PortfolioEntry | null;
  itemInfo: ItemMapInfo | null; // Pass full ItemMapInfo for icon/name
  onConfirmEdit: (entryId: string, updates: PortfolioEntryUpdate) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  itemInfo,
  onConfirmEdit,
  addNotification,
}) => {
  const [quantityInput, setQuantityInput] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && entryToEdit) {
      setQuantityInput(entryToEdit.quantityPurchased.toString());
      setPurchasePriceInput(entryToEdit.purchasePricePerItem.toString());
      setPurchaseDate(new Date(entryToEdit.purchaseDate).toISOString().split('T')[0]);
      setTimeout(() => quantityInputRef.current?.focus(), 50);
    }
  }, [isOpen, entryToEdit]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryToEdit) return;

    const newQuantity = parseShorthandValue(quantityInput);
    const newPurchasePrice = parseShorthandValue(purchasePriceInput);
    const newDateTimestamp = new Date(purchaseDate).getTime();

    if (newQuantity === null || newQuantity <= 0) {
      addNotification('Purchase quantity must be a positive number or valid shorthand.', 'error');
      return;
    }
    if (newPurchasePrice === null || newPurchasePrice <= 0) {
      addNotification('Purchase price must be a positive number or valid shorthand.', 'error');
      return;
    }
    if (isNaN(newDateTimestamp)) {
      addNotification('Invalid purchase date.', 'error');
      return;
    }
    
    // Crucial Validation: New quantity cannot be less than already sold quantity
    if (newQuantity < entryToEdit.quantitySoldFromThisLot) {
         addNotification(`Error: New purchase quantity (${newQuantity.toLocaleString()}) cannot be less than the quantity already sold from this lot (${entryToEdit.quantitySoldFromThisLot.toLocaleString()}). Adjust sales first if needed.`, 'error');
        return;
    }


    const updates: PortfolioEntryUpdate = {
      quantityPurchased: newQuantity,
      purchasePricePerItem: newPurchasePrice,
      purchaseDate: newDateTimestamp,
    };

    onConfirmEdit(entryToEdit.id, updates);
    // Notification for success will be handled by the usePortfolio hook's update function
    // onClose(); // Consider if usePortfolio's notification implies success and modal can close
  };

  if (!isOpen || !entryToEdit || !itemInfo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[85] p-4" // z-index between portfolio and delete confirm
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-investment-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="edit-investment-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Edit Investment
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close edit investment modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center mb-6 p-3 bg-[var(--bg-input-secondary)] rounded-md">
          <img
            src={`${ITEM_IMAGE_BASE_URL}${itemInfo.icon.replace(/ /g, '_')}`}
            alt={itemInfo.name}
            className="w-12 h-12 mr-4 object-contain flex-shrink-0"
          />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">{itemInfo.name}</p>
            <p className="text-xs text-[var(--text-muted)]">
                Lot purchased: {new Date(entryToEdit.purchaseDate).toLocaleDateString()}
            </p>
             {entryToEdit.quantitySoldFromThisLot > 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                    Sold from this lot: {entryToEdit.quantitySoldFromThisLot.toLocaleString()}
                </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editQuantity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Quantity Purchased
              </label>
              <input
                ref={quantityInputRef}
                type="text"
                id="editQuantity"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="e.g., 100 or 10k"
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                required
              />
            </div>
            <div>
              <label htmlFor="editPurchasePrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Price (per item)
              </label>
              <input
                type="text"
                id="editPurchasePrice"
                value={purchasePriceInput}
                onChange={(e) => setPurchasePriceInput(e.target.value)}
                placeholder="e.g., 1.5k or 1500"
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="editPurchaseDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              id="editPurchaseDate"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              max={new Date().toISOString().split('T')[0]} 
              required
            />
          </div>
          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-60"
              disabled={!quantityInput.trim() || !purchasePriceInput.trim()}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
