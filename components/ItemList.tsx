
import React, { useEffect, useRef } from 'react';
import { ItemMapInfo, FavoriteItemId, WordingPreference } from '../types';
import { EmptyHeartIcon, FilledHeartIcon } from './Icons';

interface ItemListProps {
  items: ItemMapInfo[];
  onSelectItem: (item: ItemMapInfo) => void;
  getItemIconUrl: (iconName: string) => string;
  activeSuggestionIndex: number;
  favoriteItemIds: FavoriteItemId[];
  onToggleFavoriteQuickAction: (itemId: FavoriteItemId) => void;
  wordingPreference: WordingPreference;
  isConsentGranted: boolean; // New prop
}

export const ItemList: React.FC<ItemListProps> = ({ 
  items, 
  onSelectItem, 
  getItemIconUrl, 
  activeSuggestionIndex,
  favoriteItemIds,
  onToggleFavoriteQuickAction,
  wordingPreference,
  isConsentGranted // Destructure new prop
}) => {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  useEffect(() => {
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
      const activeItemRef = itemRefs.current[activeSuggestionIndex];
      if (activeItemRef) {
        activeItemRef.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
        });
      }
    }
  }, [activeSuggestionIndex, items]);


  if (items.length === 0) {
    return null;
  }
  
  const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';

  return (
    <ul 
      ref={listRef}
      id="search-item-listbox"
      role="listbox"
      className="max-h-72 overflow-y-auto bg-[var(--bg-input)] rounded-md shadow divide-y divide-[var(--border-secondary)]"
      aria-label="Item search suggestions"
    >
      {items.map((item, index) => {
        const isFavorited = favoriteItemIds.includes(item.id);
        return (
          <li key={item.id} role="presentation" className="flex items-center justify-between">
            <button
              ref={el => { itemRefs.current[index] = el; }}
              id={`search-suggestion-${index}`}
              role="option"
              aria-selected={index === activeSuggestionIndex}
              onClick={() => onSelectItem(item)}
              className={`flex-grow flex items-center p-3 transition-colors text-left focus:outline-none 
                ${index === activeSuggestionIndex 
                  ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' 
                  : 'hover:bg-[var(--bg-interactive-hover)] hover:text-[var(--text-on-interactive)]'
                }
                ${!isConsentGranted ? 'pr-3' : ''} // Ensure padding consistency if no icon
              `}
            >
              <img 
                src={getItemIconUrl(item.icon)} 
                alt=""
                className="w-8 h-8 mr-3 object-contain flex-shrink-0" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className={`flex-grow truncate ${index === activeSuggestionIndex ? 'text-[var(--text-on-interactive)]' : 'text-[var(--text-primary)]'}`}>
                {item.name}
              </span>
            </button>
            {isConsentGranted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavoriteQuickAction(item.id);
                }}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? `Remove ${item.name} from ${favTerm}` : `Add ${item.name} to ${favTerm}`}
                title={isFavorited ? `Remove from ${favTerm}` : `Add to ${favTerm}`}
                className={`p-2 mr-2 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-[var(--bg-input)]
                  ${index === activeSuggestionIndex 
                    ? 'focus:ring-[var(--text-on-interactive)] hover:bg-white/20' 
                    : 'focus:ring-[var(--border-accent)] hover:bg-[var(--icon-button-hover-bg)]'
                  }
                `}
              >
                {isFavorited ? (
                  <FilledHeartIcon className={`w-5 h-5 text-[var(--favorite-icon-favorited)]`} />
                ) : (
                  <EmptyHeartIcon className={`w-5 h-5 ${index === activeSuggestionIndex ? 'text-[var(--text-on-interactive)]' : 'text-[var(--favorite-icon-default)] hover:text-[var(--favorite-icon-favorited)]'}`} />
                )}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};