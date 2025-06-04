
import React, { useEffect, useRef } from 'react';
import { ItemMapInfo } from '../types';

interface ItemListProps {
  items: ItemMapInfo[];
  onSelectItem: (item: ItemMapInfo) => void;
  getItemIconUrl: (iconName: string) => string;
  activeSuggestionIndex: number;
}

export const ItemList: React.FC<ItemListProps> = ({ items, onSelectItem, getItemIconUrl, activeSuggestionIndex }) => {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Ensure refs array is the same length as items
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  useEffect(() => {
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
      const activeItemRef = itemRefs.current[activeSuggestionIndex];
      if (activeItemRef) {
        activeItemRef.scrollIntoView({
          behavior: 'auto', // 'smooth' can be jumpy with rapid changes
          block: 'nearest',
        });
      }
    }
  }, [activeSuggestionIndex, items]);


  if (items.length === 0) {
    return null;
  }

  return (
    <ul 
      ref={listRef}
      id="search-item-listbox"
      role="listbox"
      className="mt-4 max-h-72 overflow-y-auto bg-[var(--bg-input)] rounded-md shadow divide-y divide-[var(--border-secondary)]"
      aria-label="Item search suggestions"
    >
      {items.map((item, index) => (
        <li key={item.id} role="presentation"> {/* role="presentation" on li as button is the option */}
          <button
            ref={el => { itemRefs.current[index] = el; }}
            id={`search-suggestion-${index}`}
            role="option"
            aria-selected={index === activeSuggestionIndex}
            onClick={() => onSelectItem(item)}
            className={`w-full flex items-center p-3 transition-colors text-left focus:outline-none 
              ${index === activeSuggestionIndex 
                ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' 
                : 'hover:bg-[var(--bg-interactive-hover)] hover:text-[var(--text-on-interactive)]'
              }`}
          >
            <img 
              src={getItemIconUrl(item.icon)} 
              alt="" // Alt text is redundant if item name is present and it's decorative in this context
              className="w-8 h-8 mr-3 object-contain" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className={index === activeSuggestionIndex ? 'text-[var(--text-on-interactive)]' : 'text-[var(--text-primary)]'}>
              {item.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};