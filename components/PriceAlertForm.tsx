
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ItemMapInfo, PriceAlert } from '../types';
import { ITEM_IMAGE_BASE_URL } from '../constants'; 

interface PriceAlertFormProps {
  allItems: ItemMapInfo[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  editingAlert: PriceAlert | null; 
  onUpdateAlert: (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => void; 
  onCancelEdit: () => void; 
  isConsentGranted: boolean; // New prop
}

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

const ClearIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


export const PriceAlertForm: React.FC<PriceAlertFormProps> = ({ 
  allItems, 
  onAddAlert, 
  addNotification,
  editingAlert,
  onUpdateAlert,
  onCancelEdit,
  isConsentGranted
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [itemSearch, setItemSearch] = useState('');
  const [activeAlertSuggestionIndex, setActiveAlertSuggestionIndex] = useState<number>(-1);

  const alertSuggestionListRef = useRef<HTMLUListElement | null>(null);
  const alertItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const alertSearchInputWrapperRef = useRef<HTMLDivElement>(null);
  const alertItemListWrapperRef = useRef<HTMLDivElement | null>(null);

  const isEditing = !!editingAlert;

  useEffect(() => {
    if (isEditing && editingAlert) {
      setSelectedItemId(editingAlert.itemId.toString());
      setItemSearch(editingAlert.itemName); 
      setTargetPriceInput(editingAlert.targetPrice.toString());
      setCondition(editingAlert.condition);
      setActiveAlertSuggestionIndex(-1); 
    } else {
      setSelectedItemId('');
      setItemSearch('');
      setTargetPriceInput('');
      setCondition('below');
      setActiveAlertSuggestionIndex(-1);
    }
  }, [editingAlert, isEditing]);


  const filteredAlertItems = useMemo(() => {
    if (isEditing || !itemSearch || selectedItemId) { 
      return [];
    }
    const results = allItems
      .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
      .slice(0, 10);
    if (itemSearch && activeAlertSuggestionIndex >= results.length) {
        setActiveAlertSuggestionIndex(-1); 
    } else if (!itemSearch && activeAlertSuggestionIndex !== -1) {
        setActiveAlertSuggestionIndex(-1);
    }
    return results;
  }, [allItems, itemSearch, activeAlertSuggestionIndex, isEditing, selectedItemId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isEditing && itemSearch && !selectedItemId && 
          alertSearchInputWrapperRef.current && 
          !alertSearchInputWrapperRef.current.contains(event.target as Node) &&
          alertItemListWrapperRef.current && 
          !alertItemListWrapperRef.current.contains(event.target as Node)
         ) {
        setItemSearch(''); 
        setActiveAlertSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [itemSearch, isEditing, selectedItemId]);

  useEffect(() => {
    alertItemRefs.current = alertItemRefs.current.slice(0, filteredAlertItems.length);
  }, [filteredAlertItems]);

  useEffect(() => {
    if (activeAlertSuggestionIndex >= 0 && activeAlertSuggestionIndex < filteredAlertItems.length) {
      const activeItemRef = alertItemRefs.current[activeAlertSuggestionIndex];
      if (activeItemRef) {
        activeItemRef.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }
  }, [activeAlertSuggestionIndex, filteredAlertItems]);

  const handleSelectAlertItem = useCallback((item: ItemMapInfo) => {
    setSelectedItemId(item.id.toString());
    setItemSearch(item.name); 
    setActiveAlertSuggestionIndex(-1); 
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedItemId('');
    setItemSearch('');
    setActiveAlertSuggestionIndex(-1);
  }, []);

  const handleAlertSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isConsentGranted || isEditing || selectedItemId || (!filteredAlertItems.length && !['Escape', 'ArrowDown', 'ArrowUp'].includes(event.key))) {
        if (event.key === 'Escape' && selectedItemId && !isEditing) { 
          handleClearSelection();
        } else if (event.key === 'Escape' && !selectedItemId) { 
           setItemSearch('');
           setActiveAlertSuggestionIndex(-1);
        }
        return;
    }
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveAlertSuggestionIndex(prev => (prev + 1) % (filteredAlertItems.length || 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveAlertSuggestionIndex(prev => (prev - 1 + (filteredAlertItems.length || 1)) % (filteredAlertItems.length || 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeAlertSuggestionIndex >= 0 && activeAlertSuggestionIndex < filteredAlertItems.length) {
          handleSelectAlertItem(filteredAlertItems[activeAlertSuggestionIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setItemSearch(''); 
        setActiveAlertSuggestionIndex(-1); 
        break;
      default:
        break;
    }
  }, [filteredAlertItems, activeAlertSuggestionIndex, handleSelectAlertItem, isEditing, selectedItemId, handleClearSelection, isConsentGranted]);
  
  const alertActiveDescendantId = useMemo(() => {
    return activeAlertSuggestionIndex !== -1 ? `alert-suggestion-${activeAlertSuggestionIndex}` : undefined;
  }, [activeAlertSuggestionIndex]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConsentGranted) {
        addNotification('Please grant consent in settings to save preferences and use alerts.', 'info');
        return;
    }
    if (!selectedItemId || !targetPriceInput) {
      addNotification('Please select an item and enter a target price.', 'error');
      return;
    }

    const numericTargetPrice = parseShorthandPrice(targetPriceInput);

    if (numericTargetPrice === null || numericTargetPrice <= 0) {
      addNotification('Invalid target price. Use numbers or shorthand (e.g., 100k, 2.5m). Price must be positive.', 'error');
      return;
    }
    
    if (isEditing && editingAlert) {
      onUpdateAlert(editingAlert.id, { targetPrice: numericTargetPrice, condition });
    } else {
      const item = allItems.find(i => i.id === parseInt(selectedItemId, 10));
      if (!item) {
        addNotification('Selected item not found.', 'error');
        return;
      }
      onAddAlert({
        itemId: item.id,
        itemName: item.name,
        itemIcon: item.icon,
        targetPrice: numericTargetPrice,
        condition,
      });
      addNotification(`Alert set for ${item.name}`, 'success');
      handleClearSelection(); 
      setTargetPriceInput(''); 
      setCondition('below');
    }
  };
  
  const currentSelectedItemDetails = useMemo(() => {
    if (selectedItemId && !isEditing) {
      return allItems.find(i => i.id.toString() === selectedItemId);
    }
    return null;
  }, [selectedItemId, allItems, isEditing]);
  
  const isAlertListVisible = itemSearch && !selectedItemId && filteredAlertItems.length > 0 && !isEditing;
  const currentItemForEditingDisplay = isEditing && editingAlert ? allItems.find(i => i.id === editingAlert.itemId) : null;

  const formDisabled = !isConsentGranted && !isEditing; // Disable entire form if consent not granted unless editing an existing (in-memory) one.

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="alertItemSearch" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          {isEditing ? 'Item (Editing)' : 'Search Item for Alert'}
        </label>
        {isEditing && currentItemForEditingDisplay ? (
          <div className="flex items-center p-2 bg-[var(--bg-input-secondary)] rounded-md">
            <img 
              src={`${ITEM_IMAGE_BASE_URL}${currentItemForEditingDisplay.icon.replace(/ /g, '_')}`} 
              alt={currentItemForEditingDisplay.name} 
              className="w-8 h-8 mr-3 object-contain"
            />
            <span className="text-[var(--text-primary)]">{currentItemForEditingDisplay.name}</span>
          </div>
        ) : (
          <>
            <div className="relative" ref={alertSearchInputWrapperRef}>
              {currentSelectedItemDetails && (
                <img
                  src={`${ITEM_IMAGE_BASE_URL}${currentSelectedItemDetails.icon.replace(/ /g, '_')}`}
                  alt="" 
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-5 h-5 object-contain pointer-events-none"
                />
              )}
              <input
                type="text"
                id="alertItemSearch"
                placeholder={formDisabled ? "Enable preferences in settings" : "Search item..."}
                value={itemSearch}
                onChange={(e) => {
                  const newSearchTerm = e.target.value;
                  setItemSearch(newSearchTerm);
                  if (selectedItemId) { 
                    setSelectedItemId(''); 
                  }
                  setActiveAlertSuggestionIndex(-1); 
                }}
                onKeyDown={handleAlertSearchKeyDown}
                className={`w-full p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]
                  ${currentSelectedItemDetails ? 'pl-10 pr-8' : 'pr-2'} 
                  transition-all
                  ${formDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={isAlertListVisible}
                aria-controls={isAlertListVisible ? "alert-item-listbox" : undefined}
                aria-activedescendant={alertActiveDescendantId}
                disabled={isEditing || formDisabled}
              />
              {currentSelectedItemDetails && !formDisabled && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  aria-label="Clear selected item"
                >
                  <ClearIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {isAlertListVisible && !formDisabled && (
              <div ref={alertItemListWrapperRef}>
                <ul 
                  ref={alertSuggestionListRef}
                  id="alert-item-listbox"
                  role="listbox"
                  className="mt-1 max-h-40 overflow-y-auto bg-[var(--bg-tertiary)] rounded-md shadow"
                  aria-label="Alert item search suggestions"
                >
                  {filteredAlertItems.map((item, index) => (
                    <li key={item.id} role="presentation">
                      <button
                        ref={el => { alertItemRefs.current[index] = el; }}
                        id={`alert-suggestion-${index}`}
                        role="option"
                        aria-selected={index === activeAlertSuggestionIndex}
                        type="button"
                        onClick={() => handleSelectAlertItem(item)}
                        className={`w-full p-2 text-left text-sm transition-colors flex items-center
                          ${index === activeAlertSuggestionIndex 
                            ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' 
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-input-secondary)]'
                          }`}
                      >
                        <img 
                            src={`${ITEM_IMAGE_BASE_URL}${item.icon.replace(/ /g, '_')}`} 
                            alt=""
                            className="w-5 h-5 mr-2 object-contain"
                        />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {itemSearch && !selectedItemId && !filteredAlertItems.length && !isEditing && !formDisabled && (
                <p className="text-xs text-[var(--text-muted)] mt-1">No items found matching "{itemSearch}".</p>
            )}
          </>
        )}
      </div>
      
      {((selectedItemId || isEditing) && !formDisabled) && (
        <>
          <div>
            <label htmlFor="targetPrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Target Price (GP)
            </label>
            <input
              type="text"
              id="targetPrice"
              value={targetPriceInput}
              onChange={(e) => setTargetPriceInput(e.target.value)}
              placeholder="E.g., 100k, 2.5m, 100000"
              className="w-full p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              disabled={formDisabled && !isEditing}
            />
          </div>
          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Condition
            </label>
            <select
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
              className="w-full p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none"
              disabled={formDisabled && !isEditing}
            >
              <option value="below">Price drops below</option>
              <option value="above">Price rises above</option>
            </select>
          </div>
          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              className="flex-grow bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-50"
              disabled={(!selectedItemId || !targetPriceInput) || (formDisabled && !isEditing)}
            >
              {isEditing ? 'Update Alert' : 'Add Alert'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-shrink-0 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
      {(!isEditing && !selectedItemId && !formDisabled) && (
         <button
          type="submit"
          className="w-full bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-50"
          disabled={true} 
        >
         Add Alert
        </button>
      )}
    </form>
  );
};