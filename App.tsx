
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, PriceAlert, Timespan, NotificationMessage, AppTheme, TimespanAPI, FavoriteItemId, FavoriteItemHourlyChangeData, FavoriteItemHourlyChangeState, WordingPreference } from './types';
import { fetchItemMapping, fetchLatestPrice, fetchHistoricalData } from './services/runescapeService';
import { SearchBar } from './components/SearchBar';
import { ItemList } from './components/ItemList';
import { ItemDisplay } from './components/ItemDisplay';
import { AlertsManager } from './components/AlertsManager';
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationBar } from './components/NotificationBar';
import { RefreshControls } from './components/RefreshControls';
import { SettingsModal } from './components/SettingsModal';
import { FavoritesList } from './components/FavoritesList';
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { API_BASE_URL, ITEM_IMAGE_BASE_URL, AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_SECONDS, APP_THEMES, FAVORITES_STORAGE_KEY, WORDING_PREFERENCE_STORAGE_KEY, DEFAULT_WORDING_PREFERENCE } from './constants';

const App: React.FC = () => {
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
  const [showChartGrid, setShowChartGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem('gePulseShowChartGrid');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showChartLineGlow, setShowChartLineGlow] = useState<boolean>(() => {
    const saved = localStorage.getItem('gePulseShowChartLineGlow');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showVolumeChart, setShowVolumeChart] = useState<boolean>(() => {
    const saved = localStorage.getItem('gePulseShowVolumeChart');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [activeThemeName, setActiveThemeName] = useState<string>(() => {
    return localStorage.getItem('gePulseActiveTheme') || 'ge-pulse-dark';
  });

  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState<boolean>(() => {
    const saved = localStorage.getItem('gePulseEnableDesktopNotifications');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission>(Notification.permission);

  const [wordingPreference, setWordingPreference] = useState<WordingPreference>(() => {
    const saved = localStorage.getItem(WORDING_PREFERENCE_STORAGE_KEY) as WordingPreference | null;
    return saved || DEFAULT_WORDING_PREFERENCE;
  });

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const [favoriteItemIds, setFavoriteItemIds] = useState<FavoriteItemId[]>(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (e) {
      console.error("Failed to load favourites from localStorage", e);
      return [];
    }
  });
  const [favoriteItemPrices, setFavoriteItemPrices] = useState<Record<FavoriteItemId, LatestPriceData | null | 'loading' | 'error'>>({});
  const [favoriteItemHourlyChanges, setFavoriteItemHourlyChanges] = useState<Record<FavoriteItemId, FavoriteItemHourlyChangeState>>({});


  const autoRefreshIntervalIdRef = useRef<number | null>(null);
  const countdownIntervalIdRef = useRef<number | null>(null);

  const searchBarWrapperRef = useRef<HTMLDivElement>(null);
  const itemListWrapperRef = useRef<HTMLDivElement>(null);

  const getItemName = useCallback((itemId: number): string => {
    return allItems.find(item => item.id === itemId)?.name || 'Unknown Item';
  }, [allItems]);

  const getItemIconUrl = useCallback((iconName: string): string => {
    return `${ITEM_IMAGE_BASE_URL}${iconName.replace(/ /g, '_')}`;
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);
  
  useEffect(() => {
    localStorage.setItem(WORDING_PREFERENCE_STORAGE_KEY, wordingPreference);
  }, [wordingPreference]);

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
        return prevIds.filter(id => id !== itemId);
      }
      return prevIds;
    });
  }, [addNotification, getItemName, wordingPreference]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteItemIds));
    } catch (e) {
      console.error("Failed to save favourites to localStorage", e);
    }
  }, [favoriteItemIds]);

  const calculateHourlyChange = async (
    itemId: FavoriteItemId,
    currentHighPrice: number | null,
    isMountedRef: React.MutableRefObject<boolean>
  ): Promise<FavoriteItemHourlyChangeState> => {
    if (currentHighPrice === null) {
      return 'no_data'; // Cannot calculate change if current price is unknown
    }
    try {
      const rawHistorical = await fetchHistoricalData(itemId, '5m');
      const nowMs = Date.now();
      const oneHourAgoMsThreshold = nowMs - (60 * 60 * 1000);

      // fetchHistoricalData returns ChartDataPoint[] which has timestamp in ms and is sorted.
      // Find the most recent data point that is at least 1 hour old.
      let priceThen: number | null = null;
      // Iterate backwards to find the first point at or before 1 hour ago
      for (let i = rawHistorical.length - 1; i >= 0; i--) {
        if (rawHistorical[i].timestamp <= oneHourAgoMsThreshold) {
          priceThen = rawHistorical[i].price;
          break;
        }
      }

      if (priceThen !== null) {
        const changeAbsolute = currentHighPrice - priceThen;
        const changePercent = priceThen !== 0 ? (changeAbsolute / priceThen) * 100 : (currentHighPrice > 0 ? Infinity : 0);
        if (isMountedRef.current) {
          return { changeAbsolute, changePercent } as FavoriteItemHourlyChangeData;
        }
      } else {
        if (isMountedRef.current) return 'no_data';
      }
    } catch (histErr) {
      console.error(`Failed to fetch historical for hourly change (item ${itemId})`, histErr);
      if (isMountedRef.current) return 'error';
    }
    return 'error'; // Default to error if something went wrong and not caught
  };


  useEffect(() => {
    if (!allItems.length) return;
    const isMountedRef = { current: true };

    const fetchAllFavoriteDataSequentially = async () => {
      for (const itemId of favoriteItemIds) {
        if (!isMountedRef.current) break;

        const itemDetail = allItems.find(it => it.id === itemId);
        if (itemDetail) {
          let currentPriceData = favoriteItemPrices[itemId];
          let hourlyChangeData = favoriteItemHourlyChanges[itemId];

          // Fetch latest price if not available or was an error
          if (currentPriceData === undefined || currentPriceData === 'loading' || currentPriceData === 'error' || currentPriceData === null) {
            if (isMountedRef.current) setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'loading' }));
            try {
              const priceData = await fetchLatestPrice(itemId);
              if (isMountedRef.current) {
                setFavoriteItemPrices(prev => ({ ...prev, [itemId]: priceData }));
                currentPriceData = priceData; // Update for subsequent hourly change calculation
              }
            } catch (err) {
              console.error(`Failed to fetch price for favourite item ${itemId}`, err);
              if (isMountedRef.current) {
                setFavoriteItemPrices(prev => ({ ...prev, [itemId]: 'error' }));
                setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'error' })); // Cascade error
              }
              currentPriceData = 'error'; // Mark as error to skip hourly change
            }
          }
          
          // If latest price is successfully fetched (or already exists and is valid), calculate hourly change
          if (typeof currentPriceData === 'object' && currentPriceData !== null && currentPriceData.high !== null) {
            if (hourlyChangeData === undefined || hourlyChangeData === null || hourlyChangeData === 'error' || hourlyChangeData === 'loading') {
              if (isMountedRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'loading' }));
              const changeResult = await calculateHourlyChange(itemId, currentPriceData.high, isMountedRef);
              if (isMountedRef.current) {
                // If changeResult is an object, it implies FavoriteItemHourlyChangeData
                if (typeof changeResult === 'object' && changeResult !== null && 'changeAbsolute' in changeResult) {
                   setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: changeResult as FavoriteItemHourlyChangeData }));
                } else {
                   setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: changeResult as 'error' | 'no_data' }));
                }
              }
            }
          } else if (currentPriceData !== 'loading' && currentPriceData !== 'error') { 
            // Latest price is null or invalid, so hourly change is not possible or is an error
             if (isMountedRef.current && (hourlyChangeData === undefined || hourlyChangeData === null || hourlyChangeData === 'loading')) {
               setFavoriteItemHourlyChanges(prev => ({ ...prev, [itemId]: 'no_data' }));
             }
          }
        }
         // Optional small delay between fetches
         // if (isMountedRef.current) await new Promise(resolve => setTimeout(resolve, 150));
      }
    };

    fetchAllFavoriteDataSequentially();
    return () => { isMountedRef.current = false; };
  }, [favoriteItemIds, allItems]); // Only re-run when the list of favourites or all items mapping changes.


  const { alerts, addAlert, removeAlert, updateAlert, checkAlerts } = usePriceAlerts(
    (triggeredAlert) => {
      const message = `Alert: ${triggeredAlert.itemName} ${triggeredAlert.condition === 'above' ? '>' : '<'} ${triggeredAlert.targetPrice.toLocaleString()} GP! Current: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`;
      addNotification(message, 'success');

      if (enableDesktopNotifications && desktopNotificationPermission === 'granted') {
        if (Notification.permission === 'granted') {
          new Notification(`GE Pulse: ${triggeredAlert.itemName}`, {
            body: `${triggeredAlert.itemName} is now ${triggeredAlert.condition === 'above' ? 'above' : 'below'} ${triggeredAlert.targetPrice.toLocaleString()} GP.\nCurrent: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`,
            icon: getItemIconUrl(triggeredAlert.itemIcon),
            tag: triggeredAlert.id,
          });
        }
      }
    },
    fetchLatestPrice
  );

  useEffect(() => {
    const activeTheme = APP_THEMES.find(theme => theme.id === activeThemeName) || APP_THEMES[0];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(activeTheme.colors)) {
      root.style.setProperty(key, value);
    }
    localStorage.setItem('gePulseActiveTheme', activeThemeName);
  }, [activeThemeName]);
  
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
    localStorage.setItem('gePulseShowChartGrid', JSON.stringify(showChartGrid));
  }, [showChartGrid]);

  useEffect(() => {
    localStorage.setItem('gePulseShowChartLineGlow', JSON.stringify(showChartLineGlow));
  }, [showChartLineGlow]);

  useEffect(() => {
    localStorage.setItem('gePulseShowVolumeChart', JSON.stringify(showVolumeChart));
  }, [showVolumeChart]);

  useEffect(() => {
    localStorage.setItem('gePulseEnableDesktopNotifications', JSON.stringify(enableDesktopNotifications));
  }, [enableDesktopNotifications]);

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


  const refreshCurrentItemData = useCallback(async (options: { itemToRefresh?: ItemMapInfo, isUserInitiated?: boolean } = {}) => {
    const currentItem = options.itemToRefresh || selectedItem;
    const isUserInitiated = options.isUserInitiated !== undefined ? options.isUserInitiated : true;
    if (!currentItem) return;
    setIsLoadingPrice(true); 
    setError(null);
    const isMountedRefreshRef = { current: true }; // For async operations within this callback

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
      
      // Ensure rawHistorical is sorted if needed for filtering, fetchHistoricalData should return sorted
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
      } else if (options.isUserInitiated === false) {
        console.log(`Background/Timespan refreshed data for ${currentItem.name} at ${new Date().toLocaleTimeString()}`);
      }
      
      if (favoriteItemIds.includes(currentItem.id)) {
        if (latest) {
          setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: latest }));
          if (latest.high !== null) {
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'loading' }));
            // Use rawHistorical (which is all 5m data for the day) or filteredHistorical if timespan is 1h
            const hourlyChangeDataForRefresh = await calculateHourlyChange(currentItem.id, latest.high, isMountedRefreshRef);
            if (isMountedRefreshRef.current) {
               if (typeof hourlyChangeDataForRefresh === 'object' && hourlyChangeDataForRefresh !== null && 'changeAbsolute' in hourlyChangeDataForRefresh) {
                   setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: hourlyChangeDataForRefresh as FavoriteItemHourlyChangeData }));
                } else {
                   setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: hourlyChangeDataForRefresh as 'error' | 'no_data' }));
                }
            }
          } else {
            if (isMountedRefreshRef.current) setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'no_data' }));
          }
        } else { // Error fetching latest for a favourite during refresh
           if (isMountedRefreshRef.current) {
            setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: 'error' }));
            setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'error' }));
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
      if (favoriteItemIds.includes(currentItem.id)) {
        if (isMountedRefreshRef.current) {
          setFavoriteItemPrices(prevPrices => ({ ...prevPrices, [currentItem.id]: 'error' }));
          setFavoriteItemHourlyChanges(prev => ({ ...prev, [currentItem.id]: 'error' }));
        }
      }
    } finally {
      if (isMountedRefreshRef.current) setIsLoadingPrice(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, selectedTimespan, addNotification, alerts, checkAlerts, favoriteItemIds, historicalData]); // historicalData added for recalculating 1hr change if timespan is 1h

  const handleSelectItem = useCallback(async (item: ItemMapInfo) => {
    setSelectedItem(item);
    setSearchTerm('');
    setActiveSuggestionIndex(-1); 
    await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: true }); 
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
  const favTerm = wordingPreference === 'uk' ? 'favourite' : 'favorite';

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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <div className="flex items-center justify-center">
                <svg width="80" height="50" viewBox="0 0 135 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
                    <path d="M10 30 Q25 5 40 30 T70 30 Q85 55 90 30" stroke="var(--logo-pulse-color)" strokeWidth="5" fill="transparent"/>
                    <circle cx="90" cy="30" r="8" fill="var(--logo-coin-fill)" stroke="var(--logo-coin-stroke)" strokeWidth="2"/>
                </svg>
                <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-accent)]">GE Pulse</h1>
            </div>
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
          activeThemeName={activeThemeName}
          onSetThemeName={setActiveThemeName}
          themes={APP_THEMES}
          enableDesktopNotifications={enableDesktopNotifications}
          onToggleDesktopNotifications={handleToggleDesktopNotifications}
          desktopNotificationPermission={desktopNotificationPermission}
          wordingPreference={wordingPreference}
          onSetWordingPreference={setWordingPreference}
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
            <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold mb-4 text-[var(--text-accent)]">Search Item</h2>
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
                  />
                </div>
              )}
              {searchTerm && filteredItems.length === 0 && !isLoadingItems && (
                <p className="text-[var(--text-secondary)] mt-4">No items found matching "{searchTerm}".</p>
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
              wordingPreference={wordingPreference}
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
      </footer>
    </div>
  );
};

export default App;