

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioEntry, ItemMapInfo, ChartDataPoint as PriceChartDataPoint, PortfolioChartTimespan, PortfolioPerformanceDataPoint, TimespanAPI } from '../../src/types';
import { PortfolioPerformanceChart } from './PortfolioPerformanceChart';
import { PORTFOLIO_CHART_TIMESPAN_OPTIONS } from '../../constants';
import { LoadingSpinner } from '../LoadingSpinner';

interface PortfolioPerformanceTabProps {
  portfolioEntries: PortfolioEntry[];
  allItems: ItemMapInfo[];
  fetchHistoricalData: (itemId: number, timespan: TimespanAPI) => Promise<PriceChartDataPoint[]>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  getItemName: (itemId: number) => string;
  showChartLineGlow: boolean;
}

const getStartDateForTimespan = (timespan: PortfolioChartTimespan, firstPurchaseDate: number | null): Date => {
  const now = new Date();
  let startDate = new Date();

  switch (timespan) {
    case '1M':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
      if (firstPurchaseDate) {
        startDate = new Date(firstPurchaseDate);
      } else {
        startDate.setFullYear(now.getFullYear() - 1); 
      }
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }
  startDate.setHours(0, 0, 0, 0);
  return startDate;
};


export const PortfolioPerformanceTab: React.FC<PortfolioPerformanceTabProps> = ({
  portfolioEntries,
  allItems,
  fetchHistoricalData,
  addNotification,
  getItemName,
  showChartLineGlow,
}) => {
  const [selectedTimespan, setSelectedTimespan] = useState<PortfolioChartTimespan>('1M');
  const [chartData, setChartData] = useState<PortfolioPerformanceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRealizedPLLine, setShowRealizedPLLine] = useState<boolean>(false);
  
  const firstPurchaseDate = useMemo(() => {
    if (portfolioEntries.length === 0) return null;
    return portfolioEntries.reduce((minDate, entry) => Math.min(minDate, entry.purchaseDate), Date.now());
  }, [portfolioEntries]);


  const calculatePerformanceData = useCallback(async () => {
    if (portfolioEntries.length === 0) {
      setChartData([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const uniqueItemIds = Array.from(new Set(portfolioEntries.map(entry => entry.itemId)));
      const historicalDataPromises = uniqueItemIds.map(id => 
        fetchHistoricalData(id, '24h')
          .catch(err => {
            console.warn(`Failed to fetch historical data for item ${id} (${getItemName(id)}):`, err);
            addNotification(`Could not load price history for ${getItemName(id)}. Performance chart may be incomplete.`, 'error');
            return [] as PriceChartDataPoint[];
          })
      );
      
      const allHistoricalDataResults = await Promise.all(historicalDataPromises);
      const historicalPriceMap = new Map<number, PriceChartDataPoint[]>();
      uniqueItemIds.forEach((id, index) => {
        historicalPriceMap.set(id, allHistoricalDataResults[index]);
      });

      const performanceDataPoints: PortfolioPerformanceDataPoint[] = [];
      const startDate = getStartDateForTimespan(selectedTimespan, firstPurchaseDate);
      const endDate = new Date();
      endDate.setHours(23,59,59,999); 

      for (let dayIter = new Date(startDate); dayIter <= endDate; dayIter.setDate(dayIter.getDate() + 1)) {
        const currentDayStartTimestamp = dayIter.getTime(); 
        const currentDayEndTimestamp = new Date(dayIter).setHours(23, 59, 59, 999);

        let cumulativeRealizedPLOnThisDay = 0;
        let unrealizedPLOfOpenPositionsOnThisDay = 0;

        for (const entry of portfolioEntries) {
          if (entry.purchaseDate > currentDayEndTimestamp) {
            continue; // Entry was purchased after the day we are evaluating
          }

          const itemHistoricalPrices = historicalPriceMap.get(entry.itemId);

          // Calculate Cumulative Realized P/L
          if (entry.quantitySoldFromThisLot === entry.quantityPurchased && // Fully sold
              entry.lastSaleDate && entry.lastSaleDate <= currentDayEndTimestamp) { // Sold on or before this day
            const costOfSoldItems = entry.quantityPurchased * entry.purchasePricePerItem;
            const realizedPLForThisEntry = entry.totalProceedsFromThisLot - costOfSoldItems - entry.totalTaxPaidFromThisLot;
            cumulativeRealizedPLOnThisDay += realizedPLForThisEntry;
          }
          // Calculate Unrealized P/L for positions that were open on this day
          else if (entry.quantitySoldFromThisLot < entry.quantityPurchased) { 
            // This lot is currently open, or was open at some point on/before 'currentDayStartTimestamp'
            // and not yet fully sold by 'currentDayStartTimestamp'
            
            let priceOnThisDay: number | null = null;
            if (itemHistoricalPrices) {
              const targetDateStr = new Date(currentDayStartTimestamp).toISOString().split('T')[0];
              const pointForDay = itemHistoricalPrices.find(p => {
                if (p.price === null) return false;
                const pointDateStr = new Date(p.timestamp).toISOString().split('T')[0];
                return pointDateStr === targetDateStr;
              });

              if (pointForDay) {
                priceOnThisDay = pointForDay.price;
              } else {
                // Fallback: find the latest price *before or on* this day if exact match not found
                const relevantPrices = itemHistoricalPrices
                    .filter(p => p.timestamp <= currentDayEndTimestamp && p.price !== null)
                    .sort((a,b) => b.timestamp - a.timestamp);
                if (relevantPrices.length > 0) {
                    priceOnThisDay = relevantPrices[0].price;
                }
              }
            }

            if (priceOnThisDay !== null) {
              const qtyOpen = entry.quantityPurchased - entry.quantitySoldFromThisLot;
              const marketValueOnDay = qtyOpen * priceOnThisDay;
              const costBasisOnDay = qtyOpen * entry.purchasePricePerItem;
              unrealizedPLOfOpenPositionsOnThisDay += (marketValueOnDay - costBasisOnDay);
            }
          }
        }
        
        const totalPortfolioProfitOnThisDay = unrealizedPLOfOpenPositionsOnThisDay + cumulativeRealizedPLOnThisDay;

        performanceDataPoints.push({
          timestamp: currentDayStartTimestamp,
          profit: totalPortfolioProfitOnThisDay,
          realizedPL: cumulativeRealizedPLOnThisDay,
        });
      }
      setChartData(performanceDataPoints);
    } catch (err) {
      console.error("Error calculating portfolio performance:", err);
      setError("Failed to calculate portfolio performance. Price history might be unavailable.");
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioEntries, selectedTimespan, fetchHistoricalData, addNotification, getItemName, firstPurchaseDate]);

  useEffect(() => {
    calculatePerformanceData();
  }, [calculatePerformanceData]);

  return (
    <div className="h-full flex flex-col space-y-4 p-2 sm:p-0">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 my-2 flex-shrink-0">
        <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
          {PORTFOLIO_CHART_TIMESPAN_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedTimespan(option.value)}
              disabled={isLoading}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-all duration-150 ease-in-out disabled:opacity-60
                ${selectedTimespan === option.value 
                  ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)] shadow-md hover:bg-[var(--bg-interactive-hover)]' 
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input-secondary)] focus:bg-[var(--bg-input-secondary)]'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-75`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end mt-2 sm:mt-0">
            <label htmlFor="showRealizedPLLineToggle" className="flex items-center cursor-pointer text-xs text-[var(--text-secondary)] select-none">
              <span className="mr-2">Show Realized P/L</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="showRealizedPLLineToggle" 
                  className="sr-only" 
                  checked={showRealizedPLLine} 
                  onChange={() => setShowRealizedPLLine(prev => !prev)}
                  disabled={isLoading}
                />
                <div className={`block w-10 h-5 rounded-full transition-colors bg-[${showRealizedPLLine ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                <div className={`dot absolute left-0.5 top-0.5 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${showRealizedPLLine ? 'translate-x-5' : ''}`}></div>
              </div>
            </label>
        </div>
      </div>


      {isLoading && (
        <div className="flex flex-col items-center justify-center flex-grow">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-[var(--text-secondary)]">Calculating performance data...</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="flex-grow flex items-center justify-center text-center py-10 text-[var(--error-text)] bg-[var(--error-bg)]/20 rounded-md">
          <div>
            <p className="font-semibold">Error loading performance chart:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      {!isLoading && !error && chartData.length === 0 && portfolioEntries.length > 0 && (
         <div className="flex-grow flex items-center justify-center text-center py-10 text-[var(--text-muted)]">
            <div>
              <p>No performance data to display for the selected timespan or current portfolio.</p>
              <p className="text-xs">This could be due to missing price history or a very new portfolio.</p>
            </div>
        </div>
      )}
      {!isLoading && !error && chartData.length === 0 && portfolioEntries.length === 0 && (
         <div className="flex-grow flex items-center justify-center text-center py-10 text-[var(--text-muted)]">
            <div>
              <p>Your portfolio is empty.</p>
              <p className="text-xs">Add some investments to see performance data.</p>
            </div>
        </div>
      )}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="flex-grow min-h-0 w-full bg-[var(--bg-input-secondary)] p-2 rounded-md">
          <PortfolioPerformanceChart data={chartData} showRealizedPLLine={showRealizedPLLine} showChartLineGlow={showChartLineGlow} />
        </div>
      )}
       <p className="text-xs text-[var(--text-muted)] text-center pt-2 mt-2 border-t border-[var(--border-primary)] flex-shrink-0">
        Performance chart shows estimated daily profit. Data accuracy depends on available historical prices.
      </p>
    </div>
  );
};