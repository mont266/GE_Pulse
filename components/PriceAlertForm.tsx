
import React, { useState, useMemo } from 'react';
import { ItemMapInfo, PriceAlert } from '../types';

interface PriceAlertFormProps {
  allItems: ItemMapInfo[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PriceAlertForm: React.FC<PriceAlertFormProps> = ({ allItems, onAddAlert, addNotification }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [itemSearch, setItemSearch] = useState('');

  const filteredAlertItems = useMemo(() => {
    if (!itemSearch) return [];
    return allItems
      .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
      .slice(0, 10);
  }, [allItems, itemSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !targetPrice) {
      addNotification('Please select an item and enter a target price.', 'error');
      return;
    }
    const numericTargetPrice = parseFloat(targetPrice);
    if (isNaN(numericTargetPrice) || numericTargetPrice <= 0) {
      addNotification('Target price must be a positive number.', 'error');
      return;
    }
    
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
    setSelectedItemId('');
    setTargetPrice('');
    setItemSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="itemSearch" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Search Item for Alert
        </label>
        <input
          type="text"
          id="itemSearch"
          placeholder="Search item..."
          value={itemSearch}
          onChange={(e) => {
            setItemSearch(e.target.value);
            setSelectedItemId('');
          }}
          className="w-full p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {itemSearch && filteredAlertItems.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-y-auto bg-[var(--bg-tertiary)] rounded-md shadow">
            {filteredAlertItems.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id.toString());
                    setItemSearch(item.name);
                  }}
                  className={`w-full p-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input-secondary)] ${selectedItemId === item.id.toString() ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' : ''}`}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
         {itemSearch && !filteredAlertItems.length && <p className="text-xs text-[var(--text-muted)] mt-1">No items found.</p>}
      </div>
      
      {selectedItemId && (
        <p className="text-sm text-[var(--text-accent)]">Selected: {allItems.find(i => i.id === parseInt(selectedItemId))?.name}</p>
      )}

      <div>
        <label htmlFor="targetPrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Target Price (GP)
        </label>
        <input
          type="number"
          id="targetPrice"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="E.g., 100000"
          className="w-full p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min="1"
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
        >
          <option value="below">Price drops below</option>
          <option value="above">Price rises above</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-50"
        disabled={!selectedItemId || !targetPrice}
      >
        Add Alert
      </button>
    </form>
  );
};
