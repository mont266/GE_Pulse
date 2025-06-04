
import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm }) => {
  return (
    <input
      type="text"
      placeholder="E.g., Dragon Scimitar"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
    />
  );
};
