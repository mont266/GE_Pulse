
import React from 'react';
import { MoverItem, TopMoversData, TopMoversTimespan, SectionRenderProps, TopMoversCalculationMode, TopMoversMetricType, Timespan } from '../src/types'; // Added Timespan
import { ChevronDownIcon, TrendingUpIcon } from './Icons';
import { MAX_CANDIDATE_ITEMS_PERFORMANCE, MIN_PRICE_FOR_MOVER_CONSIDERATION } from '../constants';


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

const SmallSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const MoverListItem: React.FC<{ 
  item: MoverItem; 
  onSelectItemById: (id: number, originTimespan?: Timespan, originSnapshotTimestampMs?: number) => void; 
  getItemIconUrl: (icon: string) => string; 
  isWinner: boolean;
  metricType: TopMoversMetricType;
  currentMoversTimespan: TopMoversTimespan;
  snapshotTimestamp: number; 
}> = ({ item, onSelectItemById, getItemIconUrl, isWinner, metricType, currentMoversTimespan, snapshotTimestamp }) => {
  const SvgIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 mr-1 ${isWinner ? 'text-[var(--price-high)] transform rotate-0' : 'text-[var(--price-low)] transform rotate-180'}`}>
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.56l-2.47 2.47a.75.75 0 01-1.06-1.06l3.75-3.75a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L10.75 5.56v10.69A.75.75 0 0110 17z" clipRule="evenodd" />
    </svg>
  );
  
  let displayChange = item.percentChange.toFixed(1) + '%';
  if (metricType === 'volume' && Math.abs(item.percentChange) >= 99999 && item.percentChange > 0 ) {
      displayChange = "New Vol.";
  }


  return (
    <li className="p-2 bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-input-secondary)] transition-colors group">
      <button
        onClick={() => onSelectItemById(item.id, currentMoversTimespan as Timespan, snapshotTimestamp)}
        className="w-full flex items-start sm:items-center space-x-2 text-left focus:outline-none"
        aria-label={`View details for ${item.name}, ${metricType} change ${displayChange}`}
      >
        <img
          loading="lazy"
          src={getItemIconUrl(item.icon)}
          alt=""
          className="w-7 h-7 object-contain flex-shrink-0 sm:mt-0.5" 
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/28?text=Err'; 
            target.onerror = null; 
          }}
        />
        <div className="flex-grow min-w-0 flex sm:block items-center sm:items-start justify-between sm:justify-start">
          <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors line-clamp-2" title={item.name}>
            {item.name}
          </span>
          <div className="flex items-center text-xs font-medium sm:mt-0.5 flex-shrink-0">
            <SvgIcon />
            <span className={`${isWinner ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]'}`}>
              {displayChange}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
};

export const TopMoversSection: React.FC<TopMoversSectionProps> = ({
  topMoversData,
  isLoading,
  error,
  selectedTimespan,
  onSetTimespan,
  onRefresh,
  isCollapsed,
  onToggleCollapse,
  onSelectItemById,
  getItemIconUrl,
  lastFetchedTimestamp,
  topMoversCalculationMode,
  onSetTopMoversCalculationMode,
  topMoversMetricType,
  onSetTopMoversMetricType,
  sectionId,
  isDragAndDropEnabled,
  handleDragStart,
  draggedItem,
  currentHeight, 
  isResizable, 
  onResizeMouseDown,
}) => {

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault(); 
    onRefresh();
  };

  const getTimeAgo = (timestamp: number): string => {
    if (timestamp === 0) return "";
    const now = Date.now();
    const seconds = Math.round((now - timestamp) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  };
  
  const getButtonCursorClass = () => {
    if (isDragAndDropEnabled) {
      return draggedItem === sectionId ? 'cursor-grabbing' : 'cursor-grab';
    }
    return '';
  };
  
  const scanModeText = topMoversCalculationMode === 'accuracy' ? 'Full Scan - may be slow' : 'Fast Scan';
  const metricTypeText = topMoversMetricType === 'price' ? 'price' : 'total volume';
  const candidateDescription = topMoversCalculationMode === 'accuracy' 
    ? `all eligible items priced >${MIN_PRICE_FOR_MOVER_CONSIDERATION} GP`
    : `top ${MAX_CANDIDATE_ITEMS_PERFORMANCE} actively traded items priced >${MIN_PRICE_FOR_MOVER_CONSIDERATION} GP`;
  const noteText = `Movers based on % ${metricTypeText} change of ${candidateDescription}. (${scanModeText})`;


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
          <TrendingUpIcon className="w-6 h-6 text-[var(--text-accent)] mr-3 pointer-events-none flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-[var(--text-accent)] pointer-events-none">Top Market Movers</h2>
          {!isCollapsed && (
             <button
              onClick={handleRefreshClick} 
              draggable="false"
              disabled={isLoading}
              className="ml-3 p-1.5 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-accent)] disabled:opacity-50 disabled:cursor-not-allowed" 
              aria-label="Refresh market movers"
              title="Refresh market movers"
            >
              {isLoading ? <SmallSpinner /> : <RefreshIcon className="w-5 h-5" />}
            </button>
          )}
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 pointer-events-none ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="rounded-b-lg">
          <div 
            id={`${sectionId}-content-wrapper`} 
            className="p-4 md:p-6 space-y-4"
            style={{ 
              maxHeight: isResizable ? `${currentHeight}px` : undefined, 
              overflowY: 'auto',
              transition: isResizable ? 'max-height 0.1s linear' : 'none',
            }}
          >
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2">
                  {(['1h', '24h'] as TopMoversTimespan[]).map(ts => (
                    <button
                      key={ts}
                      onClick={(e) => { e.stopPropagation(); onSetTimespan(ts);}}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors disabled:opacity-70
                        ${selectedTimespan === ts
                          ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input-secondary)]'
                        }`}
                    >
                      Last {ts === '1h' ? '1 Hour' : '24 Hours'}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Metric:</span>
                  {(['price', 'volume'] as TopMoversMetricType[]).map(mt => (
                    <button
                      key={mt}
                      onClick={(e) => {e.stopPropagation(); onSetTopMoversMetricType(mt);}}
                      disabled={isLoading}
                      className={`px-2 py-1 text-xs rounded-md ${topMoversMetricType === mt ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input-secondary)]'} transition-colors disabled:opacity-70`}
                      title={mt === 'price' ? "Rank by % price change" : "Rank by % volume change"}
                    >
                      {mt === 'price' ? 'Price %' : 'Volume %'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Scan:</span>
                  {(['performance', 'accuracy'] as TopMoversCalculationMode[]).map(cm => (
                    <button
                      key={cm}
                      onClick={(e) => { e.stopPropagation(); onSetTopMoversCalculationMode(cm);}}
                      disabled={isLoading}
                      className={`px-2 py-1 text-xs rounded-md ${topMoversCalculationMode === cm ? 'bg-[var(--bg-interactive)] text-[var(--text-on-interactive)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-input-secondary)]'} transition-colors disabled:opacity-70`}
                      title={cm === 'performance' ? "Fast Scan: Top 50 actively traded items." : "Full Scan: All items >100GP. May be slow."}
                    >
                      {cm === 'performance' ? 'Fast' : 'Full'}
                    </button>
                  ))}
                </div>
              </div>
              {lastFetchedTimestamp > 0 && !isLoading && (
                  <p className="text-xs text-[var(--text-muted)] text-right -mt-2 sm:mt-0">
                      Updated {getTimeAgo(lastFetchedTimestamp)}
                  </p>
              )}


              {isLoading && (
                <div className="flex flex-col items-center justify-center h-40">
                  <SmallSpinner />
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Calculating movers... {topMoversCalculationMode === 'accuracy' && '(Full Scan may take a moment)'}</p>
                </div>
              )}
              {error && !isLoading && (
                <p className="text-[var(--price-low)] text-center py-3 bg-[var(--error-bg)]/20 rounded-md">{error}</p>
              )}
              {!isLoading && !error && topMoversData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--price-high)] mb-2">Top 5 Winners ({topMoversMetricType === 'price' ? 'Price' : 'Volume'} %)</h3>
                    {topMoversData.winners.length > 0 ? (
                      <ul className="space-y-1.5">
                        {topMoversData.winners.map(item => (
                          <MoverListItem 
                            key={`winner-${item.id}`} 
                            item={item} 
                            onSelectItemById={onSelectItemById} 
                            getItemIconUrl={getItemIconUrl} 
                            isWinner={true} 
                            metricType={topMoversMetricType} 
                            currentMoversTimespan={selectedTimespan}
                            snapshotTimestamp={lastFetchedTimestamp} 
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">No significant winners found.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--price-low)] mb-2">Top 5 Losers ({topMoversMetricType === 'price' ? 'Price' : 'Volume'} %)</h3>
                    {topMoversData.losers.length > 0 ? (
                      <ul className="space-y-1.5">
                        {topMoversData.losers.map(item => (
                          <MoverListItem 
                            key={`loser-${item.id}`} 
                            item={item} 
                            onSelectItemById={onSelectItemById} 
                            getItemIconUrl={getItemIconUrl} 
                            isWinner={false} 
                            metricType={topMoversMetricType} 
                            currentMoversTimespan={selectedTimespan}
                            snapshotTimestamp={lastFetchedTimestamp}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">No significant losers found.</p>
                    )}
                  </div>
                </div>
              )}
              {!isLoading && !error && (
                 <p className="text-xs text-[var(--text-muted)] text-center pt-3 mt-2 border-t border-[var(--border-primary)]">
                    {noteText}
                </p>
              )}
            </>
          </div>
          {isResizable && (
            <div
              className="section-resize-handle"
              onMouseDown={(e) => onResizeMouseDown(e, sectionId)}
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize Top Market Movers section`}
              title="Drag to resize section"
            />
          )}
        </div>
      )}
    </div>
  );
};