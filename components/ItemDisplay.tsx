
import React, { useState, useEffect } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, Timespan, FavoriteItemId, WordingPreference } from '../types';
import { PriceChart } from './PriceChart';
import { TimespanSelector } from './TimespanSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { ITEM_IMAGE_BASE_URL } from '../constants';

interface ItemDisplayProps {
  item: ItemMapInfo | null;
  latestPrice: LatestPriceData | null;
  historicalData: ChartDataPoint[];
  selectedTimespan: Timespan;
  onTimespanChange: (timespan: Timespan) => void;
  isLoading: boolean;
  error: string | null;
  getItemIconUrl: (iconName: string) => string;
  showChartGrid: boolean;
  showChartLineGlow: boolean;
  showVolumeChart: boolean;
  favoriteItemIds: FavoriteItemId[];
  onAddFavorite: (itemId: FavoriteItemId) => void;
  onRemoveFavorite: (itemId: FavoriteItemId) => void;
  wordingPreference: WordingPreference;
}

const EmptyHeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const FilledHeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.004-.004.001a.752.752 0 01-.704 0l-.003-.001z" />
  </svg>
);


export const ItemDisplay: React.FC<ItemDisplayProps> = ({
  item,
  latestPrice,
  historicalData,
  selectedTimespan,
  onTimespanChange,
  isLoading,
  error,
  // getItemIconUrl, // No longer directly used for the main image
  showChartGrid,
  showChartLineGlow,
  showVolumeChart,
  favoriteItemIds,
  onAddFavorite,
  onRemoveFavorite,
  wordingPreference,
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('https://via.placeholder.com/96?text=No+Icon');
  const [hasAttemptedDetail, setHasAttemptedDetail] = useState<boolean>(false);

  useEffect(() => {
    if (item && item.icon) {
      const baseIconFilename = item.icon.replace(/ /g, '_');
      const detailIconFilename = baseIconFilename.replace(/\.png$/i, '_detail.png');
      
      setCurrentImageUrl(`${ITEM_IMAGE_BASE_URL}${detailIconFilename}`);
      setHasAttemptedDetail(true);
    } else {
      setCurrentImageUrl('https://via.placeholder.com/96?text=No+Icon');
      setHasAttemptedDetail(false);
    }
  }, [item]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (item && item.icon && hasAttemptedDetail) { 
      const baseIconFilename = item.icon.replace(/ /g, '_');
      setCurrentImageUrl(`${ITEM_IMAGE_BASE_URL}${baseIconFilename}`);
      setHasAttemptedDetail(false); 
    } else { 
      if (e.currentTarget.src !== 'https://via.placeholder.com/96?text=No+Icon') {
         e.currentTarget.src = 'https://via.placeholder.com/96?text=No+Icon';
      }
    }
  };

  if (!item) {
    // This placeholder is now handled in App.tsx to include wordingPreference
    return null; 
  }

  const isFavorited = favoriteItemIds.includes(item.id);
  const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';
  const favTermSingular = wordingPreference === 'uk' ? 'favourite' : 'favorite';


  const handleToggleFavorite = () => {
    if (isFavorited) {
      onRemoveFavorite(item.id);
    } else {
      onAddFavorite(item.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start p-4 bg-[var(--bg-secondary-alpha)] rounded-lg gap-4">
        <img
          key={item.id}
          src={currentImageUrl}
          alt={item.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain flex-shrink-0"
          onError={handleImageError}
        />
        <div className="text-center sm:text-left flex-grow">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-3xl font-bold text-[var(--text-accent)]">{item.name}</h2>
            <button
              onClick={handleToggleFavorite}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? `Remove ${item.name} from ${favTerm}` : `Add ${item.name} to ${favTerm}`}
              className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
            >
              {isFavorited ? (
                <FilledHeartIcon className="w-7 h-7 text-[var(--favorite-icon-favorited)]" />
              ) : (
                <EmptyHeartIcon className="w-7 h-7 text-[var(--favorite-icon-default)] hover:text-[var(--favorite-icon-favorited)]" />
              )}
            </button>
          </div>
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
          <div className="h-[500px] md:h-[600px] w-full">
            {historicalData.length > 0 ? (
              <PriceChart 
                data={historicalData} 
                showGrid={showChartGrid} 
                showLineGlow={showChartLineGlow}
                showVolumeChart={showVolumeChart} 
              />
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