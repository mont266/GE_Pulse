
import React, { useState, useEffect, useCallback } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, Timespan, FavoriteItemId, WordingPreference } from '../src/types';
import { PriceChart } from './PriceChart';
import { TimespanSelector } from './TimespanSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { ITEM_IMAGE_BASE_URL, TIMESPAN_OPTIONS } from '../constants';
import { EmptyHeartIcon, FilledHeartIcon, BellIcon, ArrowUpIcon, ArrowDownIcon, ShareNetworkIcon, AddToPortfolioIcon } from './Icons'; // Updated ShareIcon to ShareNetworkIcon

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
  onAddToPortfolio: (item: ItemMapInfo) => void; 
  isConsentGranted: boolean; 
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onShareItem?: (item: ItemMapInfo) => void; 
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
  showChartLineGlow,
  showVolumeChart,
  favoriteItemIds,
  onAddFavorite,
  onRemoveFavorite,
  wordingPreference,
  onSetAlertForItem,
  onAddToPortfolio, 
  isConsentGranted,
  addNotification, 
  onShareItem,
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

  const handleShareItemClick = useCallback(async () => {
    if (!item) return;

    try {
      const baseUrl = 'https://beta.gepulse.net/'; 
      const shareUrl = new URL(baseUrl);
      shareUrl.searchParams.set('itemId', item.id.toString());
      const shareableLink = shareUrl.toString();
      
      await navigator.clipboard.writeText(shareableLink);
      addNotification(`Shareable link for ${item.name} copied!`, 'success');
      if (onShareItem) { 
        onShareItem(item);
      }
    } catch (err) {
      console.error('Failed to copy share link:', err);
      addNotification('Failed to copy share link. Please try again.', 'error');
    }
  }, [item, addNotification, onShareItem]);

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

  let fluctuationDisplay = null;
  if (latestPrice && latestPrice.high !== null && historicalData.length > 0) {
    const currentPrice = latestPrice.high;
    const startDataPoint = historicalData[0]; 

    if (startDataPoint && startDataPoint.price !== null) {
      const startPrice = startDataPoint.price;
      const absoluteChange = currentPrice - startPrice;
      const absOnlyValue = Math.abs(absoluteChange);
      const sign = absoluteChange >= 0 ? '+' : '';
      
      let percentageChangeText = '';
      if (startPrice !== 0) {
        const percentage = (absoluteChange / startPrice) * 100;
        percentageChangeText = ` (${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%)`;
      }

      const fullAbsoluteChangeTextForTooltip = `${sign}${absOnlyValue.toLocaleString()} GP`;
      let shorthandAbsoluteChangeTextForDisplay: string;

      if (absOnlyValue >= 1_000_000_000) {
        shorthandAbsoluteChangeTextForDisplay = `${sign}${(absOnlyValue / 1_000_000_000).toFixed(1)}B GP`;
      } else if (absOnlyValue >= 1_000_000) {
        shorthandAbsoluteChangeTextForDisplay = `${sign}${(absOnlyValue / 1_000_000).toFixed(1)}M GP`;
      } else if (absOnlyValue >= 1_000) {
        shorthandAbsoluteChangeTextForDisplay = `${sign}${(absOnlyValue / 1_000).toFixed(0)}K GP`;
      } else {
        shorthandAbsoluteChangeTextForDisplay = `${sign}${absOnlyValue.toLocaleString()} GP`;
      }
      
      let colorClass = 'text-[var(--text-secondary)]';
      let IconComponent: React.FC<{ className?: string }> | (() => JSX.Element) = () => <span className="w-4 h-4 mr-1.5 flex-shrink-0 inline-flex items-center justify-center">—</span>;

      if (absoluteChange > 0) {
        colorClass = 'text-[var(--price-high)]';
        IconComponent = ArrowUpIcon;
      } else if (absoluteChange < 0) {
        colorClass = 'text-[var(--price-low)]';
        IconComponent = ArrowDownIcon;
      }
      
      const timespanLabel = TIMESPAN_OPTIONS.find(opt => opt.value === selectedTimespan)?.label || selectedTimespan;

      fluctuationDisplay = (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-[var(--text-secondary)] mb-0.5">
            Fluctuation ({timespanLabel}):
          </p>
          <div className={`flex items-center text-base ${colorClass}`}>
            <IconComponent className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="font-semibold" title={fullAbsoluteChangeTextForTooltip}>
              {shorthandAbsoluteChangeTextForDisplay}
            </span>
            {percentageChangeText && (
              <span className="ml-2 text-xs font-normal">
                {percentageChangeText}
              </span>
            )}
          </div>
        </div>
      );
    }
  }

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
              onClick={handleShareItemClick}
              aria-label={`Share link for ${item.name}`}
              className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
              title={`Share link for ${item.name}`}
            >
              <ShareNetworkIcon className="w-7 h-7 text-[var(--icon-button-default-text)] hover:text-[var(--text-accent)]" />
            </button>
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
                <button
                  onClick={() => onAddToPortfolio(item)}
                  aria-label={`Add ${item.name} to portfolio`}
                  className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                  title={`Add to Portfolio`}
                >
                  <AddToPortfolioIcon className="w-7 h-7 text-[var(--icon-button-default-text)] hover:text-[var(--text-accent)]" />
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
          {fluctuationDisplay}
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