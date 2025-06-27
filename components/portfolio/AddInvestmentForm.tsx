
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ItemMapInfo, LatestPriceData } from '../../src/types';
import { ITEM_IMAGE_BASE_URL } from '../../constants';

interface AddInvestmentFormProps {
  allItems: ItemMapInfo[];
  onAddInvestment: (item: ItemMapInfo, quantity: number, purchasePrice: number, purchaseDate: number) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isConsentGranted: boolean;
  fetchLatestPrice: (itemId: number) => Promise<LatestPriceData | null>; // Added prop
}

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

const ClearIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SmallSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current ${className}`}></div>
);


export const AddInvestmentForm: React.FC<AddInvestmentFormProps> = ({
  allItems,
  onAddInvestment,
  addNotification,
  isConsentGranted,
  fetchLatestPrice, // Destructure new prop
}) => {
  const [selectedItem, setSelectedItem] = useState<ItemMapInfo | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]); 

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const suggestionListRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null); 
  const [isLoadingCurrentPrice, setIsLoadingCurrentPrice] = useState<boolean>(false); // New state


  const filteredItems = useMemo(() => {
    if (!itemSearch || selectedItem) return [];
    return allItems
      .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
      .slice(0, 10);
  }, [allItems, itemSearch, selectedItem]);

   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemSearch && !selectedItem && suggestionListRef.current && !suggestionListRef.current.contains(event.target as Node) && searchInputRef.current && !searchInputRef.current.parentElement!.contains(event.target as Node) ) {
        setItemSearch(''); 
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemSearch, selectedItem]);


  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, filteredItems.length);
  }, [filteredItems]);

  useEffect(() => {
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredItems.length) {
      itemRefs.current[activeSuggestionIndex]?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [activeSuggestionIndex, filteredItems]);

  const handleSelectItem = useCallback((item: ItemMapInfo) => {
    setSelectedItem(item);
    setItemSearch(item.name);
    setActiveSuggestionIndex(-1);
    document.getElementById('investmentQuantity')?.focus();
  }, []);

  const handleClearSelectedItem = useCallback(() => {
    setSelectedItem(null);
    setItemSearch('');
    setActiveSuggestionIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (selectedItem || !filteredItems.length && !['Escape', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        if(event.key === 'Escape' && selectedItem) handleClearSelectedItem();
        return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % (filteredItems.length || 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredItems.length) {
          handleSelectItem(filteredItems[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setItemSearch(''); setActiveSuggestionIndex(-1);
        break;
      default: break;
    }
  }, [filteredItems, activeSuggestionIndex, handleSelectItem, selectedItem, handleClearSelectedItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to save investments.', 'info');
      return;
    }
    if (!selectedItem) {
      addNotification('Please select an item.', 'error');
      return;
    }
    const quantity = parseShorthandValue(quantityInput);
    const purchasePrice = parseShorthandValue(purchasePriceInput);
    const dateTimestamp = new Date(purchaseDate).getTime();


    if (quantity === null || quantity <= 0) {
      addNotification('Invalid quantity. Must be a positive whole number or shorthand (e.g., 100, 10k).', 'error');
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

    onAddInvestment(selectedItem, quantity, purchasePrice, dateTimestamp);
    handleClearSelectedItem();
    setQuantityInput('');
    setPurchasePriceInput('');
    setPurchaseDate(new Date().toISOString().split('T')[0]); 
    searchInputRef.current?.focus();
  };
  
  const activeDescendantId = useMemo(() => {
    return activeSuggestionIndex !== -1 ? `investment-item-suggestion-${activeSuggestionIndex}` : undefined;
  }, [activeSuggestionIndex]);

  const isFormDisabled = !isConsentGranted;

  const handleSetQuantityToBuyLimit = useCallback(() => {
    if (selectedItem && !isFormDisabled) {
      setQuantityInput(selectedItem.limit.toString());
      // addNotification(`Quantity set to buy limit for ${selectedItem.name} (${selectedItem.limit.toLocaleString()}).`, 'info');
    }
  }, [selectedItem, isFormDisabled]);

  const handleSetPriceToCurrent = useCallback(async () => {
    if (selectedItem && !isFormDisabled && fetchLatestPrice) {
      setIsLoadingCurrentPrice(true);
      try {
        const priceData = await fetchLatestPrice(selectedItem.id);
        if (priceData && priceData.high !== null) {
          setPurchasePriceInput(priceData.high.toString());
          // addNotification(`Purchase price set to current market buy for ${selectedItem.name} (${priceData.high.toLocaleString()} GP).`, 'info');
        } else {
          addNotification(`Could not fetch current market price for ${selectedItem.name}. If item is new, try again later.`, 'error');
        }
      } catch (error) {
        console.error("Error fetching current price for portfolio:", error);
        addNotification(`Error fetching price for ${selectedItem.name}.`, 'error');
      } finally {
        setIsLoadingCurrentPrice(false);
      }
    }
  }, [selectedItem, isFormDisabled, fetchLatestPrice, addNotification]);


  return (
    <div className="p-2 sm:p-4 bg-[var(--bg-tertiary)] rounded-lg shadow">
      <h3 className="text-xl font-semibold text-[var(--text-accent)] mb-4">Add New Investment</h3>
      {isFormDisabled && (
        <p className="text-[var(--text-secondary)] text-center py-4 bg-[var(--bg-input-secondary)] rounded-md mb-4">
            Enable preference storage in settings to add investments.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="investmentItemSearch" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Item
          </label>
          <div className="relative">
            {selectedItem && (
               <img
                  loading="lazy"
                  src={`${ITEM_IMAGE_BASE_URL}${selectedItem.icon.replace(/ /g, '_')}`}
                  alt="" 
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-5 h-5 object-contain pointer-events-none"
                />
            )}
            <input
              ref={searchInputRef}
              type="text"
              id="investmentItemSearch"
              placeholder={isFormDisabled ? "Enable preferences first" : "Search item..."}
              value={itemSearch}
              onChange={(e) => { setItemSearch(e.target.value); if(selectedItem) setSelectedItem(null); setActiveSuggestionIndex(-1); }}
              onKeyDown={handleSearchKeyDown}
              className={`w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]
                ${selectedItem ? 'pl-10 pr-8' : 'pr-2'} transition-all`}
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={!!(itemSearch && !selectedItem && filteredItems.length > 0)}
              aria-controls={itemSearch && !selectedItem && filteredItems.length > 0 ? "investment-item-listbox" : undefined}
              aria-activedescendant={activeDescendantId}
              disabled={isFormDisabled}
            />
            {selectedItem && !isFormDisabled && (
                <button
                  type="button"
                  onClick={handleClearSelectedItem}
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input-secondary)] transition-colors"
                  aria-label="Clear selected item"
                >
                  <ClearIcon className="w-4 h-4" />
                </button>
            )}
          </div>
          {itemSearch && !selectedItem && filteredItems.length > 0 && !isFormDisabled && (
            <ul
              ref={suggestionListRef}
              id="investment-item-listbox"
              role="listbox"
              className="mt-1 max-h-40 overflow-y-auto bg-[var(--bg-input-secondary)] rounded-md shadow-lg z-10"
            >
              {filteredItems.map((item, index) => (
                <li key={item.id} role="presentation">
                  <button
                    ref={el => { itemRefs.current[index] = el; }}
                    id={`investment-item-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`w-full p-2 text-left text-sm transition-colors flex items-center
                      ${index === activeSuggestionIndex ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                     <img 
                        src={`${ITEM_IMAGE_BASE_URL}${item.icon.replace(/ /g, '_')}`} 
                        alt=""
                        className="w-5 h-5 mr-2 object-contain flex-shrink-0"
                    />
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="investmentQuantity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Quantity
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="investmentQuantity"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="e.g., 100 or 10k"
                className="flex-grow w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                disabled={!selectedItem || isFormDisabled}
              />
              {selectedItem && !isFormDisabled && (
                <button
                  type="button"
                  onClick={handleSetQuantityToBuyLimit}
                  className="flex-shrink-0 text-xs whitespace-nowrap bg-[var(--bg-input-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 h-full rounded-md transition-colors"
                  title={`Set quantity to buy limit (${selectedItem.limit.toLocaleString()})`}
                  disabled={!selectedItem || isFormDisabled}
                >
                  Limit
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="investmentPurchasePrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Purchase Price (per item)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="investmentPurchasePrice"
                value={purchasePriceInput}
                onChange={(e) => setPurchasePriceInput(e.target.value)}
                placeholder="e.g., 1.5k or 1500"
                className="flex-grow w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                disabled={!selectedItem || isFormDisabled}
              />
              {selectedItem && !isFormDisabled && (
                <button
                  type="button"
                  onClick={handleSetPriceToCurrent}
                  className="flex-shrink-0 text-xs whitespace-nowrap bg-[var(--bg-input-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 h-full rounded-md transition-colors flex items-center justify-center min-w-[70px]"
                  title="Set to current market buy price"
                  disabled={!selectedItem || isFormDisabled || isLoadingCurrentPrice}
                >
                  {isLoadingCurrentPrice ? <SmallSpinner /> : 'Current'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
            <label htmlFor="investmentPurchaseDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Purchase Date
            </label>
            <input
                type="date"
                id="investmentPurchaseDate"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                disabled={!selectedItem || isFormDisabled}
                max={new Date().toISOString().split('T')[0]} 
            />
        </div>

        <button
          type="submit"
          className="w-full bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-60"
          disabled={!selectedItem || !quantityInput || !purchasePriceInput || isFormDisabled}
        >
          Add Investment
        </button>
      </form>
    </div>
  );
};