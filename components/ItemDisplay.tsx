
import React from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, Timespan } from '../types';
import { PriceChart } from './PriceChart';
import { TimespanSelector } from './TimespanSelector';
import { LoadingSpinner } from './LoadingSpinner';

interface ItemDisplayProps {
  item: ItemMapInfo;
  latestPrice: LatestPriceData | null;
  historicalData: ChartDataPoint[];
  selectedTimespan: Timespan;
  onTimespanChange: (timespan: Timespan) => void;
  isLoading: boolean;
  error: string | null;
  getItemIconUrl: (iconName: string) => string;
  showChartGrid: boolean;
  showChartLineGlow: boolean;
}

export const ItemDisplay: React.FC<ItemDisplayProps> = ({
  item,
  latestPrice,
  historicalData,
  selectedTimespan,
  onTimespanChange,
  isLoading,
  error,
  getItemIconUrl,
  showChartGrid,
  showChartLineGlow
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start p-4 bg-[var(--bg-secondary-alpha)] rounded-lg gap-4">
        <img 
          src={getItemIconUrl(item.icon)} 
          alt={item.name} 
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain flex-shrink-0"
          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/96?text=No+Icon')}
        />
        <div className="text-center sm:text-left">
          <h2 className="text-3xl font-bold text-[var(--text-accent)]">{item.name}</h2>
          {item.examine && <p className="text-sm text-[var(--text-secondary)] mt-1 italic">"{item.examine}"</p>}
          <p className="text-sm text-[var(--text-primary)] mt-1">
            <span className="font-semibold">Buy Limit:</span> {item.limit !== undefined ? item.limit.toLocaleString() : 'N/A'}
          </p>
          {latestPrice && (
            <div className="mt-3 text-lg">
              <p>
                <span className="font-semibold">High:</span>{' '}
                <span className="text-[var(--price-high)]">{latestPrice.high ? latestPrice.high.toLocaleString() : 'N/A'} GP</span>
                {latestPrice.highTime && <span className="text-xs text-[var(--text-muted)] ml-1">({new Date(latestPrice.highTime * 1000).toLocaleTimeString()})</span>}
              </p>
              <p>
                <span className="font-semibold">Low:</span>{' '}
                <span className="text-[var(--price-low)]">{latestPrice.low ? latestPrice.low.toLocaleString() : 'N/A'} GP</span>
                {latestPrice.lowTime && <span className="text-xs text-[var(--text-muted)] ml-1">({new Date(latestPrice.lowTime * 1000).toLocaleTimeString()})</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner />
          <p className="mt-2 text-[var(--text-secondary)]">Loading price data...</p>
        </div>
      )}
      {error && !isLoading && <p className="text-[var(--price-low)] text-center py-4">{error}</p>}
      
      {!isLoading && !error && (
        <>
          <TimespanSelector selectedTimespan={selectedTimespan} onSelectTimespan={onTimespanChange} />
          <div className="h-80 md:h-96 w-full">
            {historicalData.length > 0 ? (
              <PriceChart data={historicalData} showGrid={showChartGrid} showLineGlow={showChartLineGlow} />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                <p>No historical data available for this timespan.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
