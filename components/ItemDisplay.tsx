
import React, { useState, useEffect } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, Timespan, FavoriteItemId, WordingPreference } from '../types';
import { PriceChart } from './PriceChart';
import { TimespanSelector } from './TimespanSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { ITEM_IMAGE_BASE_URL } from '../constants';
import { EmptyHeartIcon, FilledHeartIcon, BellIcon } from './Icons'; // Import from shared Icons.tsx

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
  onSetAlertForItem: (item: ItemMapInfo) => void;
  isConsentGranted: boolean; 
}

export const ItemDisplay: React.FC<ItemDisplayProps> = ({
  item,
  latestPrice,
  historicalData,
  selectedTimespan,
  onTimespanChange,
  isLoading,
  error,
  // getItemIconUrl, // No longer directly used for item's main image display if handling detail/base internally
  showChartGrid,
  showChartLineGlow,
  showVolumeChart,
  favoriteItemIds,
  onAddFavorite,
  onRemoveFavorite,
  wordingPreference,
  onSetAlertForItem,
  isConsentGranted,
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
    return null; 
  }

  const isFavorited = favoriteItemIds.includes(item.id);
  const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';

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
          key={item.id} // Ensure re-render on item change for error handling logic
          src={currentImageUrl}
          alt={item.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain flex-shrink-0"
          onError={handleImageError}
        />
        <div className="text-center sm:text-left flex-grow">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-3xl font-bold text-[var(--text-accent)]">{item.name}</h2>
            {isConsentGranted && (
              <>
                <button
                  onClick={handleToggleFavorite}
                  aria-pressed={isFavorited}
                  aria-label={isFavorited ? `Remove ${item.name} from ${favTerm}` : `Add ${item.name} to ${favTerm}`}
                  className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                  title={isFavorited ? `Remove from ${favTerm}` : `Add to ${favTerm}`}
                >
                  {isFavorited ? (
                    <FilledHeartIcon className="w-7 h-7 text-[var(--favorite-icon-favorited)]" />
                  ) : (
                    <EmptyHeartIcon className="w-7 h-7 text-[var(--favorite-icon-default)] hover:text-[var(--favorite-icon-favorited)]" />
                  )}
                </button>
                <button
                  onClick={() => onSetAlertForItem(item)}
                  aria-label={`Set price alert for ${item.name}`}
                  className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                  title={`Set price alert for ${item.name}`}
                >
                  <BellIcon className="w-7 h-7 text-[var(--icon-button-default-text)] hover:text-[var(--text-accent)]" />
                </button>
              </>
            )}
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
