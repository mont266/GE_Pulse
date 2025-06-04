
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ItemMapInfo, LatestPriceData, ChartDataPoint, PriceAlert, Timespan, NotificationMessage, AppTheme } from './types';
import { fetchItemMapping, fetchLatestPrice, fetchHistoricalData } from './services/runescapeService';
import { SearchBar } from './components/SearchBar';
import { ItemList } from './components/ItemList';
import { ItemDisplay } from './components/ItemDisplay';
import { AlertsManager } from './components/AlertsManager';
import { LoadingSpinner } from './components/LoadingSpinner';
import { NotificationBar } from './components/NotificationBar';
import { RefreshControls } from './components/RefreshControls';
import { SettingsModal } from './components/SettingsModal';
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { API_BASE_URL, ITEM_IMAGE_BASE_URL, AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_SECONDS, APP_THEMES } from './constants';

const App: React.FC = () => {
  const [allItems, setAllItems] = useState<ItemMapInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ItemMapInfo | null>(null);
  const [latestPrice, setLatestPrice] = useState<LatestPriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);
  const [selectedTimespan, setSelectedTimespan] = useState<Timespan>('6h');
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
  const [activeThemeName, setActiveThemeName] = useState<string>(() => {
    return localStorage.getItem('gePulseActiveTheme') || 'ge-pulse-dark';
  });

  const autoRefreshIntervalIdRef = useRef<number | null>(null);
  const countdownIntervalIdRef = useRef<number | null>(null);

  const { alerts, addAlert, removeAlert, checkAlerts } = usePriceAlerts(
    (triggeredAlert) => {
      addNotification(`Alert Triggered: ${triggeredAlert.itemName} ${triggeredAlert.condition === 'above' ? '>' : '<'} ${triggeredAlert.targetPrice.toLocaleString()} GP! Current: ${triggeredAlert.priceAtTrigger?.toLocaleString()} GP`, 'success');
    },
    fetchLatestPrice
  );

  // Apply theme colors as CSS variables
  useEffect(() => {
    const activeTheme = APP_THEMES.find(theme => theme.id === activeThemeName) || APP_THEMES[0];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(activeTheme.colors)) {
      root.style.setProperty(key, value);
    }
    localStorage.setItem('gePulseActiveTheme', activeThemeName);
  }, [activeThemeName]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);
  
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

  const toggleChartGrid = useCallback(() => {
    setShowChartGrid(prev => !prev);
  }, []);

  const toggleChartLineGlow = useCallback(() => {
    setShowChartLineGlow(prev => !prev);
  }, []);

  const refreshCurrentItemData = useCallback(async (options: { itemToRefresh?: ItemMapInfo, isUserInitiated?: boolean } = {}) => {
    const currentItem = options.itemToRefresh || selectedItem;
    const isUserInitiated = options.isUserInitiated !== undefined ? options.isUserInitiated : true;

    if (!currentItem) return;

    setIsLoadingPrice(true); 
    setError(null);

    try {
      const [latest, historical] = await Promise.all([
        fetchLatestPrice(currentItem.id),
        fetchHistoricalData(currentItem.id, selectedTimespan),
      ]);
      setLatestPrice(latest);
      setHistoricalData(historical);

      if (isUserInitiated) {
        addNotification(`${currentItem.name} data refreshed!`, 'success');
      } else {
        console.log(`Auto-refreshed data for ${currentItem.name} at ${new Date().toLocaleTimeString()}`);
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
    } finally {
      setIsLoadingPrice(false);
      if (options.isUserInitiated === false) {
        setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS); 
      }
    }
  }, [selectedItem, selectedTimespan, addNotification, alerts, checkAlerts]);


  const handleSelectItem = useCallback(async (item: ItemMapInfo) => {
    setSelectedItem(item);
    setSearchTerm(''); 
    await refreshCurrentItemData({ itemToRefresh: item, isUserInitiated: true }); 
  }, [refreshCurrentItemData]);

  const handleTimespanChange = useCallback(async (timespan: Timespan) => {
    setSelectedTimespan(timespan);
    if (selectedItem) {
      await refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: true }); 
    }
  }, [selectedItem, refreshCurrentItemData]);

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
        if(selectedItem){ 
            refreshCurrentItemData({ itemToRefresh: selectedItem, isUserInitiated: false }); 
        }
      }, AUTO_REFRESH_INTERVAL_MS);

      countdownIntervalIdRef.current = setInterval(() => {
        setTimeToNextRefresh(prev => {
          if (prev <= 1) { 
            return AUTO_REFRESH_INTERVAL_SECONDS; 
          }
          return prev - 1;
        });
      }, 1000);

    } else {
      setTimeToNextRefresh(AUTO_REFRESH_INTERVAL_SECONDS);
    }

    return () => {
      if (autoRefreshIntervalIdRef.current) clearInterval(autoRefreshIntervalIdRef.current);
      if (countdownIntervalIdRef.current) clearInterval(countdownIntervalIdRef.current);
    };
  }, [isAutoRefreshEnabled, selectedItem, manualRefreshTrigger]);


  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    return allItems
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 20);
  }, [allItems, searchTerm]);

  const getItemName = useCallback((itemId: number): string => {
    return allItems.find(item => item.id === itemId)?.name || 'Unknown Item';
  }, [allItems]);

  const getItemIconUrl = useCallback((iconName: string): string => {
    return `${ITEM_IMAGE_BASE_URL}${iconName.replace(/ /g, '_')}`;
  }, []);

  const toggleSettingsModal = () => setIsSettingsOpen(prev => !prev);

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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <div className="flex items-center justify-center">
                <svg width="80" height="50" viewBox="0 0 135 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
                    <path d="M10 30 Q25 5 40 30 T70 30 Q85 55 90 30" stroke="var(--logo-pulse-color)" strokeWidth="5" fill="transparent"/>
                    <circle cx="90" cy="30" r="8" fill="var(--logo-coin-fill)" stroke="var(--logo-coin-stroke)" strokeWidth="2"/>
                    <text x="101" y="30" dominant-baseline="middle" fill="var(--logo-gp-text-color)" fontSize="20" fontWeight="bold" className="hidden sm:inline">GP</text>
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
          activeThemeName={activeThemeName}
          onSetThemeName={setActiveThemeName}
          themes={APP_THEMES}
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
              <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              {searchTerm && filteredItems.length > 0 && (
                <ItemList items={filteredItems} onSelectItem={handleSelectItem} getItemIconUrl={getItemIconUrl} />
              )}
              {searchTerm && filteredItems.length === 0 && !isLoadingItems && (
                <p className="text-[var(--text-secondary)] mt-4">No items found matching "{searchTerm}".</p>
              )}
            </div>

            <AlertsManager
              alerts={alerts}
              addAlert={addAlert}
              removeAlert={removeAlert}
              allItems={allItems}
              getItemName={getItemName}
              getItemIconUrl={getItemIconUrl}
              addNotification={addNotification}
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
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-xl">Select an item to view its details.</p>
                <p className="mt-1">Use the search bar on the left to find items.</p>
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
