
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
}

export type Timespan = '5m' | '1h' | '6h' | '24h';

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
}

export interface AppTheme {
  name: string;
  id: string;
  colors: ThemeColorPalette;
}
