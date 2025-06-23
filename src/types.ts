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
}

// Portfolio / Investment Tracking Types
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

// Google Drive Integration Types
export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveServiceConfig {
  apiKey: string;
  clientId: string;
  onAuthChange: (isSignedIn: boolean, userProfile: GoogleUserProfile | null) => void;
  onApiReady: () => void;
  onApiError: (errorMsg: string) => void;
}

// Augment the global 'google' object from Google Identity Services
declare global {
  interface Window {
    // gapi is already often available via @types/gapi
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parentElement: HTMLElement, options: any) => void;
        };
      };
      picker?: { // For Google Picker
        PickerBuilder: new () => PickerBuilder;
        ViewId: { [key: string]: string }; // e.g., DOCS, DOCS_IMAGES_AND_VIDEOS, etc.
        Feature: { [key: string]: string }; // e.g., MULTISELECT_ENABLED
        Action: { [key: string]: string }; // e.g., PICKED, CANCEL
        ResponseObject: any; // Type for picker callback data
        DocsUploadView: new () => any; // If using upload view
      };
    };
  }
}

// Types for Google Identity Services Token Client
export interface TokenClientConfig {
  client_id: string;
  scope: string;
  prompt?: string; // e.g. 'consent', 'select_account'
  callback?: (tokenResponse: TokenResponse) => void;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number; // typically 3600 (1 hour)
  scope: string;
  token_type: string; // "Bearer"
  // Potentially other fields like id_token, authuser, hd, prompt, etc.
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

// Types for Google Picker
interface PickerBuilder {
  addView: (viewOrViewId: any) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setCallback: (callback: (data: any) => void) => PickerBuilder;
  build: () => Picker;
  // Add more methods as needed, e.g., setOrigin, setTitle, etc.
  enableFeature: (feature: string) => PickerBuilder;
  disableFeature: (feature: string) => PickerBuilder;
  setSelectableMimeTypes: (mimeTypes: string) => PickerBuilder;
  setMaxItems: (max: number) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
}

interface Picker {
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}