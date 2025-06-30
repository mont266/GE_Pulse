
export interface ItemMapInfo {
  examine: string;
  id: number;
  members: boolean;
  lowalch: number;
  limit: number;
  value: number;
  highalch: number;
  icon: string;
  name: string;
}

export interface ItemMappingResponse {
  [id: string]: ItemMapInfo;
}

export interface LatestPriceData {
  high: number | null;
  highTime: number | null; // Unix timestamp
  low: number | null;
  lowTime: number | null; // Unix timestamp
}

export interface LatestPriceApiResponse {
  data: {
    [itemId: string]: LatestPriceData;
  };
}

export interface HistoricalDataPointAPI {
  timestamp: number;
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number;
  lowPriceVolume: number;
}

export interface TimeseriesApiResponse {
  data: HistoricalDataPointAPI[];
}

export interface ChartDataPoint {
  timestamp: number; // Unix timestamp for X-axis
  price: number;     // This will represent avgHighPrice for Y-axis
  avgLowPrice?: number; // Optional average low price
  formattedDate: string; // For tooltip display (can be removed if CustomTooltip formats its own label)
  highPriceVolume?: number; // Buy volume
  lowPriceVolume?: number;  // Sell volume
}

export type Timespan = '1h' | '6h' | '1d' | '7d' | '1mo' | '3mo' | '6mo' | '1y';
export type TimespanAPI = '5m' | '1h' | '6h' | '24h'; // Actual timesteps the API accepts

export interface PriceAlert {
  id: string; // Unique ID for the alert
  itemId: number;
  itemName: string;
  itemIcon: string; // Store icon name for display
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number; // Timestamp
  status: 'active' | 'triggered';
  priceAtTrigger?: number; // Price when the alert was triggered
  triggeredAt?: number; // Timestamp when triggered
}

export interface NotificationMessage {
  id:string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ThemeColorPalette {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-secondary-alpha': string;
  '--bg-tertiary': string;
  '--bg-modal': string;
  '--bg-interactive': string;
  '--bg-interactive-hover': string;
  '--bg-input': string;
  '--bg-input-secondary': string; // For less prominent inputs or readonly states
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-accent': string;
  '--text-on-interactive': string; // Text color for on top of --bg-interactive
  '--border-primary': string;
  '--border-secondary': string;
  '--border-accent': string;
  '--link-text': string;
  '--link-text-hover': string;
  '--error-bg': string;
  '--error-text': string;
  '--price-high': string;
  '--price-low': string;
  '--chart-grid': string;
  '--chart-axis-text': string;
  '--chart-line': string;
  '--chart-line-active-dot': string;
  '--chart-line-glow': string;
  '--chart-volume-buy': string; // For buy volume bars
  '--chart-volume-sell': string; // For sell volume bars
  '--tooltip-bg': string;
  '--tooltip-border': string;
  '--tooltip-text': string;
  '--legend-text': string;
  '--toggle-active-bg': string;
  '--toggle-inactive-bg': string;
  '--toggle-handle': string;
  '--alert-triggered-bg': string;
  '--alert-triggered-border': string;
  '--alert-triggered-text': string;
  '--alert-active-icon': string;
  '--alert-triggered-icon': string;
  '--notification-success-bg': string;
  '--notification-error-bg': string;
  '--notification-info-bg': string;
  '--notification-text': string;
  '--logo-pulse-color': string;
  '--logo-coin-fill': string;
  '--logo-coin-stroke': string;
  '--logo-gp-text-color': string;
  '--icon-button-hover-bg': string;
  '--icon-button-default-text': string;
  '--icon-button-hover-text': string;
  '--favorite-icon-default': string; // For empty favorite star
  '--favorite-icon-favorited': string; // For filled favorite star
}

export interface AppTheme {
  name: string;
  id: string;
  colors: ThemeColorPalette;
}

export type FavoriteItemId = number; // Just for clarity, it's a number

export interface FavoriteItemHourlyChangeData {
  changeAbsolute: number;
  changePercent: number;
}

export type FavoriteItemHourlyChangeState = 
  | FavoriteItemHourlyChangeData 
  | 'loading' 
  | 'error' 
  | 'no_data' 
  | null;

export type WordingPreference = 'uk' | 'us';

export type FavoriteItemSparklineState =
  | ChartDataPoint[]
  | 'loading'
  | 'error'
  | 'no_data'
  | null; 

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  notes?: string;
}

export interface TimestepItemPriceVolumeData {
  avgHighPrice: number | null;
  highPriceVolume: number;
  avgLowPrice: number | null;
  lowPriceVolume: number;
}

export interface AllItemsTimestepResponse {
  timestamp: number; 
  data: {
    [itemId: string]: TimestepItemPriceVolumeData;
  };
}

export interface MoverItem {
  id: number;
  name: string;
  icon: string;
  currentPrice: number; 
  currentVolume?: number; 
  pastPrice: number; 
  pastVolume?: number; 
  percentChange: number; 
}

export type TopMoversTimespan = '1h' | '24h';
export type TopMoversCalculationMode = 'performance' | 'accuracy';
export type TopMoversMetricType = 'price' | 'volume'; 

export interface TopMoversData {
  winners: MoverItem[];
  losers: MoverItem[];
}

export interface SectionRenderProps {
  sectionId: string;
  isDragAndDropEnabled: boolean;
  handleDragStart: (event: React.DragEvent<HTMLButtonElement | HTMLDivElement>, sectionId: string) => void;
  draggedItem: string | null;
  currentHeight: number; // Current height of the section content area
  isResizable: boolean; // Whether the section is currently resizable
  onResizeMouseDown: (event: React.MouseEvent<HTMLDivElement>, sectionId: string) => void; // Handler for starting resize
}

export type SectionHeights = Record<string, number>;

export interface PortfolioEntry {
  id: string; 
  itemId: number;
  quantityPurchased: number;
  purchasePricePerItem: number;
  purchaseDate: number; 
  quantitySoldFromThisLot: number; 
  totalProceedsFromThisLot: number; 
  totalTaxPaidFromThisLot: number; 
  lastSaleDate?: number; 
}

export type PortfolioEntryUpdate = Partial<Pick<PortfolioEntry, 'quantityPurchased' | 'purchasePricePerItem' | 'purchaseDate'>>;

export interface PortfolioBackup {
  rsn?: string;
  entries: PortfolioEntry[];
}

export interface DriveFeedback {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface PortfolioSummaryProps {
  entries: PortfolioEntry[];
  livePrices: Record<number, LatestPriceData | null>;
  getItemName: (itemId: number) => string;
  onRefreshPrices: () => void;
  isLoadingPrices: boolean;
  onSelectItemAndClose?: (itemId: number) => void;
  userRsn?: string; // Added for RSN display and input
  onUserRsnChange: (newRsn: string) => void; // Added for RSN input
}


// Declare google object if not already available globally
declare global {
  interface Window {
    gtag?: (...args: any[]) => void; // Google Analytics
    gapi?: any; // Google API Client Library
    google?: any; // Google Identity Services Library
  }
}

// Portfolio Performance Chart Types
export type PortfolioChartTimespan = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface PortfolioPerformanceDataPoint {
  timestamp: number; // Unix timestamp for X-axis (representing a day)
  profit: number;    // Total portfolio profit on that day (Unrealized P/L of open + Cumulative Realized P/L)
  realizedPL?: number; // Optional: Cumulative realized P/L up to this day
}