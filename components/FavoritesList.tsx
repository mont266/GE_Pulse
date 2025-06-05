
import React, { useMemo } from 'react';
import { ItemMapInfo, FavoriteItemId, LatestPriceData, FavoriteItemHourlyChangeState, FavoriteItemHourlyChangeData, WordingPreference } from '../types';

interface FavoritesListProps {
  favoriteItemIds: FavoriteItemId[];
  allItems: ItemMapInfo[];
  onSelectItemById: (itemId: FavoriteItemId) => void;
  onRemoveFavorite: (itemId: FavoriteItemId) => void;
  getItemIconUrl: (iconName: string) => string;
  favoriteItemPrices: Record<FavoriteItemId, LatestPriceData | null | 'loading' | 'error'>;
  favoriteItemHourlyChanges: Record<FavoriteItemId, FavoriteItemHourlyChangeState>;
  wordingPreference: WordingPreference;
  isRefreshingFavorites: boolean;
  onRefreshAllFavorites: () => Promise<void>;
  isConsentGranted: boolean; // New prop
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
  wordingPreference,
  isRefreshingFavorites,
  onRefreshAllFavorites,
  isConsentGranted,
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


  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-[var(--text-accent)]">{favTermTitle}</h2>
        {isConsentGranted && favoriteItems.length > 0 && (
          <button
            onClick={onRefreshAllFavorites}
            disabled={isRefreshingFavorites}
            className="p-1.5 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh favorite items prices"
            title="Refresh favorite items prices"
          >
            {isRefreshingFavorites ? <SmallSpinner /> : <RefreshFavIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      {!isConsentGranted ? (
         <p className="text-[var(--text-secondary)] text-center py-3">
          Enable preference storage in settings to use {favTermEmpty}s.
        </p>
      ) : favoriteItems.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-center py-3">
          No {favTermEmpty} items yet. Click the <span className="inline-block align-middle mx-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--favorite-icon-default)" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </span> icon on an item's page to add it!
        </p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {favoriteItems.map(item => {
            const priceState = favoriteItemPrices[item.id];
            const hourlyChangeState = favoriteItemHourlyChanges[item.id];
            
            let displayPrice: string;
            let priceColorClass = 'text-[var(--text-muted)]';

            if (priceState === 'loading') {
              displayPrice = 'Loading...';
            } else if (priceState === 'error') {
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

            let displayHourlyChange: string = '';
            let hourlyChangeColorClass = 'text-[var(--text-muted)]';

            if (hourlyChangeState === 'loading') {
              displayHourlyChange = '(...chg)';
            } else if (hourlyChangeState === 'error') {
              displayHourlyChange = '(chg err)';
              hourlyChangeColorClass = 'text-[var(--price-low)]';
            } else if (hourlyChangeState === 'no_data') {
              displayHourlyChange = '(chg N/A)';
            } else if (typeof hourlyChangeState === 'object' && hourlyChangeState !== null) {
              const changeData = hourlyChangeState as FavoriteItemHourlyChangeData;
              const absChangeFormatted = formatPriceShorthand(changeData.changeAbsolute);
              displayHourlyChange = `(${changeData.changeAbsolute >= 0 ? '+' : ''}${absChangeFormatted})`;
              if (changeData.changeAbsolute > 0) hourlyChangeColorClass = 'text-[var(--price-high)]';
              else if (changeData.changeAbsolute < 0) hourlyChangeColorClass = 'text-[var(--price-low)]';
            }


            return (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-input-secondary)] transition-colors group"
              >
                <button
                  onClick={() => onSelectItemById(item.id)}
                  className="flex items-center space-x-3 flex-grow text-left focus:outline-none min-w-0"
                  aria-label={`View details for ${item.name}`}
                >
                  <img
                    src={getItemIconUrl(item.icon)}
                    alt="" 
                    className="w-8 h-8 object-contain flex-shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <div className="flex-grow min-w-0">
                    <span className="block text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors text-sm font-medium truncate">
                      {item.name}
                    </span>
                    <div className="flex items-baseline space-x-2">
                      <span className={`block text-xs ${priceColorClass} transition-colors`}>
                        {displayPrice}
                      </span>
                      {displayHourlyChange && (
                        <span className={`block text-[0.65rem] ${hourlyChangeColorClass} transition-colors`}>
                          {displayHourlyChange}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onRemoveFavorite(item.id)}
                  className="ml-2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--price-low)] hover:bg-[var(--price-low)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--price-low)] transition-colors flex-shrink-0"
                  aria-label={`Remove ${item.name} from ${favTermRemove}`}
                >
                  <RemoveFavoriteIcon className="w-5 h-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {isConsentGranted && favoriteItems.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] text-center pt-3 mt-2 border-t border-[var(--border-primary)]">
          Note: Price changes shown are for the last hour.
        </p>
      )}
    </div>
  );
};