
import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onKeyDownHandler: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  activeDescendantId?: string;
  filteredItemsCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  setSearchTerm,
  onKeyDownHandler,
  activeDescendantId,
  filteredItemsCount
}) => {
  const isListVisible = !!searchTerm && filteredItemsCount > 0;

  return (
    <input
      type="text"
      placeholder="E.g., Dragon Scimitar"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={onKeyDownHandler}
      className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={isListVisible}
      aria-controls={isListVisible ? "search-item-listbox" : undefined}
      aria-activedescendant={activeDescendantId}
    />
  );
};