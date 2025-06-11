
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ItemMapInfo, LatestPriceData } from '../../src/types';
import { ITEM_IMAGE_BASE_URL } from '../../constants';

// Re-using the shorthand parser - suitable for both price and quantity
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

const SmallSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current ${className}`}></div>
);

interface AddInvestmentFromViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToAdd: ItemMapInfo | null;
  addPortfolioEntryCallback: (item: ItemMapInfo, quantity: number, purchasePrice: number, purchaseDate: number) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isConsentGranted: boolean;
  getItemIconUrl: (iconName: string) => string;
  fetchLatestPrice: (itemId: number) => Promise<LatestPriceData | null>; // Added prop
}

export const AddInvestmentFromViewModal: React.FC<AddInvestmentFromViewModalProps> = ({
  isOpen,
  onClose,
  itemToAdd,
  addPortfolioEntryCallback,
  addNotification,
  isConsentGranted,
  getItemIconUrl,
  fetchLatestPrice, // Destructure new prop
}) => {
  const [quantityInput, setQuantityInput] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingCurrentPrice, setIsLoadingCurrentPrice] = useState<boolean>(false); // New state

  useEffect(() => {
    if (isOpen && itemToAdd) {
      setQuantityInput('');
      setPurchasePriceInput('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setIsLoadingCurrentPrice(false);
      setTimeout(() => quantityInputRef.current?.focus(), 50); 
    }
  }, [isOpen, itemToAdd]);

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
    if (!isConsentGranted || !itemToAdd) {
      addNotification('Please grant consent in settings to save investments.', 'info');
      return;
    }

    const quantity = parseShorthandValue(quantityInput);
    const purchasePrice = parseShorthandValue(purchasePriceInput);
    const dateTimestamp = new Date(purchaseDate).getTime();

    if (quantity === null || quantity <= 0) {
      addNotification('Quantity must be a positive whole number or shorthand (e.g., 100, 10k).', 'error');
      return;
    }
    if (purchasePrice === null || purchasePrice <= 0) {
      addNotification('Invalid purchase price. Use numbers or shorthand (e.g., 1.5k). Must be positive.', 'error');
      return;
    }
    if (isNaN(dateTimestamp)) {
      addNotification('Invalid purchase date.', 'error');
      return;
    }

    addPortfolioEntryCallback(itemToAdd, quantity, purchasePrice, dateTimestamp);
    onClose(); 
  };
  
  const isFormDisabled = !isConsentGranted;

  const handleSetQuantityToBuyLimit = useCallback(() => {
    if (itemToAdd && !isFormDisabled) {
      setQuantityInput(itemToAdd.limit.toString());
      // addNotification(`Quantity set to buy limit for ${itemToAdd.name} (${itemToAdd.limit.toLocaleString()}).`, 'info');
    }
  }, [itemToAdd, isFormDisabled]);

  const handleSetPriceToCurrent = useCallback(async () => {
    if (itemToAdd && !isFormDisabled && fetchLatestPrice) {
      setIsLoadingCurrentPrice(true);
      try {
        const priceData = await fetchLatestPrice(itemToAdd.id);
        if (priceData && priceData.high !== null) {
          setPurchasePriceInput(priceData.high.toString());
          // addNotification(`Purchase price set to current market buy for ${itemToAdd.name} (${priceData.high.toLocaleString()} GP).`, 'info');
        } else {
          addNotification(`Could not fetch current market price for ${itemToAdd.name}. If item is new, try again later.`, 'error');
        }
      } catch (error) {
        console.error("Error fetching current price for portfolio (from view modal):", error);
        addNotification(`Error fetching price for ${itemToAdd.name}.`, 'error');
      } finally {
        setIsLoadingCurrentPrice(false);
      }
    }
  }, [itemToAdd, isFormDisabled, fetchLatestPrice, addNotification]);

  if (!isOpen || !itemToAdd) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[75] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-investment-view-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="add-investment-view-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Add to Portfolio
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close add to portfolio modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center mb-6 p-3 bg-[var(--bg-input-secondary)] rounded-md">
          <img
            src={getItemIconUrl(itemToAdd.icon)}
            alt={itemToAdd.name}
            className="w-12 h-12 mr-4 object-contain flex-shrink-0"
          />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">{itemToAdd.name}</p>
            <p className="text-xs text-[var(--text-muted)] italic">"{itemToAdd.examine}"</p>
          </div>
        </div>

        {!isConsentGranted ? (
           <p className="text-[var(--text-secondary)] text-center py-4 bg-[var(--bg-input-secondary)] rounded-md">
            Enable preference storage in settings to add investments to your portfolio.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="viewQuantity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Quantity
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                        ref={quantityInputRef}
                        type="text"
                        id="viewQuantity"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        placeholder="e.g., 100 or 10k"
                        className="flex-grow w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                        disabled={isFormDisabled}
                        required
                    />
                    {!isFormDisabled && (
                       <button
                        type="button"
                        onClick={handleSetQuantityToBuyLimit}
                        className="flex-shrink-0 text-xs whitespace-nowrap bg-[var(--bg-input-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 h-full rounded-md transition-colors"
                        title={`Set quantity to buy limit (${itemToAdd.limit.toLocaleString()})`}
                        disabled={isFormDisabled}
                      >
                        Limit
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="viewPurchasePrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Price (per item)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        id="viewPurchasePrice"
                        value={purchasePriceInput}
                        onChange={(e) => setPurchasePriceInput(e.target.value)}
                        placeholder="e.g., 1.5k or 1500"
                        className="flex-grow w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                        disabled={isFormDisabled}
                        required
                    />
                     {!isFormDisabled && (
                       <button
                        type="button"
                        onClick={handleSetPriceToCurrent}
                        className="flex-shrink-0 text-xs whitespace-nowrap bg-[var(--bg-input-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 h-full rounded-md transition-colors flex items-center justify-center min-w-[70px]"
                        title="Set to current market buy price"
                        disabled={isFormDisabled || isLoadingCurrentPrice}
                      >
                        {isLoadingCurrentPrice ? <SmallSpinner /> : 'Current'}
                      </button>
                    )}
                  </div>
                </div>
            </div>
            <div>
                <label htmlFor="viewPurchaseDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Purchase Date
                </label>
                <input
                    type="date"
                    id="viewPurchaseDate"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    max={new Date().toISOString().split('T')[0]} 
                    disabled={isFormDisabled}
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
                disabled={isFormDisabled || !quantityInput.trim() || !purchasePriceInput.trim()}
              >
                Add to Portfolio
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
