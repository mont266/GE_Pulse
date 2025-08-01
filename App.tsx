

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, PriceAlert, Timespan, NotificationMessage, AppTheme, TimespanAPI, FavoriteItemId, FavoriteItemHourlyChangeData, FavoriteItemHourlyChangeState, WordingPreference, FavoriteItemSparklineState, ChartDataPoint as SparklineDataPoint, TopMoversTimespan, SectionRenderProps, TopMoversData, TopMoversCalculationMode, TopMoversMetricType, PortfolioEntry, LatestPriceApiResponse, DriveFeedback, SectionHeights, PortfolioSummaryProps } from './src/types';
import { fetchItemMapping, fetchLatestPrice, fetchHistoricalData } from './services/runescapeService';
import { googleDriveService } from './services/googleDriveService';
import { SearchBar } from './components/SearchBar';
import { ItemList } from './components/ItemList';
import { ItemDisplay } from './components/ItemDisplay';
import { AlertsManager } from './components/AlertsManager';
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationBar } from './components/NotificationBar';
import { RefreshControls } from './components/RefreshControls';
import { SettingsModal } from './src/components/SettingsModal';
import { FavoritesList } from './components/FavoritesList';
import { ConsentBanner } from './components/ConsentBanner';
import { ChangelogModal } from './src/components/ChangelogModal';
import { PrivacyPolicyModal } from './src/components/PrivacyPolicyModal'; 
import { SetAlertModal } from './components/SetAlertModal'; 
import { FeedbackModal } from './components/FeedbackModal'; 
import { TopMoversSection } from './components/TopMoversSection';
import { PortfolioModal } from './components/PortfolioModal';
import { AddInvestmentFromViewModal } from './components/portfolio/AddInvestmentFromViewModal'; 
import { changelogEntries } from './src/changelogData'; 
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { useTopMovers } from './hooks/useTopMovers';
import { usePortfolio } from './hooks/usePortfolio';
import { ChevronDownIcon, SettingsIcon, ReorderIcon, ReorderDisabledIcon, SearchIcon, EmptyHeartIcon, BellIcon, TrendingUpIcon, PortfolioIcon, AddToPortfolioIcon } from './components/Icons'; 
import { 
  API_BASE_URL, ITEM_IMAGE_BASE_URL, AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_SECONDS, APP_THEMES, 
  FAVORITES_STORAGE_KEY, WORDING_PREFERENCE_STORAGE_KEY, DEFAULT_WORDING_PREFERENCE, CONSENT_STORAGE_KEY,
  ALL_USER_PREFERENCE_KEYS, DEFAULT_THEME_ID, CHART_GRID_STORAGE_KEY, CHART_LINE_GLOW_STORAGE_KEY,
  VOLUME_CHART_STORAGE_KEY, ACTIVE_THEME_STORAGE_KEY, DESKTOP_NOTIFICATIONS_ENABLED_KEY,
  IN_APP_ALERT_SOUNDS_ENABLED_KEY, DEFAULT_IN_APP_ALERT_SOUNDS_ENABLED,
  FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY, SIDEBAR_ORDER_STORAGE_KEY, DEFAULT_SIDEBAR_ORDER, SECTION_KEYS,
  DRAG_DROP_ENABLED_STORAGE_KEY, DEFAULT_TOP_MOVERS_CALCULATION_MODE, DEFAULT_TOP_MOVERS_METRIC_TYPE,
  PORTFOLIO_STORAGE_KEY, RSN_STORAGE_KEY, SECTION_HEIGHTS_STORAGE_KEY, DEFAULT_SECTION_HEIGHT_PX,
  MIN_SECTION_HEIGHT_PX, MAX_SECTION_HEIGHT_PX, DESKTOP_BREAKPOINT_RESIZE,
  LAST_SEEN_CHANGELOG_VERSION_STORAGE_KEY, ITEM_MAPPING_CACHE_KEY, ITEM_MAPPING_TIMESTAMP_KEY, CACHE_DURATION_MS
} from './constants'; 
import { DragEvent } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const getInitialConsentStatus = (): 'pending' | 'granted' | 'denied' => {
  const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (storedConsent === 'granted' || storedConsent === 'denied') {
    return storedConsent;
  }
  return 'pending';
};

const APP_VERSION = "Beta v0.15"; 

let audioContextInstance: AudioContext | null = null;
let isAudioContextInitialized = false;

const initializeAudioContextSafely = () => {
  if (!isAudioContextInitialized && typeof window !== 'undefined' && window.AudioContext) {
    try {
      audioContextInstance = new window.AudioContext();
      isAudioContextInitialized = true;
      console.log("AudioContext initialized for alert sounds.");
    } catch (e) {
      console.error("Failed to initialize AudioContext for alert sounds:", e);
      isAudioContextInitialized = false;
      audioContextInstance = null;
    }
  }
};

const playAlertSound = () => {
  // initializeAudioContextSafely(); // This call is removed. AudioContext must be initialized by a user gesture.

  if (!audioContextInstance || !isAudioContextInitialized) {
    console.warn("AudioContext not available or not initialized. Cannot play alert sound.");
    return;
  }

  if (audioContextInstance.state === 'suspended') {
    audioContextInstance.resume().catch(err => console.warn("Could not resume AudioContext:", err));
  }

  if (audioContextInstance.state !== 'running') {
     console.warn("AudioContext is not running. Alert sound suppressed.");
     return;
  }

  try {
    const oscillator = audioContextInstance.createOscillator();
    const gainNode = audioContextInstance.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextInstance.destination);

    oscillator.type = 'triangle'; 
    oscillator.frequency.setValueAtTime(1046.50, audioContextInstance.currentTime); 

    const now = audioContextInstance.currentTime;
    gainNode.gain.setValueAtTime(0.25, now); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5); 

    oscillator.start(now);
    oscillator.stop(now + 0.5); 
  } catch (error) {
    console.error("Error playing alert sound:", error);
  }
};


interface SearchSectionLayoutProps extends SectionRenderProps {
  isSearchSectionCollapsed: boolean;
  toggleSearchSection: () => void;
  searchBarWrapperRef: React.RefObject<HTMLDivElement>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  activeDescendantId?: string;
  filteredItems: ItemMapInfo[];
  itemListWrapperRef: React.RefObject<HTMLDivElement>;
  handleSelectItem: (item: ItemMapInfo, origin?: string) => void; 
  getItemIconUrl: (iconName: string) => string;
  activeSuggestionIndex: number;
  favoriteItemIds: FavoriteItemId[];
  handleToggleFavoriteQuickAction: (itemId: FavoriteItemId) => void;
  wordingPreference: WordingPreference;
  isConsentGranted: boolean;
  isLoadingItems: boolean;
  searchInputRef: React.Ref<HTMLInputElement>;
}

const SearchSectionLayout = React.memo(function SearchSectionLayout({
  sectionId, isDragAndDropEnabled, handleDragStart, draggedItem,
  currentHeight, isResizable, onResizeMouseDown, // New props for resizing
  isSearchSectionCollapsed, toggleSearchSection, searchBarWrapperRef, searchTerm, setSearchTerm, handleSearchKeyDown,
  activeDescendantId, filteredItems, itemListWrapperRef, handleSelectItem, getItemIconUrl, activeSuggestionIndex,
  favoriteItemIds, handleToggleFavoriteQuickAction, wordingPreference, isConsentGranted, isLoadingItems,
  searchInputRef
}: SearchSectionLayoutProps) {
  const getButtonCursorClass = (currentSectionId: string) => {
    if (isDragAndDropEnabled) {
      return draggedItem === currentSectionId ? 'cursor-grabbing' : 'cursor-grab';
    }
    return '';
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl">
      <button
        onClick={toggleSearchSection}
        draggable={isDragAndDropEnabled}
        onDragStart={(e) => handleDragStart(e, sectionId)}
        aria-grabbed={isDragAndDropEnabled && draggedItem === sectionId ? 'true' : 'false'}
        className={`${getButtonCursorClass(sectionId)} w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] transition-colors ${!isSearchSectionCollapsed ? 'rounded-t-lg hover:bg-[var(--bg-tertiary)]/70' : 'rounded-lg hover:bg-[var(--bg-tertiary)]/50'}`}
        aria-expanded={!isSearchSectionCollapsed}
        aria-controls={`${sectionId}-content-wrapper`}
      >
        <div className="flex-grow flex items-center min-w-0">
          <SearchIcon className="w-6 h-6 text-[var(--text-accent)] mr-3 pointer-events-none flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-[var(--text-accent)] pointer-events-none">Search Item</h2>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 pointer-events-none ${isSearchSectionCollapsed ? '-rotate-90' : ''}`} />
      </button>
      {!isSearchSectionCollapsed && (
        <div className="rounded-b-lg">
          <div 
            id={`${sectionId}-content-wrapper`} 
            className="p-4 md:p-6 space-y-4"
            style={{ 
              maxHeight: isResizable ? `${currentHeight}px` : undefined, 
              overflowY: 'auto',
              transition: isResizable ? 'max-height 0.1s linear' : 'none', // Smooth transition only if not actively resizing via JS
            }}
          >
            <div ref={searchBarWrapperRef}>
              <SearchBar
                ref={searchInputRef}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onKeyDownHandler={handleSearchKeyDown}
                activeDescendantId={activeDescendantId}
                filteredItemsCount={filteredItems.length}
              />
            </div>
            {searchTerm && filteredItems.length > 0 && (
              <div ref={itemListWrapperRef}>
                <ItemList
                  items={filteredItems}
                  onSelectItem={(item) => handleSelectItem(item, 'search_results')}
                  getItemIconUrl={getItemIconUrl}
                  activeSuggestionIndex={activeSuggestionIndex}
                  favoriteItemIds={favoriteItemIds}
                  onToggleFavoriteQuickAction={handleToggleFavoriteQuickAction}
                  wordingPreference={wordingPreference}
                  isConsentGranted={isConsentGranted}
                />
              </div>
            )}
            {searchTerm && filteredItems.length === 0 && !isLoadingItems && (
              <p className="text-[var(--text-secondary)]">No items found matching "{searchTerm}".</p>
            )}
          </div>
          {isResizable && (
            <div
              className="section-resize-handle"
              onMouseDown={(e) => onResizeMouseDown(e, sectionId)}
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize Search Item section`}
              title="Drag to resize section"
            />
          )}
        </div>
      )}
    </div>
  );
});

// ... (Keep FavoritesListProps, TopMoversSectionProps, AlertsManagerProps interfaces similar, they will also get new resize props via SectionRenderProps) ...
interface FavoritesListProps extends SectionRenderProps {
  favoriteItemIds: FavoriteItemId[];
  allItems: ItemMapInfo[];
  onSelectItemById: (itemId: FavoriteItemId, origin?: string) => void; 
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

interface TopMoversSectionProps extends SectionRenderProps {
  topMoversData: TopMoversData | null;
  isLoading: boolean;
  error: string | null;
  selectedTimespan: TopMoversTimespan;
  onSetTimespan: (timespan: TopMoversTimespan) => void;
  onRefresh: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectItemById: (itemId: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number, origin?: string) => void;
  getItemIconUrl: (iconName: string) => string; 
  lastFetchedTimestamp: number;
  topMoversCalculationMode: TopMoversCalculationMode;
  onSetTopMoversCalculationMode: (mode: TopMoversCalculationMode) => void;
  topMoversMetricType: TopMoversMetricType; 
  onSetTopMoversMetricType: (metric: TopMoversMetricType) => void; 
}

interface AlertsManagerProps extends SectionRenderProps {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => void;
  allItems: ItemMapInfo[];
  getItemName: (itemId: number) => string;
  getItemIconUrl: (iconName: string) => string;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSelectAlertItemById: (itemId: number, origin?: string) => void; 
  isConsentGranted: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}


type SpecificAppSectionProps = 
  | SearchSectionLayoutProps 
  | FavoritesListProps 
  | TopMoversSectionProps 
  | AlertsManagerProps;


// Helper function to process a single favorite item's data
const fetchAndProcessFavoriteItemData = async (
  itemId: FavoriteItemId,
  allItemsMap: Map<FavoriteItemId, ItemMapInfo>,
  fetchLPrice: typeof fetchLatestPrice,
  fetchHData: typeof fetchHistoricalData
): Promise<{
  itemId: FavoriteItemId;
  priceDataResult: LatestPriceData | null | 'error'; 
  hourlyChangeResult: FavoriteItemHourlyChangeState; 
  sparklineDataResult: FavoriteItemSparklineState;
}> => {
  const itemDetail = allItemsMap.get(itemId);
  if (!itemDetail) {
    return { itemId, priceDataResult: 'error', hourlyChangeResult: 'error', sparklineDataResult: 'error' };
  }

  try {
    const priceData = await fetchLPrice(itemId);

    if (priceData && priceData.high !== null) {
      try { 
        const oneHourHistoricalData = await fetchHData(itemId, '5m');
        const nowMsSpark = Date.now();
        const oneHourAgoMsThresholdSpark = nowMsSpark - (60 * 60 * 1000);
        const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowMsSpark);
        const sparklineResult: FavoriteItemSparklineState = sparklinePoints.length > 1 ? sparklinePoints : 'no_data';

        let priceThen: number | null = null;
        const sortedHistorical = [...oneHourHistoricalData].sort((a, b) => a.timestamp - b.timestamp);
        const nowMsCalc = Date.now();
        const oneHourAgoMsThresholdCalc = nowMsCalc - (60 * 60 * 1000);

        for (let i = sortedHistorical.length - 1; i >= 0; i--) {
          if (sortedHistorical[i].timestamp <= oneHourAgoMsThresholdCalc) {
            priceThen = sortedHistorical[i].price;
            break;
          }
        }
        if (priceThen === null && sortedHistorical.length > 0) {
          let bestFallbackCandidate: ChartDataPoint | null = null;
          for (let i = sortedHistorical.length - 1; i >= 0; i--) {
            if (sortedHistorical[i].timestamp < oneHourAgoMsThresholdCalc) {
              bestFallbackCandidate = sortedHistorical[i];
              break;
            }
          }
          if (!bestFallbackCandidate && sortedHistorical.length > 0) priceThen = sortedHistorical[0].price;
          else if (bestFallbackCandidate) priceThen = bestFallbackCandidate.price;
        }

        let hourlyChange: FavoriteItemHourlyChangeState;
        if (priceThen !== null && priceData.high !== null) {
          const changeAbsolute = priceData.high - priceThen;
          const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (priceData.high > 0 ? Infinity : 0);
          hourlyChange = { changeAbsolute, changePercent };
        } else {
          hourlyChange = 'no_data';
        }
        return { itemId, priceDataResult: priceData, hourlyChangeResult: hourlyChange, sparklineDataResult: sparklineResult };
      } catch (histErr) {
        console.error(`Failed to fetch historical data for favorite item ${itemId}:`, histErr);
        return { itemId, priceDataResult: priceData, hourlyChangeResult: 'error', sparklineDataResult: 'error' };
      }
    } else {
      return { itemId, priceDataResult: priceData === null ? null : priceData, hourlyChangeResult: 'no_data', sparklineDataResult: 'no_data' };
    }
  } catch (err) {
    console.error(`Failed to fetch latest price for favorite item ${itemId}:`, err);
    return { itemId, priceDataResult: 'error', hourlyChangeResult: 'error', sparklineDataResult: 'error' };
  }
};


const App: React.FC = () => {
  const initialConsent = getInitialConsentStatus();
  const [consentStatus, setConsentStatus] = useState<'pending' | 'granted' | 'denied'>(initialConsent);
  const isConsentGranted = useMemo(() => consentStatus === 'granted', [consentStatus]);

  const [isDevDriveMode, setIsDevDriveMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('devDrive') === 'true';
  });

  useEffect(() => {
    if (isDevDriveMode) {
      console.warn("DEV MODE: Google Drive simulation is active via URL parameter '?devDrive=true'.");
    }
  }, [isDevDriveMode]);


  const trackGaEvent = useCallback((eventName: string, eventParams?: Record<string, any>) => {
    if (isConsentGranted && typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventParams);
    }
  }, [isConsentGranted]);

  const [isGoogleApiInitialized, setIsGoogleApiInitialized] = useState<boolean>(false);
  const [isDriveActionLoading, setIsDriveActionLoading] = useState<boolean>(false);
  const [driveFeedbackForModal, setDriveFeedbackForModal] = useState<DriveFeedback | null>(null);

  useEffect(() => {
    if (isDevDriveMode) {
      console.log("App.tsx: DEV MODE - Skipping Google Drive Service initialization, simulating success.");
      setIsGoogleApiInitialized(true);
      setDriveFeedbackForModal({ message: "DEV MODE: Google Drive is simulated.", type: 'info' });
      return;
    }
    const initDrive = async () => {
      console.log("App.tsx: Starting Google Drive Service initialization...");
      setDriveFeedbackForModal({ message: "Initializing Google Drive...", type: 'info'});
      const success = await googleDriveService.initGoogleDriveService();
      setIsGoogleApiInitialized(success);
      if (!success) {
        const initErrorMessage = "Google Drive features are unavailable. API key or Client ID might be missing, invalid, or the service failed to load. Check console for details.";
        setDriveFeedbackForModal({ message: initErrorMessage, type: 'error' });
        console.error("App.tsx: Google Drive Service initialization failed.");
      } else {
        console.log("App.tsx: Google Drive Service initialized successfully.");
        setDriveFeedbackForModal({ message: "Google Drive initialized.", type: 'success' }); 
        setTimeout(() => setDriveFeedbackForModal(null), 3000); 
      }
    };
    initDrive();
  }, [isDevDriveMode]);


  const [allItems, setAllItems] = useState<ItemMapInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ItemMapInfo | null>(null);
  const [latestPrice, setLatestPrice] = useState<LatestPriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);
  const [selectedTimespan, setSelectedTimespan] = useState<Timespan>('1d');
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  
  const notificationIdCounterRef = useRef(0);
  const favoritesRefreshLockRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    notificationIdCounterRef.current += 1;
    const id = `notif-${notificationIdCounterRef.current}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const {
    portfolioEntries,
    addPortfolioEntry,
    recordSaleAndUpdatePortfolio,
    deletePortfolioEntry,
    clearAllPortfolioData,
    updatePortfolioEntryDetails,
    replacePortfolio, 
  } = usePortfolio(isConsentGranted, addNotification);

  const [userRsn, setUserRsn] = useState<string>(() => {
    if (initialConsent === 'granted') {
      return localStorage.getItem(RSN_STORAGE_KEY) || '';
    }
    return '';
  });
  const prevUserRsn = usePrevious(userRsn);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(RSN_STORAGE_KEY, userRsn);
    }
     if (userRsn !== prevUserRsn && prevUserRsn !== undefined) { // Avoid initial event
      trackGaEvent('set_rsn');
    }
  }, [userRsn, isConsentGranted, prevUserRsn, trackGaEvent]);

  const handleUserRsnChange = useCallback((newRsn: string) => {
    setUserRsn(newRsn);
  }, []);


  const devHandleSaveToDrive = useCallback(async () => {
    setIsDriveActionLoading(true);
    setDriveFeedbackForModal({ message: "Simulating save...", type: 'info' });
    console.log("DEV MODE: Simulating Save to Drive.");
    await new Promise(resolve => setTimeout(resolve, 750));
    setDriveFeedbackForModal({ message: "Portfolio saved to Google Drive! (DEV MODE)", type: 'success' });
    trackGaEvent('portfolio_save_gdrive_success_dev');
    setIsDriveActionLoading(false);
  }, [trackGaEvent]);

  const devHandleLoadFromDrive = useCallback(async () => {
    setIsDriveActionLoading(true);
    setDriveFeedbackForModal({ message: "Simulating load...", type: 'info' });
    console.log("DEV MODE: Simulating Load from Drive with mock data.");
    await new Promise(resolve => setTimeout(resolve, 750)); 

    const mockCannonballEntry: PortfolioEntry = { id: 'dev-cannonball-1', itemId: 2, quantityPurchased: 1000, purchasePricePerItem: 150, purchaseDate: Date.now() - 86400000 * 30, quantitySoldFromThisLot: 0, totalProceedsFromThisLot: 0, totalTaxPaidFromThisLot: 0 };
    const mockRuneScimEntry: PortfolioEntry = { id: 'dev-scim-1', itemId: 1333, quantityPurchased: 5, purchasePricePerItem: 30000, purchaseDate: Date.now() - 86400000 * 7, quantitySoldFromThisLot: 0, totalProceedsFromThisLot: 0, totalTaxPaidFromThisLot: 0 };
    const mockPortfolio: PortfolioEntry[] = [mockCannonballEntry, mockRuneScimEntry];
    
    replacePortfolio(mockPortfolio);
    setDriveFeedbackForModal({ message: "Portfolio loaded from Google Drive! (DEV MODE)", type: 'success' });
    trackGaEvent('portfolio_load_gdrive_success_dev', { entry_count: mockPortfolio.length });
    setIsDriveActionLoading(false);
  }, [replacePortfolio, trackGaEvent]);


  const handleSaveToDrive = useCallback(async () => {
    if (!isGoogleApiInitialized) {
      const msg = driveFeedbackForModal?.message || "Google Drive is not available.";
      setDriveFeedbackForModal({ message: msg, type: 'error' });
      console.error("handleSaveToDrive: Drive not initialized.");
      return;
    }
    if (portfolioEntries.length === 0) {
      setDriveFeedbackForModal({ message: "Portfolio is empty. Nothing to save to Drive.", type: 'info' });
      return;
    }
    console.log("handleSaveToDrive: Attempting to save...");
    setIsDriveActionLoading(true);
    setDriveFeedbackForModal({ message: "Saving to Google Drive...", type: 'info' });
    try {
      await googleDriveService.requestAccessToken();
      console.log("handleSaveToDrive: Access token process completed.");
      const portfolioJson = JSON.stringify(portfolioEntries);
      await googleDriveService.savePortfolioToDrive(portfolioJson);
      setDriveFeedbackForModal({ message: "Portfolio saved to Google Drive successfully!", type: 'success' });
      trackGaEvent('portfolio_save_gdrive_success');
    } catch (err: any) {
      console.error("Error saving portfolio to Drive in App.tsx:", err);
      const errorMessage = err.message || "Failed to save portfolio to Google Drive. Check console for details.";
      setDriveFeedbackForModal({ message: errorMessage, type: 'error' });
      trackGaEvent('portfolio_save_gdrive_error', { error_message: errorMessage });
    } finally {
      setIsDriveActionLoading(false);
    }
  }, [isGoogleApiInitialized, portfolioEntries, driveFeedbackForModal, trackGaEvent]);

  const handleLoadFromDrive = useCallback(async () => {
    if (!isGoogleApiInitialized) {
      const msg = driveFeedbackForModal?.message || "Google Drive is not available.";
      setDriveFeedbackForModal({ message: msg, type: 'error' });
      console.error("handleLoadFromDrive: Drive not initialized.");
      return;
    }
    console.log("handleLoadFromDrive: Attempting to load...");
    setIsDriveActionLoading(true);
    setDriveFeedbackForModal({ message: "Loading from Google Drive...", type: 'info' });
    try {
      await googleDriveService.requestAccessToken();
      console.log("handleLoadFromDrive: Access token process completed.");
      const portfolioJson = await googleDriveService.loadPortfolioFromDrive();
      if (portfolioJson) {
        const newEntries: PortfolioEntry[] = JSON.parse(portfolioJson);
        replacePortfolio(newEntries); 
        setDriveFeedbackForModal({ message: "Portfolio loaded from Google Drive successfully!", type: 'success' });
        trackGaEvent('portfolio_load_gdrive_success', { entry_count: newEntries.length });
      } else {
        setDriveFeedbackForModal({ message: "No portfolio file found on Google Drive or file is empty.", type: 'info' });
        trackGaEvent('portfolio_load_gdrive_not_found');
      }
    } catch (err: any) {
      console.error("Error loading portfolio from Drive in App.tsx:", err);
      const errorMessage = err.message || "Failed to load portfolio from Google Drive. Check console for details.";
      setDriveFeedbackForModal({ message: errorMessage, type: 'error' });
      trackGaEvent('portfolio_load_gdrive_error', { error_message: errorMessage });
    } finally {
      setIsDriveActionLoading(false);
    }
  }, [isGoogleApiInitialized, replacePortfolio, driveFeedbackForModal, trackGaEvent]);


  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(true);
  const prevIsAutoRefreshEnabled = usePrevious(isAutoRefreshEnabled);

  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number>(AUTO_REFRESH_INTERVAL_SECONDS);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState<boolean>(false);
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState<boolean>(false); 
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false); 
  
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  const prevIsPortfolioModalOpen = usePrevious(isPortfolioModalOpen);

  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);

  useEffect(() => {
    if (isConsentGranted && changelogEntries.length > 0) {
      const latestVersion = changelogEntries[0].version;
      const seenVersion = localStorage.getItem(LAST_SEEN_CHANGELOG_VERSION_STORAGE_KEY);
      if (latestVersion !== seenVersion) {
        setHasNewUpdate(true);
      } else {
        setHasNewUpdate(false);
      }
    } else {
      setHasNewUpdate(false);
    }
  }, [isConsentGranted]);

  useEffect(() => {
    if (!isPortfolioModalOpen && prevIsPortfolioModalOpen) {
      if (isDevDriveMode) {
        setDriveFeedbackForModal({ message: "DEV MODE: Google Drive is simulated.", type: 'info' });
      } else if (!isGoogleApiInitialized) {
        setDriveFeedbackForModal({ message: "Google Drive features are unavailable. API key or Client ID might be missing, invalid, or the service failed to load. Check console for details.", type: 'error' });
      } else {
        setDriveFeedbackForModal(null); 
      }
    }
  }, [isPortfolioModalOpen, prevIsPortfolioModalOpen, isDevDriveMode, isGoogleApiInitialized]);
  

  const [isSetAlertModalOpen, setIsSetAlertModalOpen] = useState<boolean>(false);
  const [itemForSetAlertModal, setItemForSetAlertModal] = useState<ItemMapInfo | null>(null);
  
  const [isAddInvestmentFromViewModalOpen, setIsAddInvestmentFromViewModalOpen] = useState<boolean>(false);
  const [itemForAddInvestmentFromViewModal, setItemForAddInvestmentFromViewModal] = useState<ItemMapInfo | null>(null);


  const [isSearchSectionCollapsed, setIsSearchSectionCollapsed] = useState<boolean>(true);
  const [isFavoritesSectionCollapsed, setIsFavoritesSectionCollapsed] = useState<boolean>(true);
  const [isAlertsSectionCollapsed, setIsAlertsSectionCollapsed] = useState<boolean>(true);
  const [isTopMoversSectionCollapsed, setIsTopMoversSectionCollapsed] = useState<boolean>(true); 

  const [isDragAndDropEnabled, setIsDragAndDropEnabled] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(DRAG_DROP_ENABLED_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false; 
    }
    return false; 
  });
  const prevIsDragAndDropEnabled = usePrevious(isDragAndDropEnabled);


  const [sidebarSectionOrder, setSidebarSectionOrder] = useState<string[]>(() => {
    if (initialConsent === 'granted') {
      const savedOrder = localStorage.getItem(SIDEBAR_ORDER_STORAGE_KEY);
      try {
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder) as string[];
          const defaultKeysSet = new Set(DEFAULT_SIDEBAR_ORDER);
          const savedKeysSet = new Set(parsedOrder);
          if (parsedOrder.length === DEFAULT_SIDEBAR_ORDER.length && [...defaultKeysSet].every(key => savedKeysSet.has(key))) {
            return parsedOrder;
          }
        }
      } catch (e) {
        console.error("Failed to parse sidebar order from localStorage", e);
      }
    }
    return [...DEFAULT_SIDEBAR_ORDER]; 
  });

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const [isDesktopView, setIsDesktopView] = useState<boolean>(window.innerWidth >= DESKTOP_BREAKPOINT_RESIZE);
  const [sectionHeights, setSectionHeights] = useState<SectionHeights>(() => {
    const initialHeights: SectionHeights = {};
    DEFAULT_SIDEBAR_ORDER.forEach(id => {
        initialHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
    });
    return initialHeights;
  });
  const [resizingSection, setResizingSection] = useState<{ id: string; initialHeight: number; initialY: number } | null>(null);


  useEffect(() => {
    const checkDesktopView = () => setIsDesktopView(window.innerWidth >= DESKTOP_BREAKPOINT_RESIZE);
    window.addEventListener('resize', checkDesktopView);
    checkDesktopView(); // Initial check
    return () => window.removeEventListener('resize', checkDesktopView);
  }, []);

  useEffect(() => {
    if (isConsentGranted && isDesktopView) {
      try {
        const savedHeights = localStorage.getItem(SECTION_HEIGHTS_STORAGE_KEY);
        if (savedHeights) {
          const parsedHeights = JSON.parse(savedHeights) as SectionHeights;
          // Ensure all sections in current order have a height, falling back to default
          const newSectionHeights = { ...sectionHeights }; // Start with current (which might have defaults)
          let changed = false;
          DEFAULT_SIDEBAR_ORDER.forEach(id => {
            if (parsedHeights[id] !== undefined) {
              newSectionHeights[id] = Math.max(MIN_SECTION_HEIGHT_PX, Math.min(MAX_SECTION_HEIGHT_PX, parsedHeights[id]));
              changed = true;
            } else if (newSectionHeights[id] === undefined) { // If not in parsed and not in current defaults
              newSectionHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
              changed = true;
            }
          });
          if (changed) setSectionHeights(newSectionHeights);

        } else { // No saved heights, ensure defaults for all sections in order
          const defaultHeights: SectionHeights = {};
          DEFAULT_SIDEBAR_ORDER.forEach(id => {
            defaultHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
          });
          setSectionHeights(defaultHeights);
        }
      } catch (e) {
        console.error("Failed to load section heights from localStorage", e);
        const defaultHeights: SectionHeights = {};
        DEFAULT_SIDEBAR_ORDER.forEach(id => {
          defaultHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
        });
        setSectionHeights(defaultHeights);
      }
    } else if (!isDesktopView) { // Reset to defaults if not desktop
      const defaultHeights: SectionHeights = {};
      DEFAULT_SIDEBAR_ORDER.forEach(id => {
        defaultHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
      });
      setSectionHeights(defaultHeights);
    }
  }, [isConsentGranted, isDesktopView]);


  useEffect(() => {
    if (isConsentGranted && isDesktopView && Object.keys(sectionHeights).length > 0) {
      try {
        localStorage.setItem(SECTION_HEIGHTS_STORAGE_KEY, JSON.stringify(sectionHeights));
      } catch (e) {
        console.error("Failed to save section heights to localStorage", e);
      }
    }
  }, [sectionHeights, isConsentGranted, isDesktopView]);
  

  const handleResizeMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, sectionId: string) => {
    if (!isDesktopView) return;
    event.preventDefault();
    document.body.style.cursor = 'ns-resize'; 
    document.body.style.userSelect = 'none';

    setResizingSection({
      id: sectionId,
      initialHeight: sectionHeights[sectionId] || DEFAULT_SECTION_HEIGHT_PX,
      initialY: event.clientY,
    });
  }, [isDesktopView, sectionHeights]);

  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (!resizingSection || !isDesktopView) return;
    event.preventDefault();
    const deltaY = event.clientY - resizingSection.initialY;
    let newHeight = resizingSection.initialHeight + deltaY;
    newHeight = Math.max(MIN_SECTION_HEIGHT_PX, Math.min(MAX_SECTION_HEIGHT_PX, newHeight));
    
    setSectionHeights(prev => ({
      ...prev,
      [resizingSection.id]: newHeight,
    }));
  }, [resizingSection, isDesktopView]);

  const handleResizeMouseUp = useCallback(() => {
    if (!isDesktopView || !resizingSection) return;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setResizingSection(null);
    if(resizingSection) trackGaEvent('resize_section', { section_id: resizingSection.id, new_height: sectionHeights[resizingSection.id]});
  }, [isDesktopView, resizingSection, trackGaEvent, sectionHeights]);

  useEffect(() => {
    if (resizingSection) {
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
      window.addEventListener('mouseleave', handleResizeMouseUp); // Handle if mouse leaves window
    } else {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
      window.removeEventListener('mouseleave', handleResizeMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
      window.removeEventListener('mouseleave', handleResizeMouseUp);
    };
  }, [resizingSection, handleResizeMouseMove, handleResizeMouseUp]);


  const toggleSearchSection = useCallback(() => setIsSearchSectionCollapsed(prev => {
    if (prev) { // only track expand events for now, or adjust as needed
      trackGaEvent('toggle_section_collapse', { section_name: 'search', is_collapsed: false });
    }
    return !prev;
  }), [trackGaEvent]);

  const toggleAlertsSection = () => setIsAlertsSectionCollapsed(prev => {
    trackGaEvent('toggle_section_collapse', { section_name: 'alerts', is_collapsed: !prev });
    return !prev;
  });
 
  const [showChartGrid, setShowChartGrid] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(CHART_GRID_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [showChartLineGlow, setShowChartLineGlow] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(CHART_LINE_GLOW_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [showVolumeChart, setShowVolumeChart] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(VOLUME_CHART_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showFavoriteSparklines, setShowFavoriteSparklines] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true; 
    }
    return true; 
  });
  const [activeThemeName, setActiveThemeName] = useState<string>(() => {
    if (initialConsent === 'granted') {
      return localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) || DEFAULT_THEME_ID;
    }
    return DEFAULT_THEME_ID;
  });

  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(DESKTOP_NOTIFICATIONS_ENABLED_KEY);
      if (saved === 'true') return true;
      if (saved === 'false') return false;
      try {
        return saved !== null ? JSON.parse(saved) : false;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission>(Notification.permission);

  const [enableInAppAlertSounds, setEnableInAppAlertSounds] = useState<boolean>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(IN_APP_ALERT_SOUNDS_ENABLED_KEY);
      return saved !== null ? JSON.parse(saved) : DEFAULT_IN_APP_ALERT_SOUNDS_ENABLED;
    }
    return DEFAULT_IN_APP_ALERT_SOUNDS_ENABLED;
  });
  const prevEnableInAppAlertSounds = usePrevious(enableInAppAlertSounds);

  const initAudioOnInteraction = useCallback(() => {
    if (!isAudioContextInitialized && isConsentGranted && enableInAppAlertSounds) {
      console.log("First user interaction detected, attempting to initialize AudioContext.");
      initializeAudioContextSafely();
      if (audioContextInstance?.state === 'suspended') {
          audioContextInstance.resume().catch(err => console.warn("Could not resume AudioContext on interaction:", err));
      }
    }
  }, [isAudioContextInitialized, isConsentGranted, enableInAppAlertSounds]);

  useEffect(() => {
    if (!isAudioContextInitialized && isConsentGranted && enableInAppAlertSounds) {
      window.addEventListener('click', initAudioOnInteraction, { once: true });
      window.addEventListener('keydown', initAudioOnInteraction, { once:true });

      return () => {
        window.removeEventListener('click', initAudioOnInteraction);
        window.removeEventListener('keydown', initAudioOnInteraction);
      };
    }
  }, [isAudioContextInitialized, isConsentGranted, enableInAppAlertSounds, initAudioOnInteraction]);


  useEffect(() => {
    if (prevEnableInAppAlertSounds !== undefined && prevEnableInAppAlertSounds !== enableInAppAlertSounds) {
      addNotification(`In-app alert sounds ${enableInAppAlertSounds ? 'enabled' : 'disabled'}.`, 'info');
      trackGaEvent('toggle_in_app_alert_sounds', { is_enabled: enableInAppAlertSounds });
      if (enableInAppAlertSounds) { 
        initializeAudioContextSafely();
        if (audioContextInstance?.state === 'suspended') {
            audioContextInstance.resume().catch(err => console.warn("Could not resume AudioContext on sound toggle:", err));
        }
      }
    }
  }, [enableInAppAlertSounds, prevEnableInAppAlertSounds, addNotification, trackGaEvent]);


  const [wordingPreference, setWordingPreference] = useState<WordingPreference>(() => {
    if (initialConsent === 'granted') {
      const saved = localStorage.getItem(WORDING_PREFERENCE_STORAGE_KEY) as WordingPreference | null;
      return saved || DEFAULT_WORDING_PREFERENCE;
    }
    return DEFAULT_WORDING_PREFERENCE;
  });

  const [topMoversCalculationMode, setTopMoversCalculationMode] = useState<TopMoversCalculationMode>(DEFAULT_TOP_MOVERS_CALCULATION_MODE);
  const [topMoversMetricType, setTopMoversMetricType] = useState<TopMoversMetricType>(DEFAULT_TOP_MOVERS_METRIC_TYPE);


  const [favoriteItemIds, setFavoriteItemIds] = useState<FavoriteItemId[]>(() => {
    if (initialConsent === 'granted') {
      try {
        const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return storedFavorites ? JSON.parse(storedFavorites) : [];
      } catch (e) {
        console.error("Failed to load favourites from localStorage", e);
      }
    }
    return [];
  });
  const prevFavoriteItemIds = usePrevious(favoriteItemIds);

  const [favoriteItemPrices, setFavoriteItemPrices] = useState<Record<FavoriteItemId, LatestPriceData | null | 'loading' | 'error'>>({});
  const [favoriteItemHourlyChanges, setFavoriteItemHourlyChanges] = useState<Record<FavoriteItemId, FavoriteItemHourlyChangeState>>({});
  const [favoriteItemSparklineData, setFavoriteItemSparklineData] = useState<Record<FavoriteItemId, FavoriteItemSparklineState>>({});
  const [isRefreshingFavorites, setIsRefreshingFavorites] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const autoRefreshIntervalIdRef = useRef<number | null>(null);
  const countdownIntervalIdRef = useRef<number | null>(null);
  const searchBarWrapperRef = useRef<HTMLDivElement>(null);
  const itemListWrapperRef = useRef<HTMLDivElement>(null);
  const sharedItemIdProcessedRef = useRef<boolean>(false); 

  const getItemIconUrl = useCallback((iconName: string): string => {
    if(!iconName) return 'https://via.placeholder.com/36?text=N/A'; 
    return `${ITEM_IMAGE_BASE_URL}${iconName.replace(/ /g, '_')}`;
  }, []);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(DRAG_DROP_ENABLED_STORAGE_KEY, JSON.stringify(isDragAndDropEnabled));
    }
    if (prevIsDragAndDropEnabled !== undefined && prevIsDragAndDropEnabled !== isDragAndDropEnabled) {
      addNotification(`Section reordering ${isDragAndDropEnabled ? 'enabled' : 'disabled'}.`, 'info');
      trackGaEvent('toggle_drag_drop', { is_enabled: isDragAndDropEnabled });
    }
  }, [isDragAndDropEnabled, prevIsDragAndDropEnabled, addNotification, isConsentGranted, trackGaEvent]);

  const toggleDragAndDrop = useCallback(() => {
    setIsDragAndDropEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(SIDEBAR_ORDER_STORAGE_KEY, JSON.stringify(sidebarSectionOrder));
      } catch (e) {
        console.error("Failed to save sidebar order to localStorage", e);
      }
    }
  }, [sidebarSectionOrder, isConsentGranted]);

  const { 
    topMoversData, 
    isLoading: isLoadingTopMovers, 
    error: topMoversError, 
    selectedTimespan: selectedMoversTimespan, 
    setSelectedTimespan: setSelectedMoversTimespan, 
    refreshMovers, 
    fetchMovers, 
    lastFetchedTimestamp: topMoversLastFetched,
  } = useTopMovers(allItems, topMoversCalculationMode, topMoversMetricType);
  
  const prevCalcMode = usePrevious(topMoversCalculationMode);
  const prevMetricType = usePrevious(topMoversMetricType);
  const prevSelectedMoversTimespan = usePrevious(selectedMoversTimespan);

  useEffect(() => {
    const hasCalcModeChanged = prevCalcMode !== undefined && prevCalcMode !== topMoversCalculationMode;
    const hasMetricTypeChanged = prevMetricType !== undefined && prevMetricType !== topMoversMetricType;
    const hasTimespanChanged = prevSelectedMoversTimespan !== undefined && prevSelectedMoversTimespan !== selectedMoversTimespan;

    if ( (hasCalcModeChanged || hasMetricTypeChanged || hasTimespanChanged) && 
         !isTopMoversSectionCollapsed &&
         allItems.length > 0 &&
         !isLoadingTopMovers 
       ) {
      if(hasCalcModeChanged) trackGaEvent('top_movers_change_calc_mode', { mode: topMoversCalculationMode });
      if(hasMetricTypeChanged) trackGaEvent('top_movers_change_metric_type', { type: topMoversMetricType });
      if(hasTimespanChanged) trackGaEvent('top_movers_change_timespan', { timespan: selectedMoversTimespan });
      fetchMovers(selectedMoversTimespan, topMoversMetricType);
    }
  }, [
    topMoversCalculationMode,
    topMoversMetricType,
    selectedMoversTimespan, 
    isTopMoversSectionCollapsed,
    allItems.length,
    isLoadingTopMovers, 
    fetchMovers, 
    prevCalcMode, 
    prevMetricType,
    prevSelectedMoversTimespan,
    trackGaEvent
  ]);


  useEffect(() => {
    if (!isTopMoversSectionCollapsed && allItems.length > 0 && !topMoversData && !topMoversError && !isLoadingTopMovers) {
      trackGaEvent('view_top_movers'); 
      fetchMovers(selectedMoversTimespan, topMoversMetricType);
    }
  }, [
    isTopMoversSectionCollapsed, 
    allItems.length, 
    topMoversData, 
    topMoversError, 
    isLoadingTopMovers, 
    fetchMovers, 
    selectedMoversTimespan, 
    topMoversMetricType,
    trackGaEvent
  ]);


  const toggleTopMoversSection = useCallback(() => {
    setIsTopMoversSectionCollapsed(prev => {
        const newCollapsedState = !prev;
        trackGaEvent('toggle_section_collapse', { section_name: 'top_movers', is_collapsed: newCollapsedState });
        if (!newCollapsedState && allItems.length > 0 && !topMoversData && !topMoversError && !isLoadingTopMovers) {
            trackGaEvent('view_top_movers');
            fetchMovers(selectedMoversTimespan, topMoversMetricType);
        }
        return newCollapsedState;
    });
  }, [
    allItems.length,
    topMoversData, 
    topMoversError,
    isLoadingTopMovers, 
    fetchMovers, 
    selectedMoversTimespan, 
    topMoversMetricType,
    trackGaEvent
  ]);

  const memoizedToggleTopMoversSection = useCallback(toggleTopMoversSection, [
    allItems.length,
    topMoversData, 
    isLoadingTopMovers, 
    topMoversError, 
    fetchMovers, 
    selectedMoversTimespan, 
    topMoversMetricType,
    trackGaEvent
  ]);

  const handleRefreshAllFavorites = useCallback(async (isAutoRefresh: boolean = false) => {
    if (favoritesRefreshLockRef.current && !isAutoRefresh) return; 
    if (isRefreshingFavorites || favoriteItemIds.length === 0 || allItems.length === 0 || !isConsentGranted) return;

    if (!isAutoRefresh) trackGaEvent('refresh_favorites', { count: favoriteItemIds.length });
    
    if (!isAutoRefresh) favoritesRefreshLockRef.current = true;
    setIsRefreshingFavorites(true);

    const initialLoadingPrices: Record<FavoriteItemId, 'loading'> = {};
    const initialLoadingChanges: Record<FavoriteItemId, 'loading'> = {};
    const initialLoadingSparklines: Record<FavoriteItemId, 'loading'> = {};

    favoriteItemIds.forEach(id => {
        initialLoadingPrices[id] = 'loading';
        initialLoadingChanges[id] = 'loading';
        initialLoadingSparklines[id] = 'loading';
    });
    setFavoriteItemPrices(prev => ({ ...prev, ...initialLoadingPrices }));
    setFavoriteItemHourlyChanges(prev => ({ ...prev, ...initialLoadingChanges }));
    setFavoriteItemSparklineData(prev => ({ ...prev, ...initialLoadingSparklines }));

    const allItemsMap = new Map(allItems.map(item => [item.id, item]));

    const favoriteDataPromises = favoriteItemIds.map(itemId =>
        fetchAndProcessFavoriteItemData(itemId, allItemsMap, fetchLatestPrice, fetchHistoricalData)
    );

    const results = await Promise.allSettled(favoriteDataPromises);

    const newPricesStateUpdate: Record<FavoriteItemId, LatestPriceData | null | 'error'> = {};
    const newChangesStateUpdate: Record<FavoriteItemId, FavoriteItemHourlyChangeState> = {};
    const newSparklinesStateUpdate: Record<FavoriteItemId, FavoriteItemSparklineState> = {};
    let allSucceededThisRefresh = true;

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const { itemId, priceDataResult, hourlyChangeResult, sparklineDataResult } = result.value;
            newPricesStateUpdate[itemId] = priceDataResult;
            newChangesStateUpdate[itemId] = hourlyChangeResult;
            newSparklinesStateUpdate[itemId] = sparklineDataResult;
            if (priceDataResult === 'error' || hourlyChangeResult === 'error' || sparklineDataResult === 'error') {
                allSucceededThisRefresh = false;
            }
        } else {
            const failedItemIndex = favoriteDataPromises.findIndex(p => p === (result as any).promise);
             if (failedItemIndex !== -1 && favoriteItemIds[failedItemIndex]) {
                const failedItemId = favoriteItemIds[failedItemIndex];
                newPricesStateUpdate[failedItemId] = 'error';
                newChangesStateUpdate[failedItemId] = 'error';
                newSparklinesStateUpdate[failedItemId] = 'error';
            }
            console.error(`Unhandled promise rejection during favorite refresh:`, result.reason);
            allSucceededThisRefresh = false;
        }
    });

    setFavoriteItemPrices(prev => ({ ...prev, ...newPricesStateUpdate }));
    setFavoriteItemHourlyChanges(prev => ({ ...prev, ...newChangesStateUpdate }));
    setFavoriteItemSparklineData(prev => ({ ...prev, ...newSparklinesStateUpdate }));

    setIsRefreshingFavorites(false);
    if (!isAutoRefresh) {
        favoritesRefreshLockRef.current = false;
        if (favoriteItemIds.length > 0) {
            if (allSucceededThisRefresh) {
                addNotification('Favorite items data refreshed!', 'success');
            } else {
                addNotification('Some favorite items could not be refreshed.', 'error');
            }
        }
    }
  }, [favoriteItemIds, allItems, isConsentGranted, trackGaEvent, addNotification, isRefreshingFavorites]);


  useEffect(() => {
    let intervalId: number | null = null;

    if (isConsentGranted && favoriteItemIds.length > 0 && allItems.length > 0) {
      intervalId = window.setInterval(() => {
        if (!isRefreshingFavorites) { 
          handleRefreshAllFavorites(true); 
        }
      }, 60 * 1000); 
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isConsentGranted, favoriteItemIds, allItems.length, handleRefreshAllFavorites, isRefreshingFavorites]);


  const toggleFavoritesSection = useCallback(() => {
    setIsFavoritesSectionCollapsed(prev => {
      const newCollapsedState = !prev;
      trackGaEvent('toggle_section_collapse', { section_name: 'favorites', is_collapsed: newCollapsedState });
      if (!newCollapsedState && isConsentGranted && favoriteItemIds.length > 0 && allItems.length > 0) {
        const needsInitialLoad = favoriteItemIds.some(id => 
          favoriteItemPrices[id] === undefined || favoriteItemPrices[id] === null
        );
        if (needsInitialLoad && !isRefreshingFavorites && !favoritesRefreshLockRef.current ) { 
           handleRefreshAllFavorites(false); 
        }
      }
      return newCollapsedState;
    });
  }, [isConsentGranted, favoriteItemIds, allItems.length, handleRefreshAllFavorites, isRefreshingFavorites, favoriteItemPrices, trackGaEvent]);


  useEffect(() => {
    if (consentStatus !== 'pending') {
      localStorage.setItem(CONSENT_STORAGE_KEY, consentStatus);
      // The call to initializeAudioContextSafely() was removed from here
      // as it caused crashes on iOS Safari for returning users.
    }
  }, [consentStatus]);

  const handleAlertTriggered = useCallback((triggeredAlert: PriceAlert) => {
    const message = `Alert: ${triggeredAlert.itemName} ${triggeredAlert.condition === 'above' ? '>' : '<'} ${triggeredAlert.targetPrice.toLocaleString()} GP! Current: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`;
    addNotification(message, 'success');
    trackGaEvent('alert_triggered_notification', {
      item_id: triggeredAlert.itemId,
      item_name: triggeredAlert.itemName,
      condition: triggeredAlert.condition,
      target_price: triggeredAlert.targetPrice,
      price_at_trigger: triggeredAlert.priceAtTrigger
    });

    if (enableInAppAlertSounds && isConsentGranted) {
      playAlertSound();
    }

    if (enableDesktopNotifications && desktopNotificationPermission === 'granted' && isConsentGranted) {
      if (Notification.permission === 'granted') {
        new Notification(`GE Pulse: ${triggeredAlert.itemName}`, {
          body: `${triggeredAlert.itemName} is now ${triggeredAlert.condition === 'above' ? 'above' : 'below'} ${triggeredAlert.targetPrice.toLocaleString()} GP.\nCurrent: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`,
          icon: getItemIconUrl(triggeredAlert.itemIcon),
          tag: triggeredAlert.id,
        });
      }
    }
  }, [addNotification, enableDesktopNotifications, desktopNotificationPermission, isConsentGranted, getItemIconUrl, trackGaEvent, enableInAppAlertSounds]);

  const getItemName = useCallback((itemId: number): string => {
    return allItems.find(item => item.id === itemId)?.name || 'Unknown Item';
  }, [allItems]);

  const { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage } = usePriceAlerts(
    handleAlertTriggered,
    fetchLatestPrice,
    isConsentGranted,
    trackGaEvent,
    getItemName
  );

  const resetPreferencesToDefault = useCallback(() => {
    setShowChartGrid(true);
    setShowChartLineGlow(true);
    setShowVolumeChart(false);
    setShowFavoriteSparklines(true); 
    setActiveThemeName(DEFAULT_THEME_ID);
    setEnableDesktopNotifications(false);
    setEnableInAppAlertSounds(DEFAULT_IN_APP_ALERT_SOUNDS_ENABLED); 
    setWordingPreference(DEFAULT_WORDING_PREFERENCE);
    setFavoriteItemIds([]);
    setFavoriteItemPrices({});
    setFavoriteItemHourlyChanges({});
    setFavoriteItemSparklineData({});
    setSidebarSectionOrder([...DEFAULT_SIDEBAR_ORDER]); 
    setIsDragAndDropEnabled(false); 
    setUserRsn(''); // Clear RSN
    const defaultHeights: SectionHeights = {}; // Reset section heights
    DEFAULT_SIDEBAR_ORDER.forEach(id => defaultHeights[id] = DEFAULT_SECTION_HEIGHT_PX);
    setSectionHeights(defaultHeights);
    if(clearAllAlertsAndStorage) clearAllAlertsAndStorage(); 
    if(clearAllPortfolioData) clearAllPortfolioData();
    addNotification('Preferences have been reset and will no longer be saved.', 'info');
  }, [clearAllAlertsAndStorage, clearAllPortfolioData, addNotification]);

  const handleConsentGranted = useCallback(() => {
    setConsentStatus('granted');
    trackGaEvent('consent_changed', { status: 'granted' });
    addNotification('Thanks! Your preferences will now be saved.', 'success');
    initializeAudioContextSafely();
  }, [addNotification, trackGaEvent]);

  const handleConsentDenied = useCallback(() => {
    setConsentStatus('denied');
    trackGaEvent('consent_changed', { status: 'denied' });
    ALL_USER_PREFERENCE_KEYS.forEach(key => localStorage.removeItem(key));
    resetPreferencesToDefault(); 
  }, [resetPreferencesToDefault, trackGaEvent]);

  const handleRevokeConsent = useCallback(() => {
    ALL_USER_PREFERENCE_KEYS.forEach(key => localStorage.removeItem(key));
    resetPreferencesToDefault();
    setConsentStatus('denied'); 
    trackGaEvent('consent_changed', { status: 'revoked' });
  }, [resetPreferencesToDefault, trackGaEvent]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(WORDING_PREFERENCE_STORAGE_KEY, wordingPreference);
    }
  }, [wordingPreference, isConsentGranted]);

  useEffect(() => {
    if (prevFavoriteItemIds && isConsentGranted && allItems.length > 0) {
      const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';
      const currentIdsSet = new Set(favoriteItemIds);
      const prevIdsSet = new Set(prevFavoriteItemIds);
  
      let itemChangedId: FavoriteItemId | undefined = undefined;
      let action: 'added' | 'removed' | null = null;
  
      if (favoriteItemIds.length > prevFavoriteItemIds.length) {
        itemChangedId = favoriteItemIds.find(id => !prevIdsSet.has(id));
        action = 'added';
      } else if (favoriteItemIds.length < prevFavoriteItemIds.length) {
        itemChangedId = prevFavoriteItemIds.find(id => !currentIdsSet.has(id));
        action = 'removed';
      }
  
      if (itemChangedId && action) {
        const itemNameValue = getItemName(itemChangedId);
        if (itemNameValue !== 'Unknown Item') {
          addNotification(`${itemNameValue} ${action === 'added' ? 'added to' : 'removed from'} ${favTerm}.`, action === 'added' ? 'success' : 'info');
        }
      }
    }
  }, [favoriteItemIds, prevFavoriteItemIds, getItemName, addNotification, wordingPreference, isConsentGranted, allItems.length]);


  const addFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (!prevIds.includes(itemId)) {
        trackGaEvent('toggle_favorite', { item_id: itemId, item_name: getItemName(itemId), action: 'added' });
        setFavoriteItemPrices(prev => ({ ...prev, [itemId]: null })); 
        setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: null }));
        setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: null }));
        return [...prevIds, itemId];
      }
      return prevIds;
    });
  }, [trackGaEvent, getItemName]);

  const removeFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (prevIds.includes(itemId)) {
        trackGaEvent('toggle_favorite', { item_id: itemId, item_name: getItemName(itemId), action: 'removed' });
        setFavoriteItemPrices(currentPrices => {
            const newPrices = {...currentPrices};
            delete newPrices[itemId];
            return newPrices;
        });
        setFavoriteItemHourlyChanges(currentChanges => {
            const newChanges = {...currentChanges};
            delete newChanges[itemId];
            return newChanges;
        });
        setFavoriteItemSparklineData(currentSparklines => {
            const newSparklines = {...currentSparklines};
            delete newSparklines[itemId];
            return newSparklines;
        });
        return prevIds.filter(id => id !== itemId);
      }
      return prevIds;
    });
  }, [trackGaEvent, getItemName]);


  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteItemIds));
      } catch (e) {
        console.error("Failed to save favourites to localStorage", e);
      }
    }
  }, [favoriteItemIds, isConsentGranted]);

  useEffect(() => {
    if (!isConsentGranted || allItems.length === 0 || favoriteItemIds.length === 0) {
      return;
    }

    const itemsToLoad = favoriteItemIds.filter(id =>
      favoriteItemPrices[id] === undefined || favoriteItemPrices[id] === null ||
      favoriteItemHourlyChanges[id] === undefined || favoriteItemHourlyChanges[id] === null ||
      favoriteItemSparklineData[id] === undefined || favoriteItemSparklineData[id] === null
    );

    if (itemsToLoad.length === 0) {
      return;
    }
    
    const allItemsMap = new Map(allItems.map(item => [item.id, item]));

    const loadingUpdatesPrices: Record<FavoriteItemId, 'loading'> = {};
    const loadingUpdatesChanges: Record<FavoriteItemId, 'loading'> = {};
    const loadingUpdatesSparklines: Record<FavoriteItemId, 'loading'> = {};

    itemsToLoad.forEach(id => {
      if (favoriteItemPrices[id] !== 'loading') loadingUpdatesPrices[id] = 'loading';
      if (favoriteItemHourlyChanges[id] !== 'loading') loadingUpdatesChanges[id] = 'loading';
      if (favoriteItemSparklineData[id] !== 'loading') loadingUpdatesSparklines[id] = 'loading';
    });

    if (Object.keys(loadingUpdatesPrices).length > 0) setFavoriteItemPrices(prev => ({ ...prev, ...loadingUpdatesPrices }));
    if (Object.keys(loadingUpdatesChanges).length > 0) setFavoriteItemHourlyChanges(prev => ({ ...prev, ...loadingUpdatesChanges }));
    if (Object.keys(loadingUpdatesSparklines).length > 0) setFavoriteItemSparklineData(prev => ({ ...prev, ...loadingUpdatesSparklines }));
    
    const favoriteDataPromises = itemsToLoad.map(itemId =>
      fetchAndProcessFavoriteItemData(itemId, allItemsMap, fetchLatestPrice, fetchHistoricalData)
    );

    Promise.allSettled(favoriteDataPromises).then(results => {
      const newPricesStateUpdate: Record<FavoriteItemId, LatestPriceData | null | 'error'> = {};
      const newChangesStateUpdate: Record<FavoriteItemId, FavoriteItemHourlyChangeState> = {};
      const newSparklinesStateUpdate: Record<FavoriteItemId, FavoriteItemSparklineState> = {};

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { itemId, priceDataResult, hourlyChangeResult, sparklineDataResult } = result.value;
          newPricesStateUpdate[itemId] = priceDataResult;
          newChangesStateUpdate[itemId] = hourlyChangeResult;
          newSparklinesStateUpdate[itemId] = sparklineDataResult;
        } else {
            const failedItemIndex = favoriteDataPromises.findIndex(p => p === (result as any).promise);
             if (failedItemIndex !== -1 && itemsToLoad[failedItemIndex]) {
                const failedItemId = itemsToLoad[failedItemIndex];
                newPricesStateUpdate[failedItemId] = 'error';
                newChangesStateUpdate[failedItemId] = 'error';
                newSparklinesStateUpdate[failedItemId] = 'error';
            }
          console.error(`Unhandled promise rejection during initial favorite load:`, result.reason);
        }
      });

      setFavoriteItemPrices(prev => ({ ...prev, ...newPricesStateUpdate }));
      setFavoriteItemHourlyChanges(prev => ({ ...prev, ...newChangesStateUpdate }));
      setFavoriteItemSparklineData(prev => ({ ...prev, ...newSparklinesStateUpdate }));
    });
  }, [favoriteItemIds, allItems, isConsentGranted, favoriteItemPrices, favoriteItemHourlyChanges, favoriteItemSparklineData]);


  const handleThemeChange = useCallback((themeName: string) => {
    setActiveThemeName(themeName);
    trackGaEvent('change_theme', { theme_name: themeName });
  }, [trackGaEvent]);

  useEffect(() => {
    const currentActiveTheme = APP_THEMES.find(theme => theme.id === activeThemeName) || APP_THEMES.find(theme => theme.id === DEFAULT_THEME_ID) || APP_THEMES[0];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(currentActiveTheme.colors)) {
      root.style.setProperty(key, value);
    }
    if (isConsentGranted) {
      localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, activeThemeName);
    }
  }, [activeThemeName, isConsentGranted]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setError(null);
      setIsLoadingItems(true);

      if (isConsentGranted) {
        try {
          const cachedDataJSON = localStorage.getItem(ITEM_MAPPING_CACHE_KEY);
          const cachedTimestamp = localStorage.getItem(ITEM_MAPPING_TIMESTAMP_KEY);

          if (cachedDataJSON && cachedTimestamp) {
            const age = Date.now() - Number(cachedTimestamp);
            if (age < CACHE_DURATION_MS) {
              const cachedData = JSON.parse(cachedDataJSON);
              setAllItems(cachedData);
              setIsLoadingItems(false);
              console.log("Loaded item mapping from cache.");
              return;
            } else {
              console.log("Item mapping cache is stale. Fetching new data.");
            }
          }
        } catch (e) {
          console.error("Failed to read or parse item mapping from cache:", e);
        }
      }

      try {
        console.log("Fetching new item mapping from API.");
        const items = await fetchItemMapping();
        setAllItems(items);
        if (isConsentGranted) {
          try {
            localStorage.setItem(ITEM_MAPPING_CACHE_KEY, JSON.stringify(items));
            localStorage.setItem(ITEM_MAPPING_TIMESTAMP_KEY, Date.now().toString());
            console.log("Saved new item mapping to cache.");
          } catch (e) {
            console.error("Failed to save item mapping to cache:", e);
            addNotification('Could not save item data to cache. It may be too large for your browser\'s storage.', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load item list. The RuneScape Wiki API might be down or there was a network issue.');
        addNotification('Failed to load item list.', 'error');
      } finally {
        setIsLoadingItems(false);
      }
    };
    loadInitialData();
  }, [isConsentGranted, addNotification]);


  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(CHART_GRID_STORAGE_KEY, JSON.stringify(showChartGrid));
    }
  }, [showChartGrid, isConsentGranted]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(CHART_LINE_GLOW_STORAGE_KEY, JSON.stringify(showChartLineGlow));
    }
  }, [showChartLineGlow, isConsentGranted]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(VOLUME_CHART_STORAGE_KEY, JSON.stringify(showVolumeChart));
    }
  }, [showVolumeChart, isConsentGranted]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY, JSON.stringify(showFavoriteSparklines));
    }
  }, [showFavoriteSparklines, isConsentGranted]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(DESKTOP_NOTIFICATIONS_ENABLED_KEY, JSON.stringify(enableDesktopNotifications));
    }
  }, [enableDesktopNotifications, isConsentGranted]);

  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(IN_APP_ALERT_SOUNDS_ENABLED_KEY, JSON.stringify(enableInAppAlertSounds));
    }
  }, [enableInAppAlertSounds, isConsentGranted]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTerm && 
          searchBarWrapperRef.current && 
          !searchBarWrapperRef.current.contains(event.target as Node) &&
          itemListWrapperRef.current && 
          !itemListWrapperRef.current.contains(event.target as Node)
         ) {
        setSearchTerm('');
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm]);

  const handleToggleDesktopNotifications = useCallback(async () => {
    if (desktopNotificationPermission === 'denied') {
      addNotification('Desktop notifications are blocked by your browser. Please enable them in your browser settings.', 'error');
      setEnableDesktopNotifications(false);
      return;
    }
    trackGaEvent('toggle_desktop_notifications', { is_enabled: !enableDesktopNotifications });
    if (enableDesktopNotifications) {
      setEnableDesktopNotifications(false);
      addNotification('Desktop notifications disabled.', 'info');
    } else {
      if (desktopNotificationPermission === 'granted') {
        setEnableDesktopNotifications(true);
        addNotification('Desktop notifications enabled.', 'success');
      } else if (desktopNotificationPermission === 'default') {
        const permission = await Notification.requestPermission();
        setDesktopNotificationPermission(permission);
        if (permission === 'granted') {
          setEnableDesktopNotifications(true);
          addNotification('Desktop notifications enabled.', 'success');
          trackGaEvent('desktop_notification_permission', { status: 'granted' });
        } else {
          setEnableDesktopNotifications(false);
          addNotification('Desktop notification permission denied by user.', 'info');
          trackGaEvent('desktop_notification_permission', { status: 'denied_by_user' });
        }
      }
    }
  }, [desktopNotificationPermission, enableDesktopNotifications, addNotification, trackGaEvent]);

  const toggleEnableInAppAlertSounds = useCallback(() => {
    setEnableInAppAlertSounds(prev => !prev);
  }, []);

  const toggleChartGrid = useCallback(() => { 
    setShowChartGrid(prev => {
      trackGaEvent('toggle_chart_setting', { setting_name: 'chart_grid', setting_value: !prev });
      return !prev;
    });
  }, [trackGaEvent]);

  const toggleChartLineGlow = useCallback(() => {
    setShowChartLineGlow(prev => {
      trackGaEvent('toggle_chart_setting', { setting_name: 'chart_line_glow', setting_value: !prev });
      return !prev;
    });
  }, [trackGaEvent]);

  const toggleShowVolumeChart = useCallback(() => {
    setShowVolumeChart(prev => {
      trackGaEvent('toggle_chart_setting', { setting_name: 'volume_chart', setting_value: !prev });
      return !prev;
    });
  }, [trackGaEvent]);
  
  const toggleShowFavoriteSparklines = useCallback(() => {
    setShowFavoriteSparklines(prev => {
      trackGaEvent('toggle_favorite_sparklines', { is_visible: !prev });
      return !prev;
    });
  }, [trackGaEvent]);

  const toggleFeedbackModal = () => {
    if(!isFeedbackModalOpen) trackGaEvent('view_feedback_form');
    setIsFeedbackModalOpen(prev => !prev);
  }
  const togglePortfolioModal = () => {
    if (!isConsentGranted) {
      addNotification('Please enable preference storage in settings to use the Portfolio feature.', 'info');
      return;
    }
    if(!isPortfolioModalOpen) trackGaEvent('view_portfolio');
    setIsPortfolioModalOpen(prev => !prev);
  }

  const refreshCurrentItemData = useCallback(async (options: { 
    itemToRefresh?: ItemMapInfo, 
    isUserInitiated?: boolean, 
    timespanToUse?: Timespan,
    snapshotTimestampMs?: number 
  } = {}) => {
    const currentItem = options.itemToRefresh || selectedItem;
    const isUserInitiated = options.isUserInitiated !== undefined ? options.isUserInitiated : true;
    const currentTimespan = options.timespanToUse || selectedTimespan;

    if (!currentItem) return;
    setIsLoadingPrice(true); 
    setError(null);
    const isMountedRefreshRef = { current: true }; 

    try {
      let apiTimestepToFetch: TimespanAPI;
      switch (currentTimespan) {
        case '1h': case '6h': apiTimestepToFetch = '5m'; break;
        case '1d': case '7d': apiTimestepToFetch = '1h'; break;
        case '1mo': case '6mo': apiTimestepToFetch = '6h'; break; 
        case '3mo': case '1y': apiTimestepToFetch = '24h'; break;
        default: apiTimestepToFetch = '1h';
      }
      const [latest, rawHistoricalUnsorted] = await Promise.all([
        fetchLatestPrice(currentItem.id),
        fetchHistoricalData(currentItem.id, apiTimestepToFetch),
      ]);
      
      const rawHistorical = [...rawHistoricalUnsorted].sort((a,b) => a.timestamp - b.timestamp);

      setLatestPrice(latest);

      const currentInstantMs = Date.now();
      const historyEndDateMs = options.snapshotTimestampMs || currentInstantMs;
      let historyStartDateMs: number;

      switch (currentTimespan) {
        case '1h': historyStartDateMs = historyEndDateMs - (1 * 60 * 60 * 1000); break;
        case '6h': historyStartDateMs = historyEndDateMs - (6 * 60 * 60 * 1000); break;
        case '1d': historyStartDateMs = historyEndDateMs - (1 * 24 * 60 * 60 * 1000); break;
        case '7d': historyStartDateMs = historyEndDateMs - (7 * 24 * 60 * 60 * 1000); break;
        case '1mo': historyStartDateMs = historyEndDateMs - (30 * 24 * 60 * 60 * 1000); break;
        case '3mo': historyStartDateMs = historyEndDateMs - (90 * 24 * 60 * 60 * 1000); break;
        case '6mo': historyStartDateMs = historyEndDateMs - (180 * 24 * 60 * 60 * 1000); break;
        case '1y': historyStartDateMs = historyEndDateMs - (365 * 24 * 60 * 60 * 1000); break;
        default: historyStartDateMs = historyEndDateMs - (1 * 24 * 60 * 60 * 1000);
      }
      const filteredHistorical = rawHistorical.filter(dp => dp.timestamp >= historyStartDateMs && dp.timestamp <= historyEndDateMs);
      setHistoricalData(filteredHistorical);
      
      if (isUserInitiated && options.isUserInitiated !== false) { 
        addNotification(`${currentItem.name} data refreshed!`, 'success');
        trackGaEvent('manual_item_refresh', { item_id: currentItem.id, item_name: currentItem.name });
      }
      
      if (favoriteItemIds.includes(currentItem.id) && isConsentGranted) {
        if (isMountedRefreshRef.current && latest) {
            const allItemsMap = new Map(allItems.map(item => [item.id, item]));
            const { priceDataResult, hourlyChangeResult, sparklineDataResult } = await fetchAndProcessFavoriteItemData(currentItem.id, allItemsMap, fetchLatestPrice, fetchHistoricalData);
            
            if (isMountedRefreshRef.current) {
                setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: priceDataResult }));
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: hourlyChangeResult }));
                setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: sparklineDataResult }));
            }
        } else if (isMountedRefreshRef.current && !latest) {
            setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: 'error' }));
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'error' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'error' }));
        }
      }
      const itemAlerts = alerts.filter(a => a.itemId === currentItem.id && a.status === 'active');
      if (itemAlerts.length > 0 && latest) {
        checkAlerts(itemAlerts, {[currentItem.id]: latest});
      }
    } catch (err) {
      console.error(err);
      const errorMessage = `Failed to ${isUserInitiated ? 'refresh' : 'auto-refresh'} price data for ${currentItem.name}.`;
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      if (favoriteItemIds.includes(currentItem.id) && isMountedRefreshRef.current && isConsentGranted) {
          setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: 'error' }));
          setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'error' }));
          setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'error' }));
      }
    } finally {
      if (isMountedRefreshRef.current) setIsLoadingPrice(false);
    }
  }, [selectedItem, selectedTimespan, addNotification, alerts, checkAlerts, favoriteItemIds, isConsentGranted, allItems, trackGaEvent]);


  const handleSelectItem = useCallback(async (item: ItemMapInfo, originTimespan?: Timespan, originSnapshotTimestampMs?: number, origin: string = 'unknown') => {
    setSelectedItem(item);
    setSearchTerm('');
    setActiveSuggestionIndex(-1); 
    trackGaEvent('select_item', { item_id: item.id, item_name: item.name, origin: origin });
    trackGaEvent('screen_view_item', { screen_name: 'ItemDisplay', item_id: item.id, item_name: item.name });

    if (originTimespan) {
        setSelectedTimespan(originTimespan); 
        await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: false, timespanToUse: originTimespan, snapshotTimestampMs: originSnapshotTimestampMs });
    } else {
        await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: false, snapshotTimestampMs: originSnapshotTimestampMs }); 
    }
  }, [refreshCurrentItemData, trackGaEvent]); 

  const handleSelectItemById = useCallback((itemId: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number, origin: string = 'unknown') => {
    const itemToSelect = allItems.find(item => item.id === itemId);
    if (itemToSelect) {
      handleSelectItem(itemToSelect, originTimespan, originSnapshotTimestampMs, origin);
      const itemDisplaySection = document.getElementById('item-display-section');
      if (itemDisplaySection) {
        setTimeout(() => {
            itemDisplaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50); 
      }
    } else {
      addNotification(`Could not find item with ID ${itemId}. It might have been removed or changed.`, 'error');
    }
  }, [allItems, handleSelectItem, addNotification]);

  useEffect(() => {
    if (allItems.length > 0 && !sharedItemIdProcessedRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const itemIdFromUrl = urlParams.get('itemId');
      if (itemIdFromUrl) {
        const numericItemId = parseInt(itemIdFromUrl, 10);
        if (!isNaN(numericItemId)) {
          handleSelectItemById(numericItemId, undefined, undefined, 'shared_link');
          const newUrl = window.location.pathname + window.location.hash; 
          window.history.replaceState({}, document.title, newUrl);
        } else {
          addNotification('Invalid shared item ID in URL.', 'error');
        }
      }
      sharedItemIdProcessedRef.current = true; 
    }
  }, [allItems, handleSelectItemById, addNotification]);


  const handleTimespanChange = useCallback(async (timespan: Timespan) => {
    if (selectedItem && timespan !== selectedTimespan) {
      trackGaEvent('change_item_timespan', {
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        timespan_selected: timespan
      });
    }
    setSelectedTimespan(timespan); 
  }, [selectedItem, selectedTimespan, trackGaEvent]); 

  useEffect(() => {
    if (selectedItem) {
      refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false, timespanToUse: selectedTimespan });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedItem, selectedTimespan]); 


  useEffect(() => {
    if (prevIsAutoRefreshEnabled !== undefined && prevIsAutoRefreshEnabled !== isAutoRefreshEnabled) {
      addNotification(`Auto-refresh ${isAutoRefreshEnabled ? 'enabled' : 'disabled'}.`, 'info');
      trackGaEvent('toggle_auto_refresh', { is_enabled: isAutoRefreshEnabled });
    }
  }, [isAutoRefreshEnabled, prevIsAutoRefreshEnabled, addNotification, trackGaEvent]);

  const handleToggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => !prev);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (!selectedItem || isLoadingPrice) return;
    await refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: true }); 
    setManualRefreshTrigger(c => c + 1); 
  }, [selectedItem, isLoadingPrice, refreshCurrentItemData]);

 useEffect(() => {
    if (autoRefreshIntervalIdRef.current !== null) window.clearInterval(autoRefreshIntervalIdRef.current);
    if (countdownIntervalIdRef.current !== null) window.clearInterval(countdownIntervalIdRef.current);
    autoRefreshIntervalIdRef.current = null;
    countdownIntervalIdRef.current = null;
    if (isAutoRefreshEnabled && selectedItem) {
      setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS); 
      autoRefreshIntervalIdRef.current = window.setInterval(() => {
        if (selectedItem) { 
            refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false }); 
        }
      }, AUTO_REFRESH_INTERVAL_MS);
      countdownIntervalIdRef.current = window.setInterval(() => {
        setTimeToNextRefresh(prev => (prev <= 1 ? AUTO_REFRESH_INTERVAL_SECONDS : prev - 1));
      }, 1000);
    } else {
      setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS); 
    }
    return () => {
      if (autoRefreshIntervalIdRef.current !== null) window.clearInterval(autoRefreshIntervalIdRef.current);
      if (countdownIntervalIdRef.current !== null) window.clearInterval(countdownIntervalIdRef.current);
    };
  }, [isAutoRefreshEnabled, selectedItem, manualRefreshTrigger, refreshCurrentItemData]);

  const fuse = useMemo(() => {
    if (allItems.length > 0) {
      const options = {
        keys: ['name'],
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2,
      };
      return new Fuse(allItems, options);
    }
    return null;
  }, [allItems]);

  const prevSearchTerm = usePrevious(searchTerm);
  const filteredItems = useMemo(() => {
    if (!searchTerm || !fuse) {
      return [];
    }
    const results = fuse
      .search(searchTerm)
      .slice(0, 20)
      .map(result => result.item);
    
    if (results.length > 0 && searchTerm !== prevSearchTerm && searchTerm.length > 1) { 
        trackGaEvent('search_performed', { search_term: searchTerm, results_count: results.length, search_method: 'fuzzy' });
    }
    return results;
  }, [fuse, searchTerm, prevSearchTerm, trackGaEvent]); 

  useEffect(() => {
    if (activeSuggestionIndex >= filteredItems.length && searchTerm) { 
      setActiveSuggestionIndex(-1);
    }
  }, [filteredItems, activeSuggestionIndex, searchTerm]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredItems.length && !['Escape', 'ArrowDown', 'ArrowUp'].includes(event.key) && activeSuggestionIndex === -1) {
        if (filteredItems.length === 0 && searchTerm && event.key !== 'Escape') return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % (filteredItems.length || 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredItems.length) {
          handleSelectItem(filteredItems[activeSuggestionIndex], undefined, undefined, 'search_enter_key');
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSearchTerm('');
        setActiveSuggestionIndex(-1);
        break;
      default:
        break;
    }
  }, [filteredItems, activeSuggestionIndex, handleSelectItem, searchTerm]);

  const activeDescendantId = useMemo(() => {
    return activeSuggestionIndex !== -1 ? `search-suggestion-${activeSuggestionIndex}` : undefined;
  }, [activeSuggestionIndex]);

  const toggleSettingsModal = () => {
    if (!isSettingsOpen) trackGaEvent('view_settings');
    setIsSettingsOpen(prev => !prev);
  }
  
  const toggleChangelogModal = () => {
    // If modal is being opened, track the event.
    if (!isChangelogModalOpen) {
      trackGaEvent('view_changelog');
    } else {
      // If modal is being closed and there was a new update, mark it as "seen".
      if (hasNewUpdate) {
        if (isConsentGranted && changelogEntries.length > 0) {
          const latestVersion = changelogEntries[0].version;
          localStorage.setItem(LAST_SEEN_CHANGELOG_VERSION_STORAGE_KEY, latestVersion);
          setHasNewUpdate(false);
        }
      }
    }
    setIsChangelogModalOpen(prev => !prev);
  };

  const togglePrivacyPolicyModal = () => {
    if(!isPrivacyPolicyModalOpen) trackGaEvent('view_privacy_policy');
    setIsPrivacyPolicyModalOpen(prev => !prev);
  }

  const favTerm = wordingPreference === 'uk' ? 'favourite' : 'favorite';

  const handleResetView = useCallback(() => {
    if (selectedItem) {
      setSelectedItem(null);
      setLatestPrice(null);
      setHistoricalData([]);
      setError(null);
      addNotification('Item view has been reset.', 'info');
      trackGaEvent('reset_item_view');
    }
  }, [selectedItem, addNotification, trackGaEvent]);

  const openSetAlertModalForItem = useCallback((item: ItemMapInfo) => {
    setItemForSetAlertModal(item);
    setIsSetAlertModalOpen(true);
    if (isSettingsOpen) setIsSettingsOpen(false); 
    trackGaEvent('open_set_alert_modal', { item_id: item.id, item_name: item.name, origin: 'item_display' });
  }, [isSettingsOpen, trackGaEvent]);

  const closeSetAlertModal = useCallback(() => {
    setItemForSetAlertModal(null);
    setIsSetAlertModalOpen(false);
  }, []);

  const openAddInvestmentFromViewModal = useCallback((item: ItemMapInfo) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to add to portfolio.', 'info');
      return;
    }
    setItemForAddInvestmentFromViewModal(item);
    setIsAddInvestmentFromViewModalOpen(true);
    trackGaEvent('open_add_to_portfolio_modal', { item_id: item.id, item_name: item.name, origin: 'item_display' });
  }, [isConsentGranted, addNotification, trackGaEvent]);

  const closeAddInvestmentFromViewModal = useCallback(() => {
    setItemForAddInvestmentFromViewModal(null);
    setIsAddInvestmentFromViewModalOpen(false);
  }, []);

  const handleAddAlertFromModal = useCallback((item: ItemMapInfo, targetPrice: number, condition: 'above' | 'below') => {
    addAlert({
      itemId: item.id,
      itemName: item.name,
      itemIcon: item.icon,
      targetPrice,
      condition,
    });
    // Note: addAlert itself (via usePriceAlerts) now handles GA event for "set_price_alert"
    // if trackGaEvent & getItemName are passed to usePriceAlerts.
    // However, the original addAlert in App.tsx was already a 'set_price_alert' GA event source.
    // We can keep the 'set_price_alert' here or rely on usePriceAlerts.
    // For clarity, let's assume usePriceAlerts might not track specific UI origin, so keep this one for now.
    // Original `addAlert` for `usePriceAlerts` doesn't take itemName/Icon, it derives it or is passed.
    // The GA event in `usePriceAlerts` for adding is not there (it's for remove/update).
    // So, this `trackGaEvent` here IS necessary for adding via this modal.
    addNotification(`Alert set for ${item.name}!`, 'success');
    trackGaEvent('set_price_alert', { item_id: item.id, item_name: item.name, target_price: targetPrice, condition: condition, origin: 'set_alert_modal' });
    closeSetAlertModal();
  }, [addAlert, addNotification, closeSetAlertModal, trackGaEvent]);

  const handleToggleFavoriteQuickAction = useCallback((itemId: FavoriteItemId) => {
    if (favoriteItemIds.includes(itemId)) {
      removeFavoriteItem(itemId); 
    } else {
      addFavoriteItem(itemId); 
    }
  }, [favoriteItemIds, addFavoriteItem, removeFavoriteItem]);

  const handleQuickSetAlertFromFavorites = useCallback((item: ItemMapInfo) => {
    openSetAlertModalForItem(item);
    trackGaEvent('open_set_alert_modal', { item_id: item.id, item_name: item.name, origin: 'favorites_list' });
  }, [openSetAlertModalForItem, trackGaEvent]);

  const handleSetTopMoversTimespan = useCallback((timespan: TopMoversTimespan) => {
    if (allItems.length > 0) { 
      setSelectedMoversTimespan(timespan); 
    } else {
      addNotification("Item data still loading, please wait before changing Top Movers timespan.", "info");
    }
  }, [setSelectedMoversTimespan, allItems, addNotification]); 

  const handleRefreshTopMovers = useCallback(() => {
    if (allItems.length > 0) { 
      refreshMovers();
      trackGaEvent('top_movers_refresh');
    } else {
       addNotification("Item data still loading, please wait before refreshing Top Movers.", "info");
    }
  },[refreshMovers, allItems, addNotification, trackGaEvent]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLButtonElement | HTMLDivElement>, sectionId: string) => {
    if (!isDragAndDropEnabled) return;
    
    event.dataTransfer.setData('text/plain', sectionId);
    event.dataTransfer.effectAllowed = 'move';
    
    requestAnimationFrame(() => {
      setDraggedItem(sectionId);
    });
  }, [isDragAndDropEnabled]);

  const handleDragEnterItem = useCallback((sectionId: string) => {
    if (!isDragAndDropEnabled || !draggedItem || draggedItem === sectionId) return;
    setDragOverItem(sectionId);
  }, [isDragAndDropEnabled, draggedItem]);
  
  const handleDragLeaveItem = useCallback((sectionId: string) => {
    if (!isDragAndDropEnabled) return;
    if (dragOverItem === sectionId) {
       setDragOverItem(null);
    }
  }, [isDragAndDropEnabled, dragOverItem]);

  const handleDragOverItem = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isDragAndDropEnabled) return;
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move'; 
  }, [isDragAndDropEnabled]);
  
  const handleDrop = useCallback((targetSectionId: string) => {
    if (!isDragAndDropEnabled || !draggedItem || draggedItem === targetSectionId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const localDraggedItem = draggedItem;

    setSidebarSectionOrder(currentOrder => {
      const newOrder = [...currentOrder];
      const currentIndex = newOrder.indexOf(localDraggedItem);
      const targetIndex = newOrder.indexOf(targetSectionId);

      if (currentIndex === -1 || targetIndex === -1) {
        console.error("Drag/drop error: An item ID was not found in the sidebar order array.", { 
          draggedItem: localDraggedItem, 
          targetSectionId, 
          currentOrder: currentOrder.join(', ') 
        });
        return currentOrder; 
      }
      
      const [removed] = newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      trackGaEvent('reorder_sections', { new_order: newOrder.join(',') });
      return newOrder;
    });
    
    setDraggedItem(null);
    setDragOverItem(null);
  }, [isDragAndDropEnabled, draggedItem, trackGaEvent]); 

  const handleDragEnd = useCallback(() => {
    if (!isDragAndDropEnabled) return;
    setDraggedItem(null);
    setDragOverItem(null);
  }, [isDragAndDropEnabled]);
  
  const handleDragOverContainer = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isDragAndDropEnabled) return;
    event.preventDefault(); 
  }, [isDragAndDropEnabled]);
  
  const sectionsConfig = useMemo(() => ({
    [SECTION_KEYS.SEARCH]: { 
        Component: SearchSectionLayout, 
        Icon: SearchIcon,
        title: "Search Item" 
    },
    [SECTION_KEYS.FAVORITES]: { 
        Component: FavoritesList,
        Icon: EmptyHeartIcon, 
        titleDynamic: (wp: WordingPreference) => wp === 'uk' ? 'Favourite Items' : 'Favorite Items'
    },
    [SECTION_KEYS.TOP_MOVERS]: { 
        Component: TopMoversSection,
        Icon: TrendingUpIcon,
        title: "Top Market Movers"
    },
    [SECTION_KEYS.ALERTS]: { 
        Component: AlertsManager,
        Icon: BellIcon,
        titleDynamic: (editing: boolean) => editing ? 'Edit Price Alert' : 'Manage Price Alerts'
    },
  }), []);

  const handleSelectPortfolioItemAndCloseModal = useCallback((itemId: number) => {
    if (isPortfolioModalOpen) {
      togglePortfolioModal(); 
    }
    setTimeout(() => {
      handleSelectItemById(itemId, undefined, undefined, 'portfolio_item_click'); 
    }, 50); 
  }, [isPortfolioModalOpen, handleSelectItemById, togglePortfolioModal]);

  const handleResetSectionHeights = useCallback(() => {
    const defaultHeights: SectionHeights = {};
    DEFAULT_SIDEBAR_ORDER.forEach(id => {
      defaultHeights[id] = DEFAULT_SECTION_HEIGHT_PX;
    });
    setSectionHeights(defaultHeights);
    addNotification('Section heights have been reset to default.', 'success');
    trackGaEvent('reset_section_heights');
  }, [addNotification, trackGaEvent]);

  const isResetNeeded = useMemo(() => {
    if (!isDesktopView) return false;
    // Check if any height value is different from the default
    return Object.values(sectionHeights).some(h => h !== DEFAULT_SECTION_HEIGHT_PX);
  }, [sectionHeights, isDesktopView]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        trackGaEvent('search_shortcut_used');

        if (isSearchSectionCollapsed) {
          toggleSearchSection();
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        } else {
          searchInputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isSearchSectionCollapsed, toggleSearchSection, trackGaEvent]);


  const getSectionProps = useCallback((sectionId: string, dndPropsBase: Omit<SectionRenderProps, 'currentHeight' | 'isResizable' | 'onResizeMouseDown'>): SpecificAppSectionProps => {
    const dndProps: SectionRenderProps = {
      ...dndPropsBase,
      currentHeight: sectionHeights[sectionId] || DEFAULT_SECTION_HEIGHT_PX,
      isResizable: isDesktopView,
      onResizeMouseDown: handleResizeMouseDown,
    };

    switch (sectionId) {
      case SECTION_KEYS.SEARCH:
        return {
          ...dndProps,
          isSearchSectionCollapsed,
          toggleSearchSection,
          searchBarWrapperRef,
          searchTerm,
          setSearchTerm,
          handleSearchKeyDown,
          activeDescendantId,
          filteredItems,
          itemListWrapperRef,
          handleSelectItem,
          getItemIconUrl,
          activeSuggestionIndex,
          favoriteItemIds,
          handleToggleFavoriteQuickAction,
          wordingPreference,
          isConsentGranted,
          isLoadingItems,
          searchInputRef,
        };
      case SECTION_KEYS.FAVORITES:
        return {
          ...dndProps,
          favoriteItemIds,
          allItems,
          onSelectItemById: (itemId) => handleSelectItemById(itemId, undefined, undefined, 'favorites_list'),
          onRemoveFavorite: removeFavoriteItem,
          getItemIconUrl,
          favoriteItemPrices,
          favoriteItemHourlyChanges,
          favoriteItemSparklineData,
          showFavoriteSparklines,
          wordingPreference,
          isRefreshingFavorites,
          onRefreshAllFavorites: () => handleRefreshAllFavorites(false), 
          isConsentGranted,
          onQuickSetAlert: handleQuickSetAlertFromFavorites,
          isCollapsed: isFavoritesSectionCollapsed,
          onToggleCollapse: toggleFavoritesSection,
        };
      case SECTION_KEYS.TOP_MOVERS:
        return {
          ...dndProps,
          topMoversData,
          isLoading: isLoadingTopMovers,
          error: topMoversError,
          selectedTimespan: selectedMoversTimespan,
          onSetTimespan: handleSetTopMoversTimespan, 
          onRefresh: handleRefreshTopMovers,
          isCollapsed: isTopMoversSectionCollapsed,
          onToggleCollapse: memoizedToggleTopMoversSection,
          onSelectItemById: (itemId: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number) => 
            handleSelectItemById(itemId, originTimespan, originSnapshotTimestampMs, 'top_movers_list'),
          getItemIconUrl,
          lastFetchedTimestamp: topMoversLastFetched,
          topMoversCalculationMode,
          onSetTopMoversCalculationMode: (mode) => {
            setTopMoversCalculationMode(mode);
          },
          topMoversMetricType,
          onSetTopMoversMetricType: (metric) => {
            setTopMoversMetricType(metric);
          },
        };
      case SECTION_KEYS.ALERTS:
        return {
          ...dndProps,
          alerts,
          addAlert,
          removeAlert,
          updateAlert,
          allItems,
          getItemName,
          getItemIconUrl,
          addNotification,
          onSelectAlertItemById: (itemId) => handleSelectItemById(itemId, undefined, undefined, 'alerts_list'),
          isConsentGranted,
          isCollapsed: isAlertsSectionCollapsed,
          onToggleCollapse: toggleAlertsSection,
        };
      default:
        throw new Error(`[App.tsx] getSectionProps: Unhandled sectionId "${sectionId}". This should have been caught earlier.`);
    }
  }, [
    sectionHeights, isDesktopView, handleResizeMouseDown, 
    isSearchSectionCollapsed, toggleSearchSection, searchTerm, setSearchTerm, handleSearchKeyDown, activeDescendantId, filteredItems, handleSelectItem, getItemIconUrl, activeSuggestionIndex, favoriteItemIds, handleToggleFavoriteQuickAction, wordingPreference, isConsentGranted, isLoadingItems, searchBarWrapperRef, itemListWrapperRef,
    allItems, handleSelectItemById, removeFavoriteItem, favoriteItemPrices, favoriteItemHourlyChanges, favoriteItemSparklineData, showFavoriteSparklines, isRefreshingFavorites, handleRefreshAllFavorites, handleQuickSetAlertFromFavorites, isFavoritesSectionCollapsed, toggleFavoritesSection,
    topMoversData, isLoadingTopMovers, topMoversError, selectedMoversTimespan, handleSetTopMoversTimespan, handleRefreshTopMovers, isTopMoversSectionCollapsed, memoizedToggleTopMoversSection, topMoversLastFetched, topMoversCalculationMode, setTopMoversCalculationMode, topMoversMetricType, setTopMoversMetricType,
    alerts, addAlert, removeAlert, updateAlert, getItemName, addNotification, isAlertsSectionCollapsed, toggleAlertsSection
  ]);


  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-8 flex flex-col items-center">
      <NotificationBar notifications={notifications} />
      <header className="w-full max-w-6xl mb-8 text-center">
         <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
                <button 
                    onClick={toggleSettingsModal} 
                    className="p-2 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
                    aria-label="Open settings"
                    title="Open settings"
                >
                  <SettingsIcon className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" />
                </button>
                <button
                    onClick={toggleDragAndDrop}
                    className="p-2 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors hidden md:block"
                    aria-label={isDragAndDropEnabled ? "Disable section reordering" : "Enable section reordering"}
                    title={isDragAndDropEnabled ? "Disable section reordering" : "Enable section reordering"}
                >
                    {isDragAndDropEnabled ? (
                        <ReorderIcon className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" />
                    ) : (
                        <ReorderDisabledIcon className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" />
                    )}
                </button>
                <button
                    onClick={togglePortfolioModal}
                    className={`p-2 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors ${!isConsentGranted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Open Portfolio"
                    title={isConsentGranted ? "Open Portfolio" : "Enable preferences in settings to use Portfolio"}
                    disabled={!isConsentGranted}
                >
                    <PortfolioIcon className={`h-7 w-7 ${isConsentGranted ? 'text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]' : 'text-[var(--text-muted)]'}`} />
                </button>
            </div>
            
            <button 
              onClick={handleResetView}
              className="flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] rounded-md p-1 mx-auto"
              aria-label="GE Pulse - Click to reset item view"
              disabled={!selectedItem} 
            >
                <svg width="80" height="50" viewBox="0 0 135 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`mr-3 transition-opacity ${selectedItem ? 'group-hover:opacity-80' : 'opacity-100'}`}>
                    <path d="M10 30 Q25 5 40 30 T70 30 Q85 55 90 30" stroke="var(--logo-pulse-color)" strokeWidth="5" fill="transparent"/>
                    <circle cx="90" cy="30" r="8" fill="var(--logo-coin-fill)" stroke="var(--logo-coin-stroke)" strokeWidth="2" className="logo-dot-pulse"/>
                </svg>
                <h1 className={`text-4xl md:text-5xl font-bold text-[var(--text-accent)] title-neon-glow transition-opacity ${selectedItem ? 'group-hover:opacity-80' : 'opacity-100'}`}>GE Pulse</h1>
            </button>

            <div className="flex items-center justify-end gap-1">
                <div className="block md:hidden w-[5.75rem] h-11"></div> 
                <div className="hidden md:block w-[8.75rem] h-11"></div> 
            </div>
        </div>
        <p className="text-[var(--text-secondary)] mt-1">Live prices & insights for Old School RuneScape.</p>
      </header>

      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={toggleSettingsModal}
          showChartGrid={showChartGrid}
          onToggleChartGrid={toggleChartGrid}
          showChartLineGlow={showChartLineGlow}
          onToggleChartLineGlow={toggleChartLineGlow}
          showVolumeChart={showVolumeChart}
          onToggleShowVolumeChart={toggleShowVolumeChart}
          showFavoriteSparklines={showFavoriteSparklines}
          onToggleFavoriteSparklines={toggleShowFavoriteSparklines}
          activeThemeName={activeThemeName}
          onSetThemeName={handleThemeChange} 
          themes={APP_THEMES}
          enableDesktopNotifications={enableDesktopNotifications}
          onToggleDesktopNotifications={handleToggleDesktopNotifications}
          desktopNotificationPermission={desktopNotificationPermission}
          enableInAppAlertSounds={enableInAppAlertSounds}
          onToggleInAppAlertSounds={toggleEnableInAppAlertSounds}
          wordingPreference={wordingPreference}
          onSetWordingPreference={(pref) => {
            setWordingPreference(pref);
            trackGaEvent('change_wording_preference', { preference: pref });
          }}
          consentStatus={consentStatus}
          onGrantConsent={handleConsentGranted}
          onRevokeConsent={handleRevokeConsent}
          isDragAndDropEnabled={isDragAndDropEnabled}
          onToggleDragAndDrop={toggleDragAndDrop}
        />
      )}

      {isChangelogModalOpen && (
        <ChangelogModal 
          isOpen={isChangelogModalOpen} 
          onClose={toggleChangelogModal} 
          entries={changelogEntries}
          hasNewUpdate={hasNewUpdate}
        />
      )}

      {isPrivacyPolicyModalOpen && (
        <PrivacyPolicyModal 
          isOpen={isPrivacyPolicyModalOpen} 
          onClose={togglePrivacyPolicyModal} 
        />
      )}
      
      {isFeedbackModalOpen && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={toggleFeedbackModal}
          addNotification={addNotification}
          trackGaEvent={trackGaEvent}
        />
      )}

      {isPortfolioModalOpen && isConsentGranted && (
        <PortfolioModal
          isOpen={isPortfolioModalOpen}
          onClose={togglePortfolioModal}
          portfolioEntries={portfolioEntries}
          addPortfolioEntry={(item, quantity, price, date) => {
            addPortfolioEntry(item, quantity, price, date);
            trackGaEvent('portfolio_add_investment', {item_id: item.id, item_name: item.name, quantity: quantity});
          }}
          recordSaleAndUpdatePortfolio={(entryId, quantity, price, date) => {
             const entry = portfolioEntries.find(e => e.id === entryId);
             recordSaleAndUpdatePortfolio(entryId, quantity, price, date);
             if (entry) trackGaEvent('portfolio_record_sale', {item_id: entry.itemId, item_name: getItemName(entry.itemId), quantity_sold: quantity});
          }}
          deletePortfolioEntry={(entryId) => {
             const entry = portfolioEntries.find(e => e.id === entryId);
             deletePortfolioEntry(entryId);
             if (entry) trackGaEvent('portfolio_delete_entry', {item_id: entry.itemId, item_name: getItemName(entry.itemId)});
          }} 
          clearAllPortfolioData={() => {
            clearAllPortfolioData();
            trackGaEvent('portfolio_clear_all');
          }} 
          updatePortfolioEntryDetails={(entryId, updates) => {
             const entry = portfolioEntries.find(e => e.id === entryId);
             updatePortfolioEntryDetails(entryId, updates);
             if (entry) trackGaEvent('portfolio_edit_entry', {item_id: entry.itemId, item_name: getItemName(entry.itemId)});
          }}
          replacePortfolio={(newEntries) => {
            replacePortfolio(newEntries);
            trackGaEvent('portfolio_import_local', { method: 'json_or_code', entry_count: newEntries.length, status: 'success' });
          }} 
          allItems={allItems}
          getItemIconUrl={getItemIconUrl}
          getItemName={getItemName}
          fetchLatestPrice={fetchLatestPrice}
          addNotification={addNotification}
          isConsentGranted={isConsentGranted}
          onSelectItemAndClose={handleSelectPortfolioItemAndCloseModal}
          userRsn={userRsn}
          onUserRsnChange={handleUserRsnChange}
          isGoogleApiInitialized={isDevDriveMode || isGoogleApiInitialized}
          onSaveToDrive={isDevDriveMode ? devHandleSaveToDrive : handleSaveToDrive}
          onLoadFromDrive={isDevDriveMode ? devHandleLoadFromDrive : handleLoadFromDrive}
          isDriveActionLoading={isDriveActionLoading}
          driveFeedback={driveFeedbackForModal}
          trackGaEvent={trackGaEvent}
          showChartLineGlow={showChartLineGlow}
        />
      )}

      {isSetAlertModalOpen && itemForSetAlertModal && (
        <SetAlertModal
          isOpen={isSetAlertModalOpen}
          onClose={closeSetAlertModal}
          item={itemForSetAlertModal}
          onAddAlertCallback={handleAddAlertFromModal}
          addNotification={addNotification} 
          isConsentGranted={isConsentGranted}
        />
      )}
      
      {isAddInvestmentFromViewModalOpen && itemForAddInvestmentFromViewModal && isConsentGranted && (
        <AddInvestmentFromViewModal
          isOpen={isAddInvestmentFromViewModalOpen}
          onClose={closeAddInvestmentFromViewModal}
          itemToAdd={itemForAddInvestmentFromViewModal}
          addPortfolioEntryCallback={(item, quantity, price, date) => {
            addPortfolioEntry(item, quantity, price, date);
            trackGaEvent('portfolio_add_investment', {item_id: item.id, item_name: item.name, quantity: quantity, origin: 'item_display_modal'});
          }}
          addNotification={addNotification}
          isConsentGranted={isConsentGranted}
          getItemIconUrl={getItemIconUrl}
          fetchLatestPrice={fetchLatestPrice} 
        />
      )}


      {isLoadingItems ? (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-[var(--text-secondary)]">Loading item data...</p>
        </div>
      ) : error && allItems.length === 0 ? (
         <div className="w-full max-w-xl bg-[var(--error-bg)] p-6 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold mb-2 text-[var(--error-text)]">Error Loading Items</h2>
          <p className="text-[var(--error-text)] opacity-80">{error}</p>
          <p className="mt-4 text-sm text-[var(--error-text)] opacity-70">Please ensure you have an internet connection. The API might be temporarily unavailable.</p>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside 
            className="md:col-span-1 space-y-6"
            onDragOver={handleDragOverContainer} 
          >
            {isDesktopView && isResetNeeded && (
              <div className="flex justify-center -mb-2">
                <button
                  onClick={handleResetSectionHeights}
                  className="px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 ease-in-out bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
                  aria-label="Reset all sidebar section heights to their default value"
                >
                  Reset Section Heights
                </button>
              </div>
            )}
            {sidebarSectionOrder.map(sectionId => {
              const config = sectionsConfig[sectionId as keyof typeof sectionsConfig];
              if (!config) return null;
              const ComponentToRender = config.Component;
              const dndRenderPropsBase: Omit<SectionRenderProps, 'currentHeight' | 'isResizable' | 'onResizeMouseDown'> = { 
                sectionId, 
                isDragAndDropEnabled, 
                handleDragStart, 
                draggedItem 
              };
              const componentProps = getSectionProps(sectionId, dndRenderPropsBase);

              return (
                <div 
                  key={sectionId}
                  onDragEnter={() => handleDragEnterItem(sectionId)}
                  onDragLeave={() => handleDragLeaveItem(sectionId)}
                  onDragOver={handleDragOverItem} 
                  onDrop={(e) => { 
                    if (!isDragAndDropEnabled) return;
                    e.preventDefault(); 
                    handleDrop(sectionId);
                  }}
                  onDragEnd={handleDragEnd}
                  aria-dropeffect={isDragAndDropEnabled && draggedItem && draggedItem !== sectionId ? "move" : "none"}
                  className={`
                    transition-all duration-150 ease-in-out
                    ${isDragAndDropEnabled && dragOverItem === sectionId && draggedItem !== sectionId ? 'ring-2 ring-[var(--border-accent)] ring-offset-2 ring-offset-[var(--bg-primary)] scale-[1.01]' : ''}
                    ${isDragAndDropEnabled && draggedItem === sectionId ? 'opacity-50' : ''} 
                  `}
                >
                  <ComponentToRender {...componentProps as any} />
                </div>
              );
            })}
          </aside>

          <main 
            id="item-display-section" 
            className="md:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl min-h-[400px] space-y-4 scroll-mt-4"
          >
             {selectedItem && (
                <RefreshControls
                    isAutoRefreshEnabled={isAutoRefreshEnabled}
                    onToggleAutoRefresh={handleToggleAutoRefresh}
                    onManualRefresh={handleManualRefresh}
                    timeToNextRefresh={timeToNextRefresh}
                    isLoading={isLoadingPrice}
                    isItemSelected={!!selectedItem}
                />
            )}
            {selectedItem ? (
              <ItemDisplay
                item={selectedItem}
                latestPrice={latestPrice}
                historicalData={historicalData}
                selectedTimespan={selectedTimespan}
                onTimespanChange={handleTimespanChange}
                isLoading={isLoadingPrice}
                error={error}
                getItemIconUrl={getItemIconUrl}
                showChartGrid={showChartGrid}
                showChartLineGlow={showChartLineGlow}
                showVolumeChart={showVolumeChart}
                favoriteItemIds={favoriteItemIds}
                onAddFavorite={addFavoriteItem}
                onRemoveFavorite={removeFavoriteItem}
                wordingPreference={wordingPreference}
                onSetAlertForItem={openSetAlertModalForItem}
                onAddToPortfolio={openAddInvestmentFromViewModal}
                isConsentGranted={isConsentGranted}
                addNotification={addNotification}
                onShareItem={(item) => { 
                  trackGaEvent('share_item', { item_id: item.id, item_name: item.name, method: 'clipboard_copy'});
                }}
              />
            ) : (
              <div className="relative flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)] overflow-hidden">
                <SearchIcon className="absolute w-40 h-40 text-[var(--bg-primary)] opacity-70" />
                <div className="relative">
                  <p className="text-xl font-semibold text-[var(--text-primary)]">Select an item to view its details</p>
                  <p className="mt-1 text-base">
                    Use the search bar on the left to find an item,
                    <br className="hidden sm:block" />
                    or click an item from your {favTerm}s list.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
       <footer className="w-full max-w-6xl mt-12 pt-6 border-t border-[var(--border-primary)] text-center text-[var(--text-muted)] text-sm">
        <p>Data sourced from <a href="https://prices.runescape.wiki/api/v1/osrs/mapping" target="_blank" rel="noopener noreferrer" className="text-[var(--link-text)] hover:text-[var(--link-text-hover)]">prices.runescape.wiki API</a>.</p>
        <p>This is a fan-made project and is not affiliated with Jagex Ltd.</p>
        <p className="mt-2">
          <button onClick={toggleChangelogModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline inline-flex items-center gap-1.5">
            <span>View Changelog</span>
            {hasNewUpdate && (
                <span className="px-2 py-0.5 text-[0.6rem] font-bold leading-none text-white bg-[var(--price-high)] rounded-full animate-pulse">
                NEW
                </span>
            )}
          </button>
           <span className="mx-2 text-[var(--text-muted)]">|</span>
           <button onClick={toggleFeedbackModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline">
            Request Feature / Report Bug
          </button>
           <span className="mx-2 text-[var(--text-muted)]">|</span>
           <button onClick={togglePrivacyPolicyModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline">
            Privacy Policy
          </button>
        </p>
        {consentStatus !== 'pending' && (
            <p className="mt-2">
                <button onClick={toggleSettingsModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline">
                    Manage Cookie Preferences
                </button>
            </p>
        )}
        <p className="mt-2 text-xs text-[var(--text-muted)]">{APP_VERSION}</p>
      </footer>
      {consentStatus === 'pending' && (
        <ConsentBanner 
          onGrant={handleConsentGranted}
          onDeny={handleConsentDenied}
        />
      )}
    </div>
  );
};

export default App;