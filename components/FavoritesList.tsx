
import React, { useMemo } from 'react';
import { ItemMapInfo, FavoriteItemId, LatestPriceData, FavoriteItemHourlyChangeState, FavoriteItemHourlyChangeData, WordingPreference, FavoriteItemSparklineState, SectionRenderProps } from '../src/types'; // Corrected path
import { BellIcon, ChevronDownIcon, EmptyHeartIcon } from './Icons'; // Changed FilledHeartIcon to EmptyHeartIcon
import { FavoriteItemSparkline } from './FavoriteItemSparkline';

interface FavoritesListProps extends SectionRenderProps { // Inherit drag props
  favoriteItemIds: FavoriteItemId[];
  allItems: ItemMapInfo[];
  onSelectItemById: (itemId: FavoriteItemId) => void;
  onRemoveFavorite: (itemId: FavoriteItemId) => void;
  getItemIconUrl: (iconName: string) => string;
  favoriteItemPrices: Record<FavoriteItemId, LatestPriceData | null | 'loading' | 'error'>;
  favoriteItemHourlyChanges: Record<FavoriteItemId, FavoriteItemHourlyChangeState>;
  favoriteItemSparklineData: Record<FavoriteItemId, FavoriteItemSparklineState>;
  showFavoriteSparklines: boolean;
  wordingPreference: WordingPreference;
  isRefreshingFavorites: boolean;
  onRefreshAllFavorites: () => Promise<void>;
  isConsentGranted: boolean;
  onQuickSetAlert: (item: ItemMapInfo) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const RemoveFavoriteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshFavIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const SmallSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
);

const formatPriceShorthand = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return 'N/A';
  if (Math.abs(price) >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(price) >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (Math.abs(price) >= 1_000) return `${(price / 1_000).toFixed(0)}K`;
  return price.toLocaleString();
};

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favoriteItemIds,
  allItems,
  onSelectItemById,
  onRemoveFavorite,
  getItemIconUrl,
  favoriteItemPrices,
  favoriteItemHourlyChanges,
  favoriteItemSparklineData,
  showFavoriteSparklines,
  wordingPreference,
  isRefreshingFavorites,
  onRefreshAllFavorites,
  isConsentGranted,
  onQuickSetAlert,
  isCollapsed,
  onToggleCollapse,
  sectionId,
  isDragAndDropEnabled,
  handleDragStart,
  draggedItem,
  currentHeight, 
  isResizable, 
  onResizeMouseDown,
}) => {
  const favoriteItems = useMemo(() => {
    return favoriteItemIds
      .map(id => allItems.find(item => item.id === id))
      .filter((item): item is ItemMapInfo => Boolean(item)) 
      .sort((a,b) => a.name.localeCompare(b.name)); 
  }, [favoriteItemIds, allItems]);

  const favTermTitle = wordingPreference === 'uk' ? 'Favourite Items' : 'Favorite Items';
  const favTermEmpty = wordingPreference === 'uk' ? 'favourite' : 'favorite';
  const favTermRemove = wordingPreference === 'uk' ? 'favourites' : 'favorites';

  const getButtonCursorClass = () => {
    if (isDragAndDropEnabled) {
      return draggedItem === sectionId ? 'cursor-grabbing' : 'cursor-grab';
    }
    return '';
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl">
      <button
        onClick={onToggleCollapse}
        draggable={isDragAndDropEnabled}
        onDragStart={(e) => handleDragStart(e, sectionId)}
        aria-grabbed={isDragAndDropEnabled && draggedItem === sectionId ? 'true' : 'false'}
        className={`${getButtonCursorClass()} w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] transition-colors ${!isCollapsed ? 'rounded-t-lg hover:bg-[var(--bg-tertiary)]/70' : 'rounded-lg hover:bg-[var(--bg-tertiary)]/50'}`}
        aria-expanded={!isCollapsed}
        aria-controls={`${sectionId}-content-wrapper`}
      >
        <div className="flex-grow flex items-center min-w-0">
          <EmptyHeartIcon className="w-6 h-6 text-[var(--text-accent)] mr-3 pointer-events-none flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-[var(--text-accent)] pointer-events-none">{favTermTitle}</h2>
          {isConsentGranted && favoriteItems.length > 0 && !isCollapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRefreshAllFavorites(); }}
              draggable="false" 
              disabled={isRefreshingFavorites}
              className="ml-3 p-1.5 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh favorite items prices"
              title="Refresh favorite items prices"
            >
              {isRefreshingFavorites ? <SmallSpinner /> : <RefreshFavIcon className="w-5 h-5" />}
            </button>
          )}
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 pointer-events-none ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="rounded-b-lg">
          <div 
            id={`${sectionId}-content-wrapper`} 
            className="p-4 md:p-6"
            style={{ 
              maxHeight: isResizable ? `${currentHeight}px` : undefined, 
              overflowY: 'auto',
              transition: isResizable ? 'max-height 0.1s linear' : 'none',
            }}
          >
            {!isConsentGranted ? (
              <p className="text-[var(--text-secondary)] text-center py-3">
                Enable preference storage in settings to use {favTermEmpty}s.
              </p>
            ) : favoriteItems.length === 0 ? (
              <div className="relative flex flex-col items-center justify-center text-center py-8 text-[var(--text-secondary)] overflow-hidden">
                <EmptyHeartIcon className="absolute w-28 h-28 text-[var(--bg-tertiary)] opacity-70" />
                <div className="relative">
                  <p className="font-semibold text-base text-[var(--text-primary)]">No {favTermEmpty} items yet</p>
                  <p className="text-sm mt-1 text-[var(--text-secondary)]">
                    Click the <EmptyHeartIcon className="w-4 h-4 inline-block align-text-bottom mx-0.5" /> icon on an item to add it here.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {favoriteItems.map(item => {
                  const priceState = favoriteItemPrices[item.id];
                  const hourlyChangeState = favoriteItemHourlyChanges[item.id];
                  const sparklineState = favoriteItemSparklineData[item.id];
                  
                  const isPriceLoadingOrInitial = priceState === undefined || priceState === 'loading';
                  const isHourlyChangeLoadingOrInitial = hourlyChangeState === undefined || hourlyChangeState === 'loading';
                  const isSparklineLoadingOrInitial = sparklineState === undefined || sparklineState === 'loading';

                  const showUnifiedLoadingPlaceholder = isPriceLoadingOrInitial || isHourlyChangeLoadingOrInitial || isSparklineLoadingOrInitial;

                  let displayPrice: string = '';
                  let priceColorClass = 'text-[var(--text-muted)]';
                  let displayHourlyChange: string = '';
                  let hourlyChangeColorClass = 'text-[var(--text-muted)]';

                  if (!showUnifiedLoadingPlaceholder) {
                    if (priceState === 'error') {
                      displayPrice = 'Price Error';
                      priceColorClass = 'text-[var(--price-low)]';
                    } else if (priceState === null) {
                      displayPrice = 'N/A';
                    } else if (typeof priceState === 'object' && priceState !== null) {
                      displayPrice = formatPriceShorthand(priceState.high) + ' GP';
                      priceColorClass = 'text-[var(--text-primary)]';
                    } else { 
                        displayPrice = 'N/A'; 
                    }

                    if (hourlyChangeState === 'error') {
                      displayHourlyChange = '(chg err)';
                      hourlyChangeColorClass = 'text-[var(--price-low)]';
                    } else if (hourlyChangeState === 'no_data' || hourlyChangeState === null) {
                      displayHourlyChange = '(chg N/A)';
                    } else { 
                      const changeData = hourlyChangeState as FavoriteItemHourlyChangeData;
                      const absChangeFormatted = formatPriceShorthand(changeData.changeAbsolute);
                      displayHourlyChange = `(${changeData.changeAbsolute >= 0 ? '+' : ''}${absChangeFormatted})`;
                      if (changeData.changeAbsolute > 0) hourlyChangeColorClass = 'text-[var(--price-high)]';
                      else if (changeData.changeAbsolute < 0) hourlyChangeColorClass = 'text-[var(--price-low)]';
                    }
                  }

                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-input-secondary)] transition-colors group"
                    >
                      <button
                        onClick={() => onSelectItemById(item.id)}
                        className="flex items-center space-x-2 flex-grow text-left focus:outline-none min-w-0" 
                        aria-label={`View details for ${item.name}`}
                      >
                        <img
                          loading="lazy"
                          src={getItemIconUrl(item.icon)}
                          alt="" 
                          className="w-8 h-8 object-contain flex-shrink-0"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        <div className="flex-grow min-w-0"> 
                          <span className="block text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors text-sm font-medium truncate">
                            {item.name}
                          </span>
                          {showUnifiedLoadingPlaceholder ? (
                            <div className="flex items-center justify-start h-8 text-[var(--text-muted)]"> 
                              <SmallSpinner />
                            </div>
                          ) : (
                            <div className="flex items-end space-x-2 mt-0.5"> 
                              <div className="flex-shrink-0"> 
                                <span className={`block text-xs ${priceColorClass} transition-colors`}>
                                  {displayPrice}
                                </span>
                                {displayHourlyChange && (
                                  <span className={`block text-[0.65rem] ${hourlyChangeColorClass} transition-colors`}>
                                    {displayHourlyChange}
                                  </span>
                                )}
                              </div>
                              {showFavoriteSparklines && (
                                <div className="flex-grow h-8 w-20 min-w-[5rem]"> 
                                  <FavoriteItemSparkline data={sparklineState} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex flex-shrink-0 items-center ml-1"> 
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            onQuickSetAlert(item);
                          }}
                          className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-accent)] hover:bg-[var(--text-accent)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--text-accent)] transition-colors"
                          aria-label={`Set price alert for ${item.name}`}
                          title={`Set price alert for ${item.name}`}
                        >
                          <BellIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onRemoveFavorite(item.id)}
                          className="ml-1 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--price-low)] hover:bg-[var(--price-low)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--price-low)] transition-colors"
                          aria-label={`Remove ${item.name} from ${favTermRemove}`}
                        >
                          <RemoveFavoriteIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {isConsentGranted && favoriteItems.length > 0 && showFavoriteSparklines && (
              <p className="text-xs text-[var(--text-muted)] text-center pt-3 mt-2 border-t border-[var(--border-primary)]">
                Note: Price changes shown are for the last hour. Sparklines show ~1hr trend.
              </p>
            )}
            {isConsentGranted && favoriteItems.length > 0 && !showFavoriteSparklines && (
              <p className="text-xs text-[var(--text-muted)] text-center pt-3 mt-2 border-t border-[var(--border-primary)]">
                Note: Price changes shown are for the last hour.
              </p>
            )}
          </div>
          {isResizable && (
            <div
              className="section-resize-handle"
              onMouseDown={(e) => onResizeMouseDown(e, sectionId)}
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize ${favTermTitle} section`}
              title="Drag to resize section"
            />
          )}
        </div>
      )}
    </div>
  );
};
