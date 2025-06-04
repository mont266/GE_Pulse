
import React from 'react';
import { ItemMapInfo } from '../types';

interface ItemListProps {
  items: ItemMapInfo[];
  onSelectItem: (item: ItemMapInfo) => void;
  getItemIconUrl: (iconName: string) => string;
}

export const ItemList: React.FC<ItemListProps> = ({ items, onSelectItem, getItemIconUrl }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="mt-4 max-h-72 overflow-y-auto bg-[var(--bg-input)] rounded-md shadow divide-y divide-[var(--border-secondary)]">
      {items.map(item => (
        <li key={item.id}>
          <button
            onClick={() => onSelectItem(item)}
            className="w-full flex items-center p-3 hover:bg-[var(--bg-interactive-hover)] hover:text-[var(--text-on-interactive)] transition-colors text-left focus:outline-none focus:bg-[var(--bg-interactive)] focus:text-[var(--text-on-interactive)]"
          >
            <img 
              src={getItemIconUrl(item.icon)} 
              alt={item.name} 
              className="w-8 h-8 mr-3 object-contain" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-[var(--text-primary)] group-hover:text-[var(--text-on-interactive)]">{item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};
