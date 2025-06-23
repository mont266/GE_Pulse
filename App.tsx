

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, PriceAlert, Timespan, NotificationMessage, AppTheme, TimespanAPI, FavoriteItemId, FavoriteItemHourlyChangeData, FavoriteItemHourlyChangeState, WordingPreference, FavoriteItemSparklineState, ChartDataPoint as SparklineDataPoint, TopMoversTimespan, SectionRenderProps, TopMoversData, TopMoversCalculationMode, TopMoversMetricType, PortfolioEntry, LatestPriceApiResponse, GoogleUserProfile } from './src/types'; // Updated path for types
import { fetchItemMapping, fetchLatestPrice, fetchHistoricalData } from './services/runescapeService';
import { googleDriveService } from './services/googleDriveService'; // Import the new service
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
import { PrivacyPolicyModal } from './src/components/PrivacyPolicyModal'; // Added Privacy Policy Modal
import { SetAlertModal } from './components/SetAlertModal'; 
import { FeedbackModal } from './components/FeedbackModal'; 
import { TopMoversSection } from './components/TopMoversSection';
import { PortfolioModal } from './components/PortfolioModal';
import { AddInvestmentFromViewModal } from './components/portfolio/AddInvestmentFromViewModal'; // New modal
import { changelogEntries } from './src/changelogData'; 
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { useTopMovers } from './hooks/useTopMovers';
import { usePortfolio } from './hooks/usePortfolio';
import { ChevronDownIcon, SettingsIcon, ReorderIcon, ReorderDisabledIcon, SearchIcon, FilledHeartIcon, EmptyHeartIcon, BellIcon, TrendingUpIcon, PortfolioIcon, AddToPortfolioIcon } from './components/Icons'; // Added AddToPortfolioIcon
import { 
  API_BASE_URL, ITEM_IMAGE_BASE_URL, AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_SECONDS, APP_THEMES, 
  FAVORITES_STORAGE_KEY, WORDING_PREFERENCE_STORAGE_KEY, DEFAULT_WORDING_PREFERENCE, CONSENT_STORAGE_KEY,
  ALL_USER_PREFERENCE_KEYS, DEFAULT_THEME_ID, CHART_GRID_STORAGE_KEY, CHART_LINE_GLOW_STORAGE_KEY,
  VOLUME_CHART_STORAGE_KEY, ACTIVE_THEME_STORAGE_KEY, DESKTOP_NOTIFICATIONS_ENABLED_KEY,
  FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY, SIDEBAR_ORDER_STORAGE_KEY, DEFAULT_SIDEBAR_ORDER, SECTION_KEYS,
  DRAG_DROP_ENABLED_STORAGE_KEY, DEFAULT_TOP_MOVERS_CALCULATION_MODE, DEFAULT_TOP_MOVERS_METRIC_TYPE,
  PORTFOLIO_STORAGE_KEY, GDRIVE_ACCESS_TOKEN_KEY
} from './constants'; 
import { DragEvent } from 'react';

// Helper hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


const getInitialConsentStatus = (): 'pending' | 'granted' | 'denied' => {
  const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (storedConsent === 'granted' || storedConsent === 'denied') {
    return storedConsent;
  }
  return 'pending';
};

const APP_VERSION = "Beta v0.11";

// Define SearchSectionLayout component
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
  handleSelectItem: (item: ItemMapInfo) => void;
  getItemIconUrl: (iconName: string) => string;
  activeSuggestionIndex: number;
  favoriteItemIds: FavoriteItemId[];
  handleToggleFavoriteQuickAction: (itemId: FavoriteItemId) => void;
  wordingPreference: WordingPreference;
  isConsentGranted: boolean;
  isLoadingItems: boolean;
}

const SearchSectionLayout = React.memo(function SearchSectionLayout({
  sectionId, isDragAndDropEnabled, handleDragStart, draggedItem,
  isSearchSectionCollapsed, toggleSearchSection, searchBarWrapperRef, searchTerm, setSearchTerm, handleSearchKeyDown,
  activeDescendantId, filteredItems, itemListWrapperRef, handleSelectItem, getItemIconUrl, activeSuggestionIndex,
  favoriteItemIds, handleToggleFavoriteQuickAction, wordingPreference, isConsentGranted, isLoadingItems
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
        aria-controls="search-section-content"
      >
        <div className="flex-grow flex items-center min-w-0">
          <SearchIcon className="w-6 h-6 text-[var(--text-accent)] mr-3 pointer-events-none flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-[var(--text-accent)] pointer-events-none">Search Item</h2>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 pointer-events-none ${isSearchSectionCollapsed ? '-rotate-90' : ''}`} />
      </button>
      {!isSearchSectionCollapsed && (
        <div id="search-section-content" className="p-4 md:p-6 rounded-b-lg space-y-4">
          <div ref={searchBarWrapperRef}>
            <SearchBar
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
                onSelectItem={handleSelectItem}
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
      )}
    </div>
  );
});

interface FavoritesListProps extends SectionRenderProps {
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

interface TopMoversSectionProps extends SectionRenderProps {
  topMoversData: TopMoversData | null;
  isLoading: boolean;
  error: string | null;
  selectedTimespan: TopMoversTimespan;
  onSetTimespan: (timespan: TopMoversTimespan) => void;
  onRefresh: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectItemById: (itemId: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number) => void; 
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
  onSelectAlertItemById: (itemId: number) => void;
  isConsentGranted: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type SpecificAppSectionProps = 
  | SearchSectionLayoutProps 
  | FavoritesListProps 
  | TopMoversSectionProps 
  | AlertsManagerProps;


const App: React.FC = () => {
  const initialConsent = getInitialConsentStatus();
  const [consentStatus, setConsentStatus] = useState<'pending' | 'granted' | 'denied'>(initialConsent);

  // Google Drive State
  const [isGoogleApiReady, setIsGoogleApiReady] = useState<boolean>(false);
  const [isGoogleUserSignedIn, setIsGoogleUserSignedIn] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isDriveActionLoading, setIsDriveActionLoading] = useState<boolean>(false);


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

  const isConsentGranted = useMemo(() => consentStatus === 'granted', [consentStatus]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    notificationIdCounterRef.current += 1;
    const id = `notif-${notificationIdCounterRef.current}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Initialize usePortfolio hook earlier
  const {
    portfolioEntries,
    addPortfolioEntry,
    recordSaleAndUpdatePortfolio,
    deletePortfolioEntry,
    clearAllPortfolioData,
    updatePortfolioEntryDetails,
    replacePortfolio, 
  } = usePortfolio(isConsentGranted, addNotification);


  // Google Drive API Initialization Effect
  useEffect(() => {
    googleDriveService.init({
      onGisLoaded: () => {
        console.log('Google Identity Services (GIS) loaded.');
        // GIS is loaded, now check for API key and Client ID to proceed with GAPI init
        const apiKey = (window as any).GOOGLE_API_KEY;
        const clientId = (window as any).GOOGLE_CLIENT_ID;

        if (!apiKey || !clientId) {
          console.warn("Google API Key or Client ID is missing from window. Google Drive features will be unavailable.");
          addNotification("Google Drive features unavailable: Missing API credentials.", "error");
          setIsGoogleApiReady(false);
          setGoogleAuthError("API credentials missing.");
          return;
        }
        
        // Initialize GAPI now that GIS is ready and keys are confirmed
        googleDriveService.initGapiClient(() => {
            console.log('Google API Client (GAPI) initialized.');
            setIsGoogleApiReady(true);
            setGoogleAuthError(null);
            // Attempt to restore sign-in state or check if already signed in
             const token = googleDriveService.getToken();
             if (token) {
                setIsGoogleUserSignedIn(true);
                setGoogleUser(googleDriveService.getSignedInUserProfile());
             }
        }, (error) => {
            console.error("Failed to initialize GAPI client:", error);
            addNotification("Failed to initialize Google Drive services.", "error");
            setIsGoogleApiReady(false);
            setGoogleAuthError("GAPI initialization failed.");
        });
      },
      onAuthStatusChanged: (isSignedIn, user, error) => {
        console.log('Google Auth Status Changed:', { isSignedIn, user, error });
        setIsGoogleUserSignedIn(isSignedIn);
        setGoogleUser(user);
        setGoogleAuthError(error);
        if (error) {
          addNotification(`Google Sign-In: ${error}`, 'error');
        } else if (isSignedIn && user) {
          addNotification(`Signed in to Google Drive as ${user.email}`, 'success');
        } else if (!isSignedIn && !error) {
           // Don't show notification on initial load if not signed in, or on explicit sign out
        }
      },
    });
  }, [addNotification]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isGoogleApiReady) {
      addNotification('Google Drive service is not ready. Please try again in a moment.', 'info');
      return;
    }
    try {
      await googleDriveService.signIn();
      // Auth status change will be handled by the callback in init
    } catch (err: any) {
      console.error("Error during Google Sign-In:", err);
      addNotification(`Google Sign-In failed: ${err.message || 'Unknown error'}`, 'error');
      setGoogleAuthError(err.message || 'Unknown error during sign-in.');
    }
  }, [isGoogleApiReady, addNotification]);

  const handleGoogleSignOut = useCallback(async () => {
    try {
      await googleDriveService.signOut();
      addNotification('Signed out from Google Drive.', 'info');
    } catch (err: any) {
      console.error("Error during Google Sign-Out:", err);
      addNotification(`Google Sign-Out failed: ${err.message || 'Unknown error'}`, 'error');
    }
  }, [addNotification]);

  const handleSaveToDrive = useCallback(async () => {
    if (!isGoogleUserSignedIn || portfolioEntries.length === 0) {
      addNotification('Please sign in to Google and ensure you have portfolio data to save.', 'info');
      return;
    }
    setIsDriveActionLoading(true);
    try {
      const portfolioJson = JSON.stringify(portfolioEntries);
      await googleDriveService.showSavePicker(portfolioJson, 'gepulse_portfolio.json');
      addNotification('Portfolio saved to Google Drive!', 'success');
    } catch (error: any) {
      console.error('Error saving to Google Drive:', error);
      if (error.message && error.message.includes('picker_closed')) {
        addNotification('Save to Drive cancelled by user.', 'info');
      } else {
        addNotification(`Failed to save to Google Drive: ${error.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setIsDriveActionLoading(false);
    }
  }, [isGoogleUserSignedIn, portfolioEntries, addNotification]);

  const handleLoadFromDrive = useCallback(async () => {
    if (!isGoogleUserSignedIn) {
      addNotification('Please sign in to Google to load data from Drive.', 'info');
      return;
    }
    setIsDriveActionLoading(true);
    try {
      const fileContent = await googleDriveService.showOpenPicker();
      if (fileContent) {
        const parsedPortfolio: PortfolioEntry[] = JSON.parse(fileContent);
        // TODO: Add more robust validation for parsedPortfolio structure
        if (Array.isArray(parsedPortfolio)) {
          replacePortfolio(parsedPortfolio);
          addNotification('Portfolio loaded from Google Drive!', 'success');
        } else {
          throw new Error('Invalid portfolio file format.');
        }
      } else {
        // Picker was cancelled or no file selected
        addNotification('Load from Drive cancelled or no file selected.', 'info');
      }
    } catch (error: any) {
      console.error('Error loading from Google Drive:', error);
       if (error.message && error.message.includes('picker_closed')) {
        addNotification('Load from Drive cancelled by user.', 'info');
      } else {
        addNotification(`Failed to load from Google Drive: ${error.message || 'Invalid file or unknown error'}`, 'error');
      }
    } finally {
      setIsDriveActionLoading(false);
    }
  }, [isGoogleUserSignedIn, addNotification, replacePortfolio]);


  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(true);
  const prevIsAutoRefreshEnabled = usePrevious(isAutoRefreshEnabled);

  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number>(AUTO_REFRESH_INTERVAL_SECONDS);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState<boolean>(false);
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState<boolean>(false); // Privacy Policy state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false); 
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  
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

  const toggleSearchSection = () => setIsSearchSectionCollapsed(prev => !prev);
  const toggleAlertsSection = () => setIsAlertsSectionCollapsed(prev => !prev);
 
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
      // Ensure migration for old string values if any
      if (saved === 'true') return true;
      if (saved === 'false') return false;
      // Default to false if not 'true' or 'false' string, or if not JSON parsable to boolean
      try {
        return saved !== null ? JSON.parse(saved) : false;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission>(Notification.permission);

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

  // Effect for Drag & Drop toggle notification
  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(DRAG_DROP_ENABLED_STORAGE_KEY, JSON.stringify(isDragAndDropEnabled));
    }
    if (prevIsDragAndDropEnabled !== undefined && prevIsDragAndDropEnabled !== isDragAndDropEnabled) {
      addNotification(`Section reordering ${isDragAndDropEnabled ? 'enabled' : 'disabled'}.`, 'info');
    }
  }, [isDragAndDropEnabled, prevIsDragAndDropEnabled, addNotification, isConsentGranted]);

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
    prevSelectedMoversTimespan
  ]);


  useEffect(() => {
    if (!isTopMoversSectionCollapsed && allItems.length > 0 && !topMoversData && !topMoversError && !isLoadingTopMovers) {
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
    topMoversMetricType
  ]);


  const toggleTopMoversSection = useCallback(() => {
    setIsTopMoversSectionCollapsed(prev => {
        const newCollapsedState = !prev;
        if (!newCollapsedState && allItems.length > 0 && !topMoversData && !topMoversError && !isLoadingTopMovers) {
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
    topMoversMetricType
  ]);

  const memoizedToggleTopMoversSection = useCallback(toggleTopMoversSection, [
    allItems.length,
    topMoversData, 
    isLoadingTopMovers, 
    topMoversError, 
    fetchMovers, 
    selectedMoversTimespan, 
    topMoversMetricType
  ]);

  const handleRefreshAllFavorites = useCallback(async (isAutoRefresh: boolean = false) => {
    if (favoritesRefreshLockRef.current) return;
    if (isRefreshingFavorites || favoriteItemIds.length === 0 || !allItems.length || !isConsentGranted) return;
  
    favoritesRefreshLockRef.current = true;
    setIsRefreshingFavorites(true);
    const isMountedRef = { current: true };
    let allSucceeded = true;
  
    const newFavoriteItemPrices: typeof favoriteItemPrices = {};
    const newFavoriteItemHourlyChanges: typeof favoriteItemHourlyChanges = {};
    const newFavoriteItemSparklineData: typeof favoriteItemSparklineData = {};
  
    for (const itemId of favoriteItemIds) {
      if (!isMountedRef.current) break;
      const itemDetail = allItems.find(it => it.id === itemId);
      if (!itemDetail) continue;
  
      newFavoriteItemPrices[itemId] = 'loading';
      newFavoriteItemHourlyChanges[itemId] = 'loading';
      newFavoriteItemSparklineData[itemId] = 'loading';
    }
    if (isMountedRef.current) {
      setFavoriteItemPrices(prev => ({ ...prev, ...newFavoriteItemPrices }));
      setFavoriteItemHourlyChanges(prev => ({ ...prev, ...newFavoriteItemHourlyChanges }));
      setFavoriteItemSparklineData(prev => ({ ...prev, ...newFavoriteItemSparklineData }));
    }
  
    for (const itemId of favoriteItemIds) {
      if (!isMountedRef.current) break;
  
      try {
        const priceData = await fetchLatestPrice(itemId);
        if (!isMountedRef.current) break;
        setFavoriteItemPrices(prev => ({ ...prev, [itemId]: priceData }));
  
        if (priceData && priceData.high !== null) {
          const oneHourHistoricalData = await fetchHistoricalData(itemId, '5m');
          if (!isMountedRef.current) break;
          
          const nowMsSpark = Date.now();
          const oneHourAgoMsThresholdSpark = nowMsSpark - (60 * 60 * 1000);
          const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowMsSpark);
          if (isMountedRef.current) {
              setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: sparklinePoints.length > 1 ? sparklinePoints : 'no_data' }));
          }
          
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
                 if (!bestFallbackCandidate && sortedHistorical.length > 0) { 
                    priceThen = sortedHistorical[0].price;
                } else if (bestFallbackCandidate) {
                    priceThen = bestFallbackCandidate.price;
                }
          }
  
          if (priceThen !== null && priceData.high !== null) {
            const changeAbsolute = priceData.high - priceThen;
            const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (priceData.high > 0 ? Infinity : 0);
            if (isMountedRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: { changeAbsolute, changePercent } }));
          } else {
            if (isMountedRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'no_data' }));
          }
        } else { 
          const currentPriceDataInElse = priceData; 
          if (isMountedRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: currentPriceDataInElse === null ? 'no_data' : 'error' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: currentPriceDataInElse === null ? 'no_data' : 'error' }));
          }
        }
      } catch (err) {
        console.error(`Failed to refresh data for favourite item ${itemId}`, err);
        allSucceeded = false;
        if (isMountedRef.current) {
          setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'error' }));
          setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' }));
          setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'error' }));
        }
      }
    }
  
    if (isMountedRef.current) {
      setIsRefreshingFavorites(false);
      if (allSucceeded && favoriteItemIds.length > 0 && !isAutoRefresh) { // Only show success if not auto-refresh
        addNotification('Favorite items data refreshed!', 'success');
      } else if (!allSucceeded && favoriteItemIds.length > 0) { // Always show error
        addNotification('Some favorite items could not be refreshed.', 'error');
      }
    }
    favoritesRefreshLockRef.current = false;
  }, [isRefreshingFavorites, favoriteItemIds, allItems, addNotification, isConsentGranted]);

  // 1-minute auto-refresh for favorites
  useEffect(() => {
    let intervalId: number | null = null;

    if (isConsentGranted && favoriteItemIds.length > 0 && allItems.length > 0) {
      intervalId = window.setInterval(() => {
        if (!favoritesRefreshLockRef.current && !isRefreshingFavorites) {
          handleRefreshAllFavorites(true); // Pass true for auto-refresh to suppress success notification
        }
      }, 60 * 1000); // 1 minute
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isConsentGranted, favoriteItemIds, allItems, handleRefreshAllFavorites, isRefreshingFavorites]);


  const toggleFavoritesSection = useCallback(() => {
    setIsFavoritesSectionCollapsed(prev => {
      const newCollapsedState = !prev;
      if (!newCollapsedState && isConsentGranted && favoriteItemIds.length > 0 && allItems.length > 0) {
        const shouldInitialRefresh = Object.values(favoriteItemPrices).some(price => price === null || price === undefined) || Object.values(favoriteItemPrices).length < favoriteItemIds.length;

        if (!isRefreshingFavorites && !favoritesRefreshLockRef.current && shouldInitialRefresh) { 
           handleRefreshAllFavorites();
        }
      }
      return newCollapsedState;
    });
  }, [isConsentGranted, favoriteItemIds, allItems.length, handleRefreshAllFavorites, isRefreshingFavorites, favoriteItemPrices]);


  useEffect(() => {
    if (consentStatus !== 'pending') {
      localStorage.setItem(CONSENT_STORAGE_KEY, consentStatus);
    }
  }, [consentStatus]);

  const handleAlertTriggered = useCallback((triggeredAlert: PriceAlert) => {
    const message = `Alert: ${triggeredAlert.itemName} ${triggeredAlert.condition === 'above' ? '>' : '<'} ${triggeredAlert.targetPrice.toLocaleString()} GP! Current: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`;
    addNotification(message, 'success');

    if (enableDesktopNotifications && desktopNotificationPermission === 'granted' && isConsentGranted) {
      if (Notification.permission === 'granted') {
        new Notification(`GE Pulse: ${triggeredAlert.itemName}`, {
          body: `${triggeredAlert.itemName} is now ${triggeredAlert.condition === 'above' ? 'above' : 'below'} ${triggeredAlert.targetPrice.toLocaleString()} GP.\nCurrent: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`,
          icon: getItemIconUrl(triggeredAlert.itemIcon),
          tag: triggeredAlert.id,
        });
      }
    }
  }, [addNotification, enableDesktopNotifications, desktopNotificationPermission, isConsentGranted, getItemIconUrl]);

  const { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage } = usePriceAlerts(
    handleAlertTriggered,
    fetchLatestPrice,
    isConsentGranted 
  );

  const resetPreferencesToDefault = useCallback(() => {
    setShowChartGrid(true);
    setShowChartLineGlow(true);
    setShowVolumeChart(false);
    setShowFavoriteSparklines(true); 
    setActiveThemeName(DEFAULT_THEME_ID);
    setEnableDesktopNotifications(false);
    setWordingPreference(DEFAULT_WORDING_PREFERENCE);
    setFavoriteItemIds([]);
    setFavoriteItemPrices({});
    setFavoriteItemHourlyChanges({});
    setFavoriteItemSparklineData({});
    setSidebarSectionOrder([...DEFAULT_SIDEBAR_ORDER]); 
    setIsDragAndDropEnabled(false); 
    if(clearAllAlertsAndStorage) clearAllAlertsAndStorage(); 
    if(clearAllPortfolioData) clearAllPortfolioData();
    addNotification('Preferences have been reset and will no longer be saved.', 'info');
  }, [clearAllAlertsAndStorage, clearAllPortfolioData, addNotification]);

  const handleConsentGranted = useCallback(() => {
    setConsentStatus('granted');
    addNotification('Thanks! Your preferences will now be saved.', 'success');
  }, [addNotification]);

  const handleConsentDenied = useCallback(() => {
    setConsentStatus('denied');
    ALL_USER_PREFERENCE_KEYS.forEach(key => localStorage.removeItem(key));
    resetPreferencesToDefault(); 
  }, [resetPreferencesToDefault]);

  const handleRevokeConsent = useCallback(() => {
    ALL_USER_PREFERENCE_KEYS.forEach(key => localStorage.removeItem(key));
    resetPreferencesToDefault();
    setConsentStatus('denied'); 
  }, [resetPreferencesToDefault]);

  const getItemName = useCallback((itemId: number): string => {
    return allItems.find(item => item.id === itemId)?.name || 'Unknown Item';
  }, [allItems]);
  
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
        const itemName = getItemName(itemChangedId);
        if (itemName !== 'Unknown Item') {
          addNotification(`${itemName} ${action === 'added' ? 'added to' : 'removed from'} ${favTerm}.`, action === 'added' ? 'success' : 'info');
        }
      }
    }
  }, [favoriteItemIds, prevFavoriteItemIds, getItemName, addNotification, wordingPreference, isConsentGranted, allItems.length]);


  const addFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (!prevIds.includes(itemId)) {
        return [...prevIds, itemId];
      }
      return prevIds;
    });
  }, []);

  const removeFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (prevIds.includes(itemId)) {
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
  }, []);


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
    if (!allItems.length || !isConsentGranted) return;
    const isMountedRefHook = { current: true };

    const fetchAllFavoriteDataSequentiallyHook = async () => {
      for (const itemId of favoriteItemIds) {
        if (!isMountedRefHook.current) break;

        const itemDetail = allItems.find(it => it.id === itemId);
        if (itemDetail) {
          if (favoriteItemPrices[itemId] !== undefined && 
              favoriteItemPrices[itemId] !== 'loading' &&
              favoriteItemPrices[itemId] !== 'error') { 
             continue; 
          }
          
          if (isMountedRefHook.current) {
            setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'loading' }));
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'loading' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'loading' }));
          }

          try {
            const priceData = await fetchLatestPrice(itemId);
            if (!isMountedRefHook.current) break; 
            setFavoriteItemPrices(prev => ({ ...prev, [itemId]: priceData }));
            
            if (priceData && priceData.high !== null) {
              try {
                const oneHourHistoricalData = await fetchHistoricalData(itemId, '5m');
                if (!isMountedRefHook.current) break;

                const nowMsSpark = Date.now();
                const oneHourAgoMsThresholdSpark = nowMsSpark - (60 * 60 * 1000);
                const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowMsSpark);
                if (isMountedRefHook.current) {
                  setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: sparklinePoints.length > 1 ? sparklinePoints : 'no_data' }));
                }

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
                  if (!bestFallbackCandidate && sortedHistorical.length > 0) { 
                      priceThen = sortedHistorical[0].price; 
                  } else if (bestFallbackCandidate) {
                      priceThen = bestFallbackCandidate.price;
                  }
                }

                if (priceThen !== null && priceData.high !== null) { 
                  const changeAbsolute = priceData.high - priceThen;
                  const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (priceData.high > 0 ? Infinity : 0);
                  if (isMountedRefHook.current) {
                    setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: { changeAbsolute, changePercent } }));
                  }
                } else {
                  if (isMountedRefHook.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'no_data' }));
                }
              } catch (histErr) {
                console.error(`Failed to fetch 5m historical for sparkline/hourly change (item ${itemId})`, histErr);
                if (isMountedRefHook.current) {
                  setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'error' }));
                  setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' }));
                }
              }
            } else { 
               const currentPriceDataInElse = priceData;
               if (isMountedRefHook.current ) {
                 setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: (currentPriceDataInElse === null ? 'no_data' : 'error') }));
                 setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: (currentPriceDataInElse === null ? 'no_data' : 'error') }));
               }
            }
          } catch (err) {
              console.error(`Failed to fetch price for favourite item ${itemId}`, err);
              if (isMountedRefHook.current) {
                setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'error' }));
              }
            }
          }
        }
    };

    fetchAllFavoriteDataSequentiallyHook();
    return () => { isMountedRefHook.current = false; };
  }, [favoriteItemIds, allItems, isConsentGranted]); 

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
      try {
        setError(null);
        setIsLoadingItems(true);
        const items = await fetchItemMapping();
        setAllItems(items);
      } catch (err) {
        console.error(err);
        setError('Failed to load item list. The RuneScape Wiki API might be down or there was a network issue.');
        addNotification('Failed to load item list.', 'error');
      } finally {
        setIsLoadingItems(false);
      }
    };
    loadInitialData();
  }, [addNotification]);

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
        } else {
          setEnableDesktopNotifications(false);
          addNotification('Desktop notification permission denied by user.', 'info');
        }
      }
    }
  }, [desktopNotificationPermission, enableDesktopNotifications, addNotification]);

  const toggleChartGrid = useCallback(() => setShowChartGrid(prev => !prev), []);
  const toggleChartLineGlow = useCallback(() => setShowChartLineGlow(prev => !prev), []);
  const toggleShowVolumeChart = useCallback(() => setShowVolumeChart(prev => !prev), []);
  const toggleShowFavoriteSparklines = useCallback(() => setShowFavoriteSparklines(prev => !prev), []);
  const toggleFeedbackModal = () => setIsFeedbackModalOpen(prev => !prev); 
  const togglePortfolioModal = () => {
    if (!isConsentGranted) {
      addNotification('Please enable preference storage in settings to use the Portfolio feature.', 'info');
      return;
    }
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
        case '1mo': apiTimestepToFetch = '6h'; break;
        case '3mo': case '6mo': case '1y': apiTimestepToFetch = '24h'; break;
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
      }
      
      if (favoriteItemIds.includes(currentItem.id) && isConsentGranted) {
        if (isMountedRefreshRef.current) setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: latest }));
        
        if (latest && latest.high !== null) {
          if (isMountedRefreshRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'loading' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'loading' }));
          }
          try {
            const oneHourHistoricalData = await fetchHistoricalData(currentItem.id, '5m');
            const nowForFavMs = Date.now(); 

            const oneHourAgoMsThresholdSpark = nowForFavMs - (60 * 60 * 1000);
            const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowForFavMs);
            if (isMountedRefreshRef.current) {
                setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: sparklinePoints.length > 1 ? sparklinePoints : 'no_data' }));
            }
            
            let priceThen: number | null = null;
            const sortedHistoricalFav = [...oneHourHistoricalData].sort((a, b) => a.timestamp - b.timestamp);
            const oneHourAgoMsThresholdCalc = nowForFavMs - (60 * 60 * 1000);
            for (let i = sortedHistoricalFav.length - 1; i >= 0; i--) {
                if (sortedHistoricalFav[i].timestamp <= oneHourAgoMsThresholdCalc) {
                    priceThen = sortedHistoricalFav[i].price;
                    break;
                }
            }
            if (priceThen === null && sortedHistoricalFav.length > 0) {
                let bestFallbackCandidate: ChartDataPoint | null = null;
                for (let i = sortedHistoricalFav.length - 1; i >= 0; i--) {
                    if (sortedHistoricalFav[i].timestamp < oneHourAgoMsThresholdCalc) {
                        bestFallbackCandidate = sortedHistoricalFav[i];
                        break;
                    }
                }
                 if (!bestFallbackCandidate && sortedHistoricalFav.length > 0) {
                    priceThen = sortedHistoricalFav[0].price;
                } else if (bestFallbackCandidate) {
                    priceThen = bestFallbackCandidate.price;
                }
            }

            if (priceThen !== null && latest.high !== null) {
                const changeAbsolute = latest.high - priceThen;
                const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (latest.high > 0 ? Infinity : 0);
                if (isMountedRefreshRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: { changeAbsolute, changePercent } }));
            } else {
                if (isMountedRefreshRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'no_data' }));
            }
          } catch (histErr) {
             console.error(`Error refreshing 5m data for favorite ${currentItem.id} during main item refresh`, histErr);
             if (isMountedRefreshRef.current) {
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'error' }));
                setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'error' }));
             }
          }
        } else { 
          const currentLatestInElse = latest; 
          if (isMountedRefreshRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: currentLatestInElse === null ? 'no_data' : 'error' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: currentLatestInElse === null ? 'no_data' : 'error' }));
          }
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
  }, [selectedItem, selectedTimespan, addNotification, alerts, checkAlerts, favoriteItemIds, isConsentGranted, allItems]);


  const handleSelectItem = useCallback(async (item: ItemMapInfo, originTimespan?: Timespan, originSnapshotTimestampMs?: number) => {
    setSelectedItem(item);
    setSearchTerm('');
    setActiveSuggestionIndex(-1); 
    if (originTimespan) {
        setSelectedTimespan(originTimespan); 
        await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: false, timespanToUse: originTimespan, snapshotTimestampMs: originSnapshotTimestampMs });
    } else {
        await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: false, snapshotTimestampMs: originSnapshotTimestampMs }); 
    }
  }, [refreshCurrentItemData]); 

  const handleSelectItemById = useCallback((itemId: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number) => {
    const itemToSelect = allItems.find(item => item.id === itemId);
    if (itemToSelect) {
      handleSelectItem(itemToSelect, originTimespan, originSnapshotTimestampMs);
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
          handleSelectItemById(numericItemId);
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
    setSelectedTimespan(timespan); 
  }, []); 

  useEffect(() => {
    if (selectedItem) {
      refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false, timespanToUse: selectedTimespan });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedItem, selectedTimespan]); 


  useEffect(() => {
    if (prevIsAutoRefreshEnabled !== undefined && prevIsAutoRefreshEnabled !== isAutoRefreshEnabled) {
      addNotification(`Auto-refresh ${isAutoRefreshEnabled ? 'enabled' : 'disabled'}.`, 'info');
    }
  }, [isAutoRefreshEnabled, prevIsAutoRefreshEnabled, addNotification]);

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

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    const results = allItems
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 20);
    return results;
  }, [allItems, searchTerm]); 

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
          handleSelectItem(filteredItems[activeSuggestionIndex]);
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

  const toggleSettingsModal = () => setIsSettingsOpen(prev => !prev);
  const toggleChangelogModal = () => setIsChangelogModalOpen(prev => !prev); 
  const togglePrivacyPolicyModal = () => setIsPrivacyPolicyModalOpen(prev => !prev); // Privacy Policy toggle

  const favTerm = wordingPreference === 'uk' ? 'favourite' : 'favorite';

  const handleResetView = useCallback(() => {
    if (selectedItem) {
      setSelectedItem(null);
      setLatestPrice(null);
      setHistoricalData([]);
      setError(null);
      addNotification('Item view has been reset.', 'info');
    }
  }, [selectedItem, addNotification]);

  const openSetAlertModalForItem = useCallback((item: ItemMapInfo) => {
    setItemForSetAlertModal(item);
    setIsSetAlertModalOpen(true);
    if (isSettingsOpen) setIsSettingsOpen(false); 
  }, [isSettingsOpen]);

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
  }, [isConsentGranted, addNotification]);

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
    addNotification(`Alert set for ${item.name}!`, 'success');
    closeSetAlertModal();
  }, [addAlert, addNotification, closeSetAlertModal]);

  const handleToggleFavoriteQuickAction = useCallback((itemId: FavoriteItemId) => {
    if (favoriteItemIds.includes(itemId)) {
      removeFavoriteItem(itemId);
    } else {
      addFavoriteItem(itemId);
    }
  }, [favoriteItemIds, addFavoriteItem, removeFavoriteItem]);

  const handleQuickSetAlertFromFavorites = useCallback((item: ItemMapInfo) => {
    openSetAlertModalForItem(item);
  }, [openSetAlertModalForItem]);

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
    } else {
       addNotification("Item data still loading, please wait before refreshing Top Movers.", "info");
    }
  },[refreshMovers, allItems, addNotification]);

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
      return newOrder;
    });
    
    setDraggedItem(null);
    setDragOverItem(null);
  }, [isDragAndDropEnabled, draggedItem]); 

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
      handleSelectItemById(itemId); 
    }, 50); 
  }, [isPortfolioModalOpen, handleSelectItemById, togglePortfolioModal]);


  const getSectionProps = useCallback((sectionId: string, dndProps: SectionRenderProps): SpecificAppSectionProps => {
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
        };
      case SECTION_KEYS.FAVORITES:
        return {
          ...dndProps,
          favoriteItemIds,
          allItems,
          onSelectItemById: handleSelectItemById,
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
            handleSelectItemById(itemId, originTimespan, originSnapshotTimestampMs),
          getItemIconUrl,
          lastFetchedTimestamp: topMoversLastFetched,
          topMoversCalculationMode,
          onSetTopMoversCalculationMode: setTopMoversCalculationMode,
          topMoversMetricType,
          onSetTopMoversMetricType: setTopMoversMetricType,
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
          onSelectAlertItemById: handleSelectItemById,
          isConsentGranted,
          isCollapsed: isAlertsSectionCollapsed,
          onToggleCollapse: toggleAlertsSection,
        };
      default:
        throw new Error(`[App.tsx] getSectionProps: Unhandled sectionId "${sectionId}". This should have been caught earlier.`);
    }
  }, [
    isSearchSectionCollapsed, toggleSearchSection, searchTerm, handleSearchKeyDown, activeDescendantId, filteredItems, handleSelectItem, getItemIconUrl, activeSuggestionIndex, favoriteItemIds, handleToggleFavoriteQuickAction, wordingPreference, isConsentGranted, isLoadingItems, searchBarWrapperRef, itemListWrapperRef, setSearchTerm,
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
          onSetThemeName={setActiveThemeName}
          themes={APP_THEMES}
          enableDesktopNotifications={enableDesktopNotifications}
          onToggleDesktopNotifications={handleToggleDesktopNotifications}
          desktopNotificationPermission={desktopNotificationPermission}
          wordingPreference={wordingPreference}
          onSetWordingPreference={setWordingPreference}
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
        />
      )}

      {isPortfolioModalOpen && isConsentGranted && (
        <PortfolioModal
          isOpen={isPortfolioModalOpen}
          onClose={togglePortfolioModal}
          portfolioEntries={portfolioEntries}
          addPortfolioEntry={addPortfolioEntry}
          recordSaleAndUpdatePortfolio={recordSaleAndUpdatePortfolio}
          deletePortfolioEntry={deletePortfolioEntry} 
          clearAllPortfolioData={clearAllPortfolioData} 
          updatePortfolioEntryDetails={updatePortfolioEntryDetails}
          replacePortfolio={replacePortfolio} 
          allItems={allItems}
          getItemIconUrl={getItemIconUrl}
          getItemName={getItemName}
          fetchLatestPrice={fetchLatestPrice}
          addNotification={addNotification}
          isConsentGranted={isConsentGranted}
          onSelectItemAndClose={handleSelectPortfolioItemAndCloseModal}
          // Google Drive Props
          isGoogleApiReady={isGoogleApiReady}
          isGoogleUserSignedIn={isGoogleUserSignedIn}
          googleUser={googleUser}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onSaveToDrive={handleSaveToDrive}
          onLoadFromDrive={handleLoadFromDrive}
          isDriveActionLoading={isDriveActionLoading}
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
          addPortfolioEntryCallback={addPortfolioEntry}
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
            {sidebarSectionOrder.map(sectionId => {
              const config = sectionsConfig[sectionId as keyof typeof sectionsConfig];
              if (!config) return null;
              const ComponentToRender = config.Component;
              const dndRenderProps: SectionRenderProps = { sectionId, isDragAndDropEnabled, handleDragStart, draggedItem };
              const componentProps = getSectionProps(sectionId, dndRenderProps);

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
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-xl">Select an item to view its details.</p>
                <p className="mt-1">Use the search bar on the left to find items, or select a {favTerm}.</p>
              </div>
            )}
          </main>
        </div>
      )}
       <footer className="w-full max-w-6xl mt-12 pt-6 border-t border-[var(--border-primary)] text-center text-[var(--text-muted)] text-sm">
        <p>Data sourced from <a href="https://prices.runescape.wiki/api/v1/osrs/mapping" target="_blank" rel="noopener noreferrer" className="text-[var(--link-text)] hover:text-[var(--link-text-hover)]">prices.runescape.wiki API</a>.</p>
        <p>This is a fan-made project and is not affiliated with Jagex Ltd.</p>
        <p className="mt-2">
          <button onClick={toggleChangelogModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline">
            View Changelog
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
