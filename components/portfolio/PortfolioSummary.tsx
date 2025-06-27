
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PortfolioEntry, LatestPriceData, PortfolioSummaryProps } from '../../src/types';
import { EditIcon } from '../../components/Icons'; // Ensure EditIcon is imported

interface LocalPortfolioSummaryProps extends PortfolioSummaryProps {}

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


export const PortfolioSummary: React.FC<LocalPortfolioSummaryProps> = ({
    entries,
    livePrices,
    getItemName,
    onRefreshPrices,
    isLoadingPrices,
    onSelectItemAndClose,
    userRsn,
    onUserRsnChange,
}) => {
  const [isEditingRsn, setIsEditingRsn] = useState(false);
  const rsnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingRsn && rsnInputRef.current) {
      rsnInputRef.current.focus();
      rsnInputRef.current.select();
    }
  }, [isEditingRsn]);

  const handleRsnDisplayClick = () => {
    setIsEditingRsn(true);
  };

  const handleRsnInputBlur = () => {
    setIsEditingRsn(false);
  };

  const handleRsnInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      setIsEditingRsn(false);
      event.currentTarget.blur(); // Ensure blur is also called to save
    }
  };

  const mostProfitableTrade = useMemo(() => {
    let bestTrade = { itemName: null as string | null, profit: 0, itemId: null as number | null, found: false };
    if (!entries || entries.length === 0) {
      return bestTrade;
    }

    let maxProfit = 0;

    entries.forEach(entry => {
      if (entry.quantitySoldFromThisLot > 0 && entry.quantitySoldFromThisLot === entry.quantityPurchased) {
        const costOfSoldItems = entry.quantityPurchased * entry.purchasePricePerItem;
        const profitForThisTrade = (entry.totalProceedsFromThisLot - costOfSoldItems) - entry.totalTaxPaidFromThisLot;

        if (profitForThisTrade > maxProfit) {
          maxProfit = profitForThisTrade;
          bestTrade = {
            itemName: getItemName(entry.itemId),
            profit: profitForThisTrade,
            itemId: entry.itemId,
            found: true,
          };
        }
      }
    });
    
    if (!bestTrade.found || maxProfit <= 0) {
        return { itemName: null, profit: 0, itemId: null, found: false };
    }
    return bestTrade;
  }, [entries, getItemName]);

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

    if (entry.quantitySoldFromThisLot > 0 && entry.quantitySoldFromThisLot === entry.quantityPurchased) {
      const costOfSoldItems = entry.quantityPurchased * entry.purchasePricePerItem;
      totalRealizedPL += (entry.totalProceedsFromThisLot - costOfSoldItems - entry.totalTaxPaidFromThisLot);
    }
    totalTaxPaidOverall += entry.totalTaxPaidFromThisLot;
  });

  const unrealizedPLOpen = totalInvestmentCostOpen > 0 || currentPortfolioValueOpen > 0 ? currentPortfolioValueOpen - totalInvestmentCostOpen : 0;
  const overallPLEst = unrealizedPLOpen + totalRealizedPL;

  const summaryItems = [
    { label: 'Invested (Open)', value: totalInvestmentCostOpen, colorClass: 'text-[var(--text-secondary)]' },
    { label: 'Value (Open)', value: currentPortfolioValueOpen, colorClass: 'text-[var(--text-secondary)]' },
    { 
      label: 'Unreal. P/L (Open)', 
      value: unrealizedPLOpen, 
      colorClass: unrealizedPLOpen >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]' 
    },
    { 
      label: 'Top Trade', 
      value: null, 
      colorClass: mostProfitableTrade.found && mostProfitableTrade.profit > 0 ? 'text-[var(--price-high)]' : 'text-[var(--text-muted)]',
      isTopTrade: true,
      data: mostProfitableTrade,
    },
    { label: 'Total Tax Paid', value: totalTaxPaidOverall, colorClass: 'text-[var(--text-muted)]' },
    { 
      label: 'Realized P/L (Net)', 
      value: totalRealizedPL, 
      colorClass: totalRealizedPL >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]' 
    },
    { 
      label: 'Overall P/L (Est.)', 
      value: overallPLEst, 
      colorClass: overallPLEst >= 0 ? 'text-[var(--price-high)] font-semibold' : 'text-[var(--price-low)] font-semibold' 
    },
  ];

  return (
    <div className="p-3 sm:p-4 bg-[var(--bg-tertiary)] rounded-lg shadow space-y-3 sm:space-y-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div> {/* Removed flex-grow and text-center to allow natural left alignment */}
          {isEditingRsn ? (
            <input
              ref={rsnInputRef}
              type="text"
              value={userRsn || ''}
              onChange={(e) => onUserRsnChange(e.target.value)}
              onBlur={handleRsnInputBlur}
              onKeyDown={handleRsnInputKeyDown}
              placeholder="Enter RSN"
              className="w-auto max-w-[280px] sm:max-w-xs p-1 text-lg font-semibold bg-[var(--bg-input)] border-b-2 border-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
              maxLength={12}
              aria-label="RuneScape Name Input"
            />
          ) : (
            <div
              onClick={handleRsnDisplayClick}
              className="inline-flex items-center gap-2 group cursor-pointer py-1"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRsnDisplayClick();}}
              aria-label={userRsn ? `Edit RSN for ${userRsn}` : `Set your RSN`}
            >
              <h3 className="text-lg font-semibold text-[var(--text-accent)] group-hover:text-[var(--link-text-hover)] transition-colors">
                {userRsn ? `${userRsn}'s Snapshot` : 'Your Snapshot'}
              </h3>
              <EditIcon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--link-text-hover)] transition-colors" />
            </div>
          )}
        </div>
        <button
          onClick={onRefreshPrices}
          disabled={isLoadingPrices}
          className="flex items-center text-xs px-2 py-1 rounded-md bg-[var(--bg-input)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] transition-colors disabled:opacity-50 flex-shrink-0"
          title="Refresh current market prices for open positions"
        >
          {isLoadingPrices ? <SmallSpinner /> : <RefreshIcon />}
          <span className="ml-1.5">Refresh Values</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
        {summaryItems.map(item => (
          <div key={item.label} className={`p-2 bg-[var(--bg-input-secondary)] rounded-md ${item.label === 'Overall P/L (Est.)' ? 'sm:col-start-2' : ''}`}>
            <dt 
              className="text-xs text-[var(--text-muted)] truncate" 
              title={item.isTopTrade ? "Most Profitable Closed Trade" : item.label}
            >
              {item.label}
            </dt>
            <dd 
              className={`text-sm sm:text-base font-medium ${item.colorClass} ${item.isTopTrade ? 'leading-tight' : ''}`}
              title={item.isTopTrade ? 
                      (item.data.found && item.data.profit > 0 ? `${item.data.itemName}: ${item.data.profit.toLocaleString()} GP profit` : 'No profitable trades yet') : 
                      (item.value !== null ? item.value.toLocaleString() + ' GP' : 'N/A')}
            >
              {item.isTopTrade ? (
                <div className="flex flex-col items-center min-h-[2.5em]">
                  {item.data.found && item.data.profit > 0 ? (
                    <>
                      {onSelectItemAndClose && item.data.itemId ? (
                        <button
                          onClick={() => onSelectItemAndClose(item.data.itemId!)}
                          className="block w-full text-[var(--text-primary)] hover:text-[var(--text-accent)] focus:text-[var(--text-accent)] focus:outline-none truncate text-sm sm:text-base"
                          title={`View ${item.data.itemName}`}
                        >
                          {item.data.itemName}
                        </button>
                      ) : (
                        <span className="block w-full text-[var(--text-primary)] truncate text-sm sm:text-base" title={item.data.itemName!}>
                          {item.data.itemName}
                        </span>
                      )}
                      <span className={`block w-full text-xs ${item.colorClass} truncate`}>
                        {formatGPSummary(item.data.profit)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm sm:text-base">N/A</span>
                  )}
                </div>
              ) : (
                formatGPSummary(item.value)
              )}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
};
