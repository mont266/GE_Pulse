
import React, { useState, useEffect, useRef } from 'react';
import { ItemMapInfo } from '../types';
import { ITEM_IMAGE_BASE_URL } from '../constants';

// Re-using the shorthand parser from PriceAlertForm (could be moved to a shared utils file)
const parseShorthandPrice = (value: string): number | null => {
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
        return !isNaN(num) && num > 0 ? num : null;
    }
    return null;
  }
  
  const numericValue = parseFloat(numericPartStr);

  if (isNaN(numericValue) || numericValue <= 0) {
    return null;
  }

  const finalValue = numericValue * multiplier;
  return finalValue > 0 ? Math.floor(finalValue) : null; 
};


interface SetAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemMapInfo | null;
  onAddAlertCallback: (item: ItemMapInfo, targetPrice: number, condition: 'above' | 'below') => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isConsentGranted: boolean;
}

export const SetAlertModal: React.FC<SetAlertModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddAlertCallback,
  addNotification,
  isConsentGranted,
}) => {
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const priceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetPriceInput('');
      setCondition('below');
      priceInputRef.current?.focus();
    }
  }, [isOpen]);

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

  if (!isOpen || !item) {
    return null;
  }

  const handleSetAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConsentGranted) {
        addNotification('Please grant consent in settings to save preferences and use alerts.', 'info');
        return;
    }

    const numericTargetPrice = parseShorthandPrice(targetPriceInput);

    if (numericTargetPrice === null || numericTargetPrice <= 0) {
      addNotification('Invalid target price. Use numbers or shorthand (e.g., 100k, 2.5m). Price must be positive.', 'error');
      return;
    }

    onAddAlertCallback(item, numericTargetPrice, condition);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-alert-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="set-alert-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Set Alert for <span className="text-[var(--text-primary)]">{item.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close set alert modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center mb-6 p-3 bg-[var(--bg-input-secondary)] rounded-md">
          <img
            src={`${ITEM_IMAGE_BASE_URL}${item.icon.replace(/ /g, '_')}`}
            alt={item.name}
            className="w-12 h-12 mr-4 object-contain"
          />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">{item.name}</p>
            <p className="text-xs text-[var(--text-muted)] italic">"{item.examine}"</p>
          </div>
        </div>

        {!isConsentGranted ? (
           <p className="text-[var(--text-secondary)] text-center py-4 bg-[var(--bg-input-secondary)] rounded-md">
            Enable preference storage in settings to set Price Alerts.
          </p>
        ) : (
          <form onSubmit={handleSetAlert} className="space-y-4">
            <div>
              <label htmlFor="modalTargetPrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Target Price (GP)
              </label>
              <input
                ref={priceInputRef}
                type="text"
                id="modalTargetPrice"
                value={targetPriceInput}
                onChange={(e) => setTargetPriceInput(e.target.value)}
                placeholder="E.g., 100k, 2.5m, 100000"
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                required
              />
            </div>
            <div>
              <label htmlFor="modalCondition" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Condition
              </label>
              <select
                id="modalCondition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none"
              >
                <option value="below">Price drops below</option>
                <option value="above">Price rises above</option>
              </select>
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
                disabled={!targetPriceInput.trim()}
              >
                Set Alert
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
