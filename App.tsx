
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, PriceAlert, Timespan, NotificationMessage, AppTheme, TimespanAPI, FavoriteItemId, FavoriteItemHourlyChangeData, FavoriteItemHourlyChangeState, WordingPreference, FavoriteItemSparklineState, ChartDataPoint as SparklineDataPoint } from './types'; // Assuming main types are in root types.ts
import { fetchItemMapping, fetchLatestPrice, fetchHistoricalData } from './services/runescapeService';
import { SearchBar } from './components/SearchBar';
import { ItemList } from './components/ItemList';
import { ItemDisplay } from './components/ItemDisplay';
import { AlertsManager } from './components/AlertsManager';
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationBar } from './components/NotificationBar';
import { RefreshControls } from './components/RefreshControls';
import { SettingsModal } from './src/components/SettingsModal'; // Updated path
import { FavoritesList } from './components/FavoritesList';
import { ConsentBanner } from './components/ConsentBanner';
import { ChangelogModal } from './src/components/ChangelogModal';
import { SetAlertModal } from './components/SetAlertModal'; 
import { changelogEntries } from './src/changelogData'; 
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { ChevronDownIcon } from './components/Icons';
import { 
  API_BASE_URL, ITEM_IMAGE_BASE_URL, AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_SECONDS, APP_THEMES, 
  FAVORITES_STORAGE_KEY, WORDING_PREFERENCE_STORAGE_KEY, DEFAULT_WORDING_PREFERENCE, CONSENT_STORAGE_KEY,
  ALL_USER_PREFERENCE_KEYS, DEFAULT_THEME_ID, CHART_GRID_STORAGE_KEY, CHART_LINE_GLOW_STORAGE_KEY,
  VOLUME_CHART_STORAGE_KEY, ACTIVE_THEME_STORAGE_KEY, DESKTOP_NOTIFICATIONS_ENABLED_KEY,
  FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY
} from './constants'; 

// Helper to get initial consent status
const getInitialConsentStatus = (): 'pending' | 'granted' | 'denied' => {
  const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (storedConsent === 'granted' || storedConsent === 'denied') {
    return storedConsent;
  }
  return 'pending';
};

const APP_VERSION = "Beta v0.06";

const App: React.FC = () => {
  const initialConsent = getInitialConsentStatus();
  const [consentStatus, setConsentStatus] = useState<'pending' | 'granted' | 'denied'>(initialConsent);

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

  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(true);
  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number>(AUTO_REFRESH_INTERVAL_SECONDS);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState<boolean>(false);
  
  const [isSetAlertModalOpen, setIsSetAlertModalOpen] = useState<boolean>(false);
  const [itemForSetAlertModal, setItemForSetAlertModal] = useState<ItemMapInfo | null>(null);

  // Collapsible section states
  const [isSearchSectionCollapsed, setIsSearchSectionCollapsed] = useState<boolean>(false);
  const [isFavoritesSectionCollapsed, setIsFavoritesSectionCollapsed] = useState<boolean>(false);
  const [isAlertsSectionCollapsed, setIsAlertsSectionCollapsed] = useState<boolean>(false);

  const toggleSearchSection = () => setIsSearchSectionCollapsed(prev => !prev);
  const toggleFavoritesSection = () => setIsFavoritesSectionCollapsed(prev => !prev);
  const toggleAlertsSection = () => setIsAlertsSectionCollapsed(prev => !prev);


  // Preferences states with consent-aware initialization
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
      return saved !== null ? JSON.parse(saved) : true; // Default to true
    }
    return true; // Default to true if no consent
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
      return saved !== null ? JSON.parse(saved) : false;
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

  const [favoriteItemPrices, setFavoriteItemPrices] = useState<Record<FavoriteItemId, LatestPriceData | null | 'loading' | 'error'>>({});
  const [favoriteItemHourlyChanges, setFavoriteItemHourlyChanges] = useState<Record<FavoriteItemId, FavoriteItemHourlyChangeState>>({});
  const [favoriteItemSparklineData, setFavoriteItemSparklineData] = useState<Record<FavoriteItemId, FavoriteItemSparklineState>>({});
  const [isRefreshingFavorites, setIsRefreshingFavorites] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const autoRefreshIntervalIdRef = useRef<number | null>(null);
  const countdownIntervalIdRef = useRef<number | null>(null);
  const searchBarWrapperRef = useRef<HTMLDivElement>(null);
  const itemListWrapperRef = useRef<HTMLDivElement>(null);

  const isConsentGranted = useMemo(() => consentStatus === 'granted', [consentStatus]);

  // Persist consent status
  useEffect(() => {
    if (consentStatus !== 'pending') {
      localStorage.setItem(CONSENT_STORAGE_KEY, consentStatus);
    }
  }, [consentStatus]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage } = usePriceAlerts(
    (triggeredAlert) => {
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
    },
    fetchLatestPrice,
    isConsentGranted 
  );

  const resetPreferencesToDefault = useCallback(() => {
    setShowChartGrid(true);
    setShowChartLineGlow(true);
    setShowVolumeChart(false);
    setShowFavoriteSparklines(true); // Reset new preference
    setActiveThemeName(DEFAULT_THEME_ID);
    setEnableDesktopNotifications(false);
    setWordingPreference(DEFAULT_WORDING_PREFERENCE);
    setFavoriteItemIds([]);
    setFavoriteItemPrices({});
    setFavoriteItemHourlyChanges({});
    setFavoriteItemSparklineData({});
    if(clearAllAlertsAndStorage) clearAllAlertsAndStorage(); 
    addNotification('Preferences have been reset and will no longer be saved.', 'info');
  }, [clearAllAlertsAndStorage, addNotification]);

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

  const getItemIconUrl = useCallback((iconName: string): string => {
    return `${ITEM_IMAGE_BASE_URL}${iconName.replace(/ /g, '_')}`;
  }, []);

  
  useEffect(() => {
    if (isConsentGranted) {
      localStorage.setItem(WORDING_PREFERENCE_STORAGE_KEY, wordingPreference);
    }
  }, [wordingPreference, isConsentGranted]);

  const addFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (!prevIds.includes(itemId)) {
        const newIds = [...prevIds, itemId];
        const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';
        addNotification(`${getItemName(itemId)} added to ${favTerm}.`, 'success');
        return newIds;
      }
      return prevIds;
    });
  }, [addNotification, getItemName, wordingPreference]);

  const removeFavoriteItem = useCallback((itemId: FavoriteItemId) => {
    setFavoriteItemIds(prevIds => {
      if (prevIds.includes(itemId)) {
        const favTerm = wordingPreference === 'uk' ? 'favourites' : 'favorites';
        addNotification(`${getItemName(itemId)} removed from ${favTerm}.`, 'info');
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
  }, [addNotification, getItemName, wordingPreference]);

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
    const isMountedRef = { current: true };

    const fetchAllFavoriteDataSequentially = async () => {
      for (const itemId of favoriteItemIds) {
        if (!isMountedRef.current) break;

        const itemDetail = allItems.find(it => it.id === itemId);
        if (itemDetail) {
          let currentPriceData = favoriteItemPrices[itemId];
          
          // Fetch price data if not available or errored
          if (currentPriceData === undefined || currentPriceData === 'loading' || currentPriceData === 'error' || currentPriceData === null) {
            if (isMountedRef.current) setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'loading' }));
            try {
              const priceData = await fetchLatestPrice(itemId);
              if (isMountedRef.current) {
                setFavoriteItemPrices(prev => ({ ...prev, [itemId]: priceData }));
                currentPriceData = priceData; 
              }
            } catch (err) {
              console.error(`Failed to fetch price for favourite item ${itemId}`, err);
              if (isMountedRef.current) {
                setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'error' }));
              }
              currentPriceData = 'error';
            }
          }
          
          // If price data successfully fetched (or already existed and was valid)
          if (typeof currentPriceData === 'object' && currentPriceData !== null && currentPriceData.high !== null) {
            if (isMountedRef.current) {
              setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'loading' }));
              setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'loading' }));
            }
            try {
              const oneHourHistoricalData = await fetchHistoricalData(itemId, '5m');
              
              // Process for Sparkline
              const nowMsSpark = Date.now();
              const oneHourAgoMsThresholdSpark = nowMsSpark - (60 * 60 * 1000);
              const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowMsSpark);
              if (isMountedRef.current) {
                setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: sparklinePoints.length > 1 ? sparklinePoints : 'no_data' }));
              }

              // Process for Hourly Change (using the same fetched historical data)
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
                // Fallback: find the latest point older than one hour ago or the oldest if all are within an hour.
                let bestFallbackCandidate: ChartDataPoint | null = null;
                for (let i = sortedHistorical.length - 1; i >= 0; i--) {
                    if (sortedHistorical[i].timestamp < oneHourAgoMsThresholdCalc) {
                        bestFallbackCandidate = sortedHistorical[i];
                        break;
                    }
                }
                 if (!bestFallbackCandidate && sortedHistorical.length > 0) { // All data is within the last hour
                    priceThen = sortedHistorical[0].price; // Use oldest point as base for change
                } else if (bestFallbackCandidate) {
                    priceThen = bestFallbackCandidate.price;
                }
              }


              if (priceThen !== null && currentPriceData.high !== null) { // currentPriceData.high check is redundant here but good practice
                const changeAbsolute = currentPriceData.high - priceThen;
                const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (currentPriceData.high > 0 ? Infinity : 0);
                if (isMountedRef.current) {
                  setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: { changeAbsolute, changePercent } }));
                }
              } else {
                if (isMountedRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'no_data' }));
              }

            } catch (histErr) {
              console.error(`Failed to fetch 5m historical for sparkline/hourly change (item ${itemId})`, histErr);
              if (isMountedRef.current) {
                setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' }));
              }
            }
          } else if (currentPriceData !== 'loading' && currentPriceData !== 'error') { 
             if (isMountedRef.current ) {
               setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: (currentPriceData === null ? 'no_data' : 'error') }));
               setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: (currentPriceData === null ? 'no_data' : 'error') }));
             }
          }
        }
      }
    };

    fetchAllFavoriteDataSequentially();
    return () => { isMountedRef.current = false; };
  }, [favoriteItemIds, allItems, isConsentGranted, favoriteItemPrices]); // favoriteItemPrices added to re-trigger if a specific item's price was fetched by other means


  useEffect(() => {
    const activeTheme = APP_THEMES.find(theme => theme.id === activeThemeName) || APP_THEMES.find(theme => theme.id === DEFAULT_THEME_ID) || APP_THEMES[0];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(activeTheme.colors)) {
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


  const handleRefreshAllFavorites = useCallback(async () => {
    if (isRefreshingFavorites || favoriteItemIds.length === 0 || !allItems.length || !isConsentGranted) return;

    setIsRefreshingFavorites(true);
    const isMountedRef = { current: true };
    let allSucceeded = true;

    for (const itemId of favoriteItemIds) {
      if (!isMountedRef.current) break;
      const itemDetail = allItems.find(it => it.id === itemId);
      if (!itemDetail) continue;

      if (isMountedRef.current) {
        setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'loading' }));
        setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'loading' }));
        setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: 'loading' }));
      }

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
        } else { // priceData is null or priceData.high is null
          if (isMountedRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: priceData === null ? 'no_data' : 'error' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [itemId]: priceData === null ? 'no_data' : 'error' }));
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
      if (allSucceeded && favoriteItemIds.length > 0) {
        addNotification('Favorite items data refreshed!', 'success');
      } else if (!allSucceeded && favoriteItemIds.length > 0) {
        addNotification('Some favorite items could not be refreshed.', 'error');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshingFavorites, favoriteItemIds, allItems, addNotification, isConsentGranted]);


  const refreshCurrentItemData = useCallback(async (options: { itemToRefresh?: ItemMapInfo, isUserInitiated?: boolean } = {}) => {
    const currentItem = options.itemToRefresh || selectedItem;
    const isUserInitiated = options.isUserInitiated !== undefined ? options.isUserInitiated : true;
    if (!currentItem) return;
    setIsLoadingPrice(true); 
    setError(null);
    const isMountedRefreshRef = { current: true }; 

    try {
      let apiTimestepToFetch: TimespanAPI;
      switch (selectedTimespan) {
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
      const nowMs = Date.now();
      let startTimeMs: number;
      switch (selectedTimespan) {
        case '1h': startTimeMs = nowMs - (1 * 60 * 60 * 1000); break;
        case '6h': startTimeMs = nowMs - (6 * 60 * 60 * 1000); break;
        case '1d': startTimeMs = nowMs - (1 * 24 * 60 * 60 * 1000); break;
        case '7d': startTimeMs = nowMs - (7 * 24 * 60 * 60 * 1000); break;
        case '1mo': startTimeMs = nowMs - (30 * 24 * 60 * 60 * 1000); break;
        case '3mo': startTimeMs = nowMs - (90 * 24 * 60 * 60 * 1000); break;
        case '6mo': startTimeMs = nowMs - (180 * 24 * 60 * 60 * 1000); break;
        case '1y': startTimeMs = nowMs - (365 * 24 * 60 * 60 * 1000); break;
        default: startTimeMs = nowMs - (1 * 24 * 60 * 60 * 1000);
      }
      const filteredHistorical = rawHistorical.filter(dp => dp.timestamp >= startTimeMs && dp.timestamp <= nowMs);
      setHistoricalData(filteredHistorical);
      
      if (isUserInitiated && options.isUserInitiated !== false) { 
        addNotification(`${currentItem.name} data refreshed!`, 'success');
      }
      
      // If the refreshed item is a favorite, update its price, hourly change, and sparkline
      if (favoriteItemIds.includes(currentItem.id) && isConsentGranted) {
        if (isMountedRefreshRef.current) setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: latest }));
        
        if (latest && latest.high !== null) {
          if (isMountedRefreshRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'loading' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'loading' }));
          }
          try {
            const oneHourHistoricalData = await fetchHistoricalData(currentItem.id, '5m');

            // Sparkline
            const nowMsSpark = Date.now();
            const oneHourAgoMsThresholdSpark = nowMsSpark - (60 * 60 * 1000);
            const sparklinePoints = oneHourHistoricalData.filter(dp => dp.timestamp >= oneHourAgoMsThresholdSpark && dp.timestamp <= nowMsSpark);
            if (isMountedRefreshRef.current) {
                setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: sparklinePoints.length > 1 ? sparklinePoints : 'no_data' }));
            }
            
            // Hourly Change
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
        } else { // latest price is null or latest.high is null
          if (isMountedRefreshRef.current) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'no_data' }));
            setFavoriteItemSparklineData(prev => ({ ...prev, [currentItem.id]: 'no_data' }));
          }
        }
      }

      // After main item data is processed, trigger refresh for all favorites
      if (favoriteItemIds.length > 0 && isConsentGranted) {
        // No need to await, let it run in background. 
        // handleRefreshAllFavorites has its own loading state (isRefreshingFavorites) and notification.
        handleRefreshAllFavorites();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, selectedTimespan, addNotification, alerts, checkAlerts, favoriteItemIds, isConsentGranted, handleRefreshAllFavorites]);

  const handleSelectItem = useCallback(async (item: ItemMapInfo) => {
    setSelectedItem(item);
    setSearchTerm('');
    setActiveSuggestionIndex(-1); 
    await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: false }); 
  }, [refreshCurrentItemData]);

  const handleSelectItemById = useCallback((itemId: number) => {
    const itemToSelect = allItems.find(item => item.id === itemId);
    if (itemToSelect) {
      handleSelectItem(itemToSelect);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      addNotification(`Could not find item with ID ${itemId}. It might have been removed or changed.`, 'error');
    }
  }, [allItems, handleSelectItem, addNotification]);

  const handleTimespanChange = useCallback(async (timespan: Timespan) => {
    setSelectedTimespan(timespan); 
  }, []); 

  useEffect(() => {
    if (selectedItem) {
      refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimespan]); 

  const handleToggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => {
      const newState = !prev;
      addNotification(`Auto-refresh ${newState ? 'enabled' : 'disabled'}.`, 'info');
      return newState;
    });
  }, [addNotification]);

  const handleManualRefresh = useCallback(async () => {
    if (!selectedItem || isLoadingPrice) return;
    await refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: true }); 
    setManualRefreshTrigger(c => c + 1); 
  }, [selectedItem, isLoadingPrice, refreshCurrentItemData]);

 useEffect(() => {
    if (autoRefreshIntervalIdRef.current) clearInterval(autoRefreshIntervalIdRef.current);
    if (countdownIntervalIdRef.current) clearInterval(countdownIntervalIdRef.current);
    autoRefreshIntervalIdRef.current = null;
    countdownIntervalIdRef.current = null;
    if (isAutoRefreshEnabled && selectedItem) {
      setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS); 
      autoRefreshIntervalIdRef.current = setInterval(() => {
        if (selectedItem) { 
            refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false }); 
        }
      }, AUTO_REFRESH_INTERVAL_MS);
      countdownIntervalIdRef.current = setInterval(() => {
        setTimeToNextRefresh(prev => (prev <= 1 ? AUTO_REFRESH_INTERVAL_SECONDS : prev - 1));
      }, 1000);
    } else {
      setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS); 
    }
    return () => {
      if (autoRefreshIntervalIdRef.current) clearInterval(autoRefreshIntervalIdRef.current);
      if (countdownIntervalIdRef.current) clearInterval(countdownIntervalIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoRefreshEnabled, selectedItem, manualRefreshTrigger]);

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
    if (isSettingsOpen) setIsSettingsOpen(false); // Close settings if open
  }, [isSettingsOpen]);

  const closeSetAlertModal = useCallback(() => {
    setItemForSetAlertModal(null);
    setIsSetAlertModalOpen(false);
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


  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-8 flex flex-col items-center">
      <NotificationBar notifications={notifications} />
      <header className="w-full max-w-6xl mb-8 text-center flex flex-col items-center">
         <div className="flex items-center justify-between w-full">
            <button 
                onClick={toggleSettingsModal} 
                className="p-2 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
                aria-label="Open settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <button 
              onClick={handleResetView}
              className="flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] rounded-md p-1"
              aria-label="GE Pulse - Click to reset item view"
              disabled={!selectedItem} 
            >
                <svg width="80" height="50" viewBox="0 0 135 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`mr-3 transition-opacity ${selectedItem ? 'group-hover:opacity-80' : 'opacity-100'}`}>
                    <path d="M10 30 Q25 5 40 30 T70 30 Q85 55 90 30" stroke="var(--logo-pulse-color)" strokeWidth="5" fill="transparent"/>
                    <circle cx="90" cy="30" r="8" fill="var(--logo-coin-fill)" stroke="var(--logo-coin-stroke)" strokeWidth="2"/>
                </svg>
                <h1 className={`text-4xl md:text-5xl font-bold text-[var(--text-accent)] transition-opacity ${selectedItem ? 'group-hover:opacity-80' : 'opacity-100'}`}>GE Pulse</h1>
            </button>
            <div className="w-7 h-7"></div> 
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
        />
      )}

      {isChangelogModalOpen && (
        <ChangelogModal 
          isOpen={isChangelogModalOpen} 
          onClose={toggleChangelogModal} 
          entries={changelogEntries}
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
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl">
              <button
                onClick={toggleSearchSection}
                className={`w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] transition-colors
                  ${!isSearchSectionCollapsed ? 'rounded-t-lg hover:bg-[var(--bg-tertiary)]/70' : 'rounded-lg hover:bg-[var(--bg-tertiary)]/50'}`}
                aria-expanded={!isSearchSectionCollapsed}
                aria-controls="search-section-content"
              >
                <h2 className="text-2xl font-semibold text-[var(--text-accent)]">Search Item</h2>
                <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 ${isSearchSectionCollapsed ? '-rotate-90' : ''}`} />
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
            
            <FavoritesList
              favoriteItemIds={favoriteItemIds}
              allItems={allItems}
              onSelectItemById={handleSelectItemById}
              onRemoveFavorite={removeFavoriteItem}
              getItemIconUrl={getItemIconUrl}
              favoriteItemPrices={favoriteItemPrices}
              favoriteItemHourlyChanges={favoriteItemHourlyChanges}
              favoriteItemSparklineData={favoriteItemSparklineData}
              showFavoriteSparklines={showFavoriteSparklines}
              wordingPreference={wordingPreference}
              isRefreshingFavorites={isRefreshingFavorites}
              onRefreshAllFavorites={handleRefreshAllFavorites}
              isConsentGranted={isConsentGranted}
              onQuickSetAlert={handleQuickSetAlertFromFavorites}
              isCollapsed={isFavoritesSectionCollapsed}
              onToggleCollapse={toggleFavoritesSection}
            />

            <AlertsManager
              alerts={alerts}
              addAlert={addAlert} 
              removeAlert={removeAlert}
              updateAlert={updateAlert}
              allItems={allItems}
              getItemName={getItemName}
              getItemIconUrl={getItemIconUrl}
              addNotification={addNotification}
              onSelectAlertItemById={handleSelectItemById}
              isConsentGranted={isConsentGranted}
              isCollapsed={isAlertsSectionCollapsed}
              onToggleCollapse={toggleAlertsSection}
            />
          </aside>

          <main className="md:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl min-h-[400px] space-y-4">
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
                isConsentGranted={isConsentGranted}
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
           {APP_VERSION}
        </p>
        {consentStatus !== 'pending' && (
            <p className="mt-2">
                <button onClick={toggleSettingsModal} className="text-[var(--link-text)] hover:text-[var(--link-text-hover)] underline">
                    Manage Cookie Preferences
                </button>
            </p>
        )}
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