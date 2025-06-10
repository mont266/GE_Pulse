
import React from 'react';
import { PortfolioEntry, LatestPriceData } from '../../src/types';

interface PortfolioSummaryProps {
  entries: PortfolioEntry[];
  livePrices: Record<number, LatestPriceData | null>;
  getItemName: (itemId: number) => string; 
  onRefreshPrices: () => void;
  isLoadingPrices: boolean;
}

const formatGPSummary = (value: number | null): string => {
  if (value === null || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B GP`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M GP`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K GP`;
  return value.toLocaleString() + ' GP';
};

const SmallSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
);
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-4 h-4"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);


export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ 
    entries, 
    livePrices, 
    onRefreshPrices,
    isLoadingPrices 
}) => {
  let totalInvestmentCostOpen = 0;
  let currentPortfolioValueOpen = 0;
  let totalRealizedPL = 0;
  let totalTaxPaidOverall = 0;

  entries.forEach(entry => {
    const qtyRemaining = entry.quantityPurchased - entry.quantitySoldFromThisLot;
    
    if (qtyRemaining > 0) {
      totalInvestmentCostOpen += qtyRemaining * entry.purchasePricePerItem;
      const livePriceData = livePrices[entry.itemId];
      const currentPrice = livePriceData?.high ?? null;
      if (currentPrice !== null) {
        currentPortfolioValueOpen += qtyRemaining * currentPrice;
      }
    }

    if (entry.quantitySoldFromThisLot > 0) {
      const costOfSoldItems = entry.quantitySoldFromThisLot * entry.purchasePricePerItem;
      totalRealizedPL += (entry.totalProceedsFromThisLot - costOfSoldItems - entry.totalTaxPaidFromThisLot);
    }
    totalTaxPaidOverall += entry.totalTaxPaidFromThisLot;
  });

  const unrealizedPLOpen = currentPortfolioValueOpen - totalInvestmentCostOpen;
  const overallPLEst = unrealizedPLOpen + totalRealizedPL; // Realized P/L already accounts for tax

  const summaryItems = [
    { label: 'Invested (Open)', value: totalInvestmentCostOpen, colorClass: 'text-[var(--text-secondary)]' },
    { label: 'Value (Open)', value: currentPortfolioValueOpen, colorClass: 'text-[var(--text-secondary)]' }, // Renamed for clarity
    { label: 'Unreal. P/L (Open)', value: unrealizedPLOpen, 
      colorClass: unrealizedPLOpen >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]' },
    { label: 'Total Tax Paid', value: totalTaxPaidOverall, colorClass: 'text-[var(--text-muted)]' },
    { label: 'Realized P/L (Net)', value: totalRealizedPL, 
      colorClass: totalRealizedPL >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]' },
    { label: 'Overall P/L (Est.)', value: overallPLEst, 
      colorClass: overallPLEst >= 0 ? 'text-[var(--price-high)] font-semibold' : 'text-[var(--price-low)] font-semibold' },
  ];

  return (
    <div className="p-3 sm:p-4 bg-[var(--bg-tertiary)] rounded-lg shadow space-y-2 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-[var(--text-accent)]">Portfolio Snapshot</h3>
        <button
          onClick={onRefreshPrices}
          disabled={isLoadingPrices}
          className="flex items-center text-xs px-2 py-1 rounded-md bg-[var(--bg-input)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
          title="Refresh current market prices for open positions"
        >
          {isLoadingPrices ? <SmallSpinner /> : <RefreshIcon />}
          <span className="ml-1.5">Refresh Values</span>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
        {summaryItems.map(item => (
          <div key={item.label} className="p-2 bg-[var(--bg-input-secondary)] rounded-md">
            <dt className="text-xs text-[var(--text-muted)] truncate" title={item.label}>{item.label}</dt>
            <dd className={`text-sm sm:text-base font-medium ${item.colorClass}`} title={item.value.toLocaleString() + ' GP'}>
              {formatGPSummary(item.value)}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
};
