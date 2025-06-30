import React, { useEffect } from 'react';
import { PortfolioPerformanceTab } from './PortfolioPerformanceTab';
import { PortfolioEntry, ItemMapInfo, TimespanAPI, ChartDataPoint as PriceChartDataPoint } from '../../src/types';

interface PortfolioPerformanceFullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioEntries: PortfolioEntry[];
  allItems: ItemMapInfo[];
  fetchHistoricalData: (itemId: number, timespan: TimespanAPI) => Promise<PriceChartDataPoint[]>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  getItemName: (itemId: number) => string;
  showChartLineGlow: boolean;
}

export const PortfolioPerformanceFullScreenModal: React.FC<PortfolioPerformanceFullScreenModalProps> = ({
  isOpen,
  onClose,
  ...propsForTab
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-[var(--bg-primary)] z-[100] p-4 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-fullscreen-chart-title"
    >
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 id="portfolio-fullscreen-chart-title" className="text-xl font-semibold text-[var(--text-accent)]">
          Portfolio Performance
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
          aria-label="Close performance chart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      <main className="flex-grow min-h-0">
        <PortfolioPerformanceTab {...propsForTab} />
      </main>
    </div>
  );
};
