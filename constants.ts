
import { Timespan, AppTheme, WordingPreference, TopMoversCalculationMode, TopMoversMetricType, PortfolioChartTimespan } from './src/types'; // Updated import path

export const API_BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';
export const ITEM_IMAGE_BASE_URL = 'https://oldschool.runescape.wiki/images/';

export const TIMESPAN_OPTIONS: { label: string; value: Timespan }[] = [
  { label: '1 Hour', value: '1h' },
  { label: '6 Hours', value: '6h' },
  { label: '1 Day', value: '1d' },
  { label: '7 Days', value: '7d' },
  { label: '1 Month', value: '1mo' },
  { label: '3 Months', value: '3mo' },
  { label: '6 Months', value: '6mo' },
  { label: '1 Year', value: '1y' },
];

export const PORTFOLIO_CHART_TIMESPAN_OPTIONS: { label: string; value: PortfolioChartTimespan }[] = [
  { label: '1 Month', value: '1M' },
  { label: '3 Months', value: '3M' },
  { label: '6 Months', value: '6M' },
  { label: '1 Year', value: '1Y' },
  { label: 'All Time', value: 'ALL' },
];


export const ALERT_CHECK_INTERVAL = 60 * 1000; // 60 seconds
export const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const AUTO_REFRESH_INTERVAL_SECONDS = 300; // 5 minutes

// Storage Keys
export const FAVORITES_STORAGE_KEY = 'gePulseFavoriteItems';
export const WORDING_PREFERENCE_STORAGE_KEY = 'gePulseWordingPreference';
export const ALERTS_STORAGE_KEY = 'runescapePriceAlerts'; // Used by usePriceAlerts
export const CHART_GRID_STORAGE_KEY = 'gePulseShowChartGrid';
export const CHART_LINE_GLOW_STORAGE_KEY = 'gePulseShowChartLineGlow';
export const VOLUME_CHART_STORAGE_KEY = 'gePulseShowVolumeChart';
export const FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY = 'gePulseShowFavoriteSparklines';
export const ACTIVE_THEME_STORAGE_KEY = 'gePulseActiveTheme';
export const DESKTOP_NOTIFICATIONS_ENABLED_KEY = 'gePulseEnableDesktopNotifications';
export const IN_APP_ALERT_SOUNDS_ENABLED_KEY = 'gePulseEnableInAppAlertSounds'; // New key
export const SIDEBAR_ORDER_STORAGE_KEY = 'gePulseSidebarOrder';
export const SECTION_HEIGHTS_STORAGE_KEY = 'gePulseSectionHeights'; // New key for resizable sections
export const DRAG_DROP_ENABLED_STORAGE_KEY = 'gePulseDragDropEnabled';
export const PORTFOLIO_STORAGE_KEY = 'gePulsePortfolio'; 

export const CONSENT_STORAGE_KEY = 'gePulseConsentStatus'; 


export const DEFAULT_WORDING_PREFERENCE: WordingPreference = 'uk';
export const DEFAULT_THEME_ID = 'ge-pulse-dark';
export const DEFAULT_IN_APP_ALERT_SOUNDS_ENABLED = true; // New default
export const DEFAULT_TOP_MOVERS_CALCULATION_MODE: TopMoversCalculationMode = 'performance';
export const DEFAULT_TOP_MOVERS_METRIC_TYPE: TopMoversMetricType = 'price';

// Section Resizing Constants
export const DESKTOP_BREAKPOINT_RESIZE = 768; // md breakpoint
export const DEFAULT_SECTION_HEIGHT_PX = 288; // Corresponds to max-h-72 (18rem * 16px/rem)
export const MIN_SECTION_HEIGHT_PX = 150;
export const MAX_SECTION_HEIGHT_PX = 700; // Approx 70vh to prevent overly large sections


// Sidebar section keys - must match keys used in App.tsx's sectionsConfig
export const SECTION_KEYS = {
  SEARCH: 'search',
  FAVORITES: 'favorites',
  TOP_MOVERS: 'topMovers',
  ALERTS: 'alerts',
};
export const DEFAULT_SIDEBAR_ORDER: string[] = [SECTION_KEYS.SEARCH, SECTION_KEYS.FAVORITES, SECTION_KEYS.TOP_MOVERS, SECTION_KEYS.ALERTS];

// Top Movers constants
export const MAX_CANDIDATE_ITEMS_PERFORMANCE = 50;
export const MIN_PRICE_FOR_MOVER_CONSIDERATION = 100;

// Grand Exchange Tax Constants
export const GE_TAX_RATE = 0.02; // 2%
export const GE_TAX_CAP = 5_000_000; // 5 million GP
export const TAX_EXEMPT_ITEM_IDS: number[] = [
  233, 952, 1733, 1735, 1755, 1785, 2347, 2989, 2990, 2991, 2992, 2993, 2994, 2995, 
  5325, 5329, 5331, 5341, 5343, 8794, 13190, 24058, 26362, 26364, 26366, 27951, 
  28607, 28610, 28613,
].sort((a, b) => a - b); 


// List of all keys for user preferences that should be cleared if consent is revoked
export const ALL_USER_PREFERENCE_KEYS = [
  FAVORITES_STORAGE_KEY,
  WORDING_PREFERENCE_STORAGE_KEY,
  ALERTS_STORAGE_KEY,
  CHART_GRID_STORAGE_KEY,
  CHART_LINE_GLOW_STORAGE_KEY,
  VOLUME_CHART_STORAGE_KEY,
  FAVORITE_SPARKLINES_VISIBLE_STORAGE_KEY,
  ACTIVE_THEME_STORAGE_KEY,
  DESKTOP_NOTIFICATIONS_ENABLED_KEY,
  IN_APP_ALERT_SOUNDS_ENABLED_KEY, 
  SIDEBAR_ORDER_STORAGE_KEY,
  SECTION_HEIGHTS_STORAGE_KEY, // Added new key
  DRAG_DROP_ENABLED_STORAGE_KEY,
  PORTFOLIO_STORAGE_KEY, 
];


export const APP_THEMES: AppTheme[] = [
  {
    name: 'GE Pulse Dark',
    id: 'ge-pulse-dark',
    colors: {
      '--bg-primary': '#111827', // slate-900
      '--bg-secondary': '#1f2937', // slate-800
      '--bg-secondary-alpha': 'rgba(31, 41, 55, 0.7)', // slate-800 with alpha
      '--bg-tertiary': '#374151', // slate-700
      '--bg-modal': '#1f2937', // slate-800 (for modal consistency)
      '--bg-interactive': '#0ea5e9', // sky-500
      '--bg-interactive-hover': '#0284c7', // sky-600
      '--bg-input': '#374151', // slate-700
      '--bg-input-secondary': 'rgba(55, 65, 81, 0.5)', // slate-700/50
      '--text-primary': '#f3f4f6', // slate-100
      '--text-secondary': '#9ca3af', // slate-400
      '--text-muted': '#6b7280', // slate-500
      '--text-accent': '#38bdf8', // sky-400
      '--text-on-interactive': '#ffffff', // white
      '--border-primary': '#374151', // slate-700
      '--border-secondary': '#4b5563', // slate-600
      '--border-accent': '#0ea5e9', // sky-500
      '--link-text': '#38bdf8', // sky-400
      '--link-text-hover': '#0ea5e9', // sky-500
      '--error-bg': '#7f1d1d', // red-800
      '--error-text': '#fecaca', // red-200
      '--price-high': '#4ade80', // green-400
      '--price-low': '#f87171', // red-400
      '--chart-grid': '#4b5563', // slate-600
      '--chart-axis-text': '#cbd5e1', // slate-300
      '--chart-line': '#8B5CF6', // purple-500
      '--chart-line-active-dot': '#A78BFA', // purple-400
      '--chart-line-glow': '#A78BFA', // purple-400
      '--chart-volume-buy': 'rgba(74, 222, 128, 0.6)', // green-400 with alpha
      '--chart-volume-sell': 'rgba(248, 113, 113, 0.6)', // red-400 with alpha
      '--tooltip-bg': 'rgba(39, 26, 60, 0.85)', // Dark purple
      '--tooltip-border': '#581C87', // purple-800
      '--tooltip-text': '#DDD6FE', // purple-200
      '--legend-text': '#DDD6FE', // purple-200
      '--toggle-active-bg': '#0ea5e9', // sky-500
      '--toggle-inactive-bg': '#4b5563', // slate-600
      '--toggle-handle': '#ffffff', // white
      '--alert-triggered-bg': 'rgba(74, 222, 128, 0.15)', // green-400 with light alpha
      '--alert-triggered-border': '#4ade80', // green-400
      '--alert-triggered-text': '#86efac', // green-300
      '--alert-active-icon': '#38bdf8', // sky-400
      '--alert-triggered-icon': '#4ade80', // green-400
      '--notification-success-bg': '#166534', // green-700
      '--notification-error-bg': '#991b1b', // red-700
      '--notification-info-bg': '#0c5480', // sky-700
      '--notification-text': '#ffffff', // white
      '--logo-pulse-color': '#38bdf8', // sky-400
      '--logo-coin-fill': '#facc15', // yellow-400
      '--logo-coin-stroke': '#eab308', // yellow-500
      '--logo-gp-text-color': '#facc15', // yellow-400
      '--icon-button-hover-bg': '#374151', // slate-700
      '--icon-button-default-text': '#9ca3af', // slate-400
      '--icon-button-hover-text': '#38bdf8', // sky-400
      '--favorite-icon-default': '#9ca3af', // slate-400 (same as default icon text)
      '--favorite-icon-favorited': '#ef4444', // red-500
    },
  },
  {
    name: 'Rune Light',
    id: 'rune-light',
    colors: {
      '--bg-primary': '#f5f5dc', // beige
      '--bg-secondary': '#e0d6c3', // lighter brown paper
      '--bg-secondary-alpha': 'rgba(224, 214, 195, 0.7)',
      '--bg-tertiary': '#d2b48c', // tan
      '--bg-modal': '#e0d6c3',
      '--bg-interactive': '#228B22', // forestgreen
      '--bg-interactive-hover': '#3CB371', // mediumseagreen
      '--bg-input': '#d2b48c', // tan
      '--bg-input-secondary': 'rgba(210, 180, 140, 0.5)',
      '--text-primary': '#5D4037', // dark brown
      '--text-secondary': '#795548', // medium brown
      '--text-muted': '#8D6E63', // light brown
      '--text-accent': '#006400', // darkgreen
      '--text-on-interactive': '#ffffff', // white
      '--border-primary': '#a1887f', // brownish grey
      '--border-secondary': '#bcaaa4', // lighter brownish grey
      '--border-accent': '#228B22', // forestgreen
      '--link-text': '#006400', // darkgreen
      '--link-text-hover': '#228B22', // forestgreen
      '--error-bg': '#ffebee', // light red
      '--error-text': '#c62828', // dark red
      '--price-high': '#388e3c', // medium green
      '--price-low': '#d32f2f', // medium red
      '--chart-grid': '#bcaaa4', // lighter brownish grey
      '--chart-axis-text': '#795548', // medium brown
      '--chart-line': '#006400', // darkgreen
      '--chart-line-active-dot': '#228B22', // forestgreen
      '--chart-line-glow': '#3CB371', // mediumseagreen
      '--chart-volume-buy': 'rgba(56, 142, 60, 0.6)', // medium green with alpha
      '--chart-volume-sell': 'rgba(211, 47, 47, 0.6)', // medium red with alpha
      '--tooltip-bg': 'rgba(245, 245, 220, 0.9)', // beige with opacity
      '--tooltip-border': '#a1887f', // brownish grey
      '--tooltip-text': '#5D4037', // dark brown
      '--legend-text': '#5D4037', // dark brown
      '--toggle-active-bg': '#228B22', // forestgreen
      '--toggle-inactive-bg': '#bcaaa4', // lighter brownish grey
      '--toggle-handle': '#ffffff', // white
      '--alert-triggered-bg': 'rgba(76, 175, 80, 0.2)', // material green 500 with alpha
      '--alert-triggered-border': '#4CAF50', // material green 500
      '--alert-triggered-text': '#2E7D32', // material green 800 (dark green)
      '--alert-active-icon': '#006400', // darkgreen
      '--alert-triggered-icon': '#4CAF50', // material green 500
      '--notification-success-bg': '#c8e6c9', // light green
      '--notification-error-bg': '#ffcdd2', // light red
      '--notification-info-bg': '#bbdefb', // light blue
      '--notification-text': '#212121', // dark grey for readability
      '--logo-pulse-color': '#006400', // darkgreen
      '--logo-coin-fill': '#FFD700', // gold
      '--logo-coin-stroke': '#B8860B', // darkgoldenrod
      '--logo-gp-text-color': '#B8860B', // darkgoldenrod
      '--icon-button-hover-bg': '#d2b48c', // tan
      '--icon-button-default-text': '#795548', // medium brown
      '--icon-button-hover-text': '#006400', // darkgreen
      '--favorite-icon-default': '#795548', // medium brown
      '--favorite-icon-favorited': '#ef4444', // red-500
    },
  },
  {
    name: 'Arcane Blue',
    id: 'arcane-blue',
    colors: {
      '--bg-primary': '#0b192f', // very dark blue
      '--bg-secondary': '#112240', // dark blue
      '--bg-secondary-alpha': 'rgba(17, 34, 64, 0.7)',
      '--bg-tertiary': '#233554', // lighter dark blue
      '--bg-modal': '#112240',
      '--bg-interactive': '#64ffda', // cyan/mint accent
      '--bg-interactive-hover': '#52d1b9', // darker cyan/mint
      '--bg-input': '#233554', // lighter dark blue
      '--bg-input-secondary': 'rgba(35, 53, 84, 0.5)',
      '--text-primary': '#ccd6f6', // light blue/lavender
      '--text-secondary': '#8892b0', // slate blue
      '--text-muted': '#4a5568', // darker slate blue
      '--text-accent': '#64ffda', // cyan/mint accent
      '--text-on-interactive': '#0b192f', // very dark blue (for contrast on mint)
      '--border-primary': '#233554', // lighter dark blue
      '--border-secondary': '#3a4c6d',
      '--border-accent': '#64ffda', // cyan/mint accent
      '--link-text': '#64ffda', // cyan/mint accent
      '--link-text-hover': '#79ffee',
      '--error-bg': '#4A1B29', // dark red/purple
      '--error-text': '#FFACB7', // light pink
      '--price-high': '#64ffda', // cyan/mint
      '--price-low': '#ff79c6', // pink
      '--chart-grid': '#3a4c6d', // slate blue grid
      '--chart-axis-text': '#8892b0', // slate blue
      '--chart-line': '#ff79c6', // pink
      '--chart-line-active-dot': '#ff93d0', // lighter pink
      '--chart-line-glow': '#ff93d0', // lighter pink
      '--chart-volume-buy': 'rgba(100, 255, 218, 0.6)', // cyan/mint with alpha
      '--chart-volume-sell': 'rgba(255, 121, 198, 0.6)', // pink with alpha
      '--tooltip-bg': 'rgba(17, 34, 64, 0.85)', // dark blue with opacity
      '--tooltip-border': '#64ffda', // cyan/mint accent
      '--tooltip-text': '#ccd6f6', // light blue/lavender
      '--legend-text': '#ccd6f6', // light blue/lavender
      '--toggle-active-bg': '#64ffda', // cyan/mint accent
      '--toggle-inactive-bg': '#4a5568', // darker slate blue
      '--toggle-handle': '#0b192f', // very dark blue
      '--alert-triggered-bg': 'rgba(100, 255, 218, 0.15)', // cyan/mint with light alpha
      '--alert-triggered-border': '#64ffda', // cyan/mint
      '--alert-triggered-text': '#a7fdec', // lighter cyan/mint
      '--alert-active-icon': '#64ffda', // cyan/mint (active icon can match accent)
      '--alert-triggered-icon': '#64ffda', // cyan/mint
      '--notification-success-bg': '#296157', // dark cyan
      '--notification-error-bg': '#5c1d3a', // dark pink
      '--notification-info-bg': '#2c3a79', // darkish blue
      '--notification-text': '#ccd6f6', // light blue/lavender
      '--logo-pulse-color': '#64ffda', // cyan/mint
      '--logo-coin-fill': '#f1fa8c', // light yellow
      '--logo-coin-stroke': '#bdc568', // darker light yellow
      '--logo-gp-text-color': '#f1fa8c', // light yellow
      '--icon-button-hover-bg': '#233554',
      '--icon-button-default-text': '#8892b0',
      '--icon-button-hover-text': '#64ffda',
      '--favorite-icon-default': '#8892b0', // slate blue
      '--favorite-icon-favorited': '#ef4444', // red-500
    },
  },
  {
    name: 'Neon Purple',
    id: 'neon-purple',
    colors: {
      '--bg-primary': '#100c1c', // Very dark desaturated purple
      '--bg-secondary': '#1a142d', // Dark purple
      '--bg-secondary-alpha': 'rgba(26, 20, 45, 0.7)',
      '--bg-tertiary': '#2c234d', // Medium-dark purple
      '--bg-modal': '#1a142d',
      '--bg-interactive': '#ab57ff', // Bright neon purple
      '--bg-interactive-hover': '#9333ea', // Darker neon purple (purple-600)
      '--bg-input': '#2c234d',
      '--bg-input-secondary': 'rgba(44, 35, 77, 0.5)',
      '--text-primary': '#f2e7fe', // Very light lavender
      '--text-secondary': '#c084fc', // Lighter purple (purple-400)
      '--text-muted': '#9333ea', // Purple-600
      '--text-accent': '#d8b4fe', // Purple-300 (lighter for accents)
      '--text-on-interactive': '#ffffff',
      '--border-primary': '#3b0764', // Dark purple border
      '--border-secondary': '#581c87', // Purple-800
      '--border-accent': '#ab57ff', // Bright neon purple
      '--link-text': '#d8b4fe', // Purple-300
      '--link-text-hover': '#ab57ff', // Bright neon purple
      '--error-bg': '#5c002e', // Dark magenta/red
      '--error-text': '#ff7eb3', // Light pink
      '--price-high': '#50fa7b', // Neon green
      '--price-low': '#ff5555', // Neon red
      '--chart-grid': '#4a044e', // Dark magenta grid
      '--chart-axis-text': '#e9d5ff', // Purple-200
      '--chart-line': '#f472b6', // Neon pink/magenta line
      '--chart-line-active-dot': '#ec4899', // Pink-500
      '--chart-line-glow': '#f472b6', // Neon pink/magenta
      '--chart-volume-buy': 'rgba(80, 250, 123, 0.6)', // Neon green with alpha
      '--chart-volume-sell': 'rgba(255, 85, 85, 0.6)', // Neon red with alpha
      '--tooltip-bg': 'rgba(26, 20, 45, 0.9)', // Dark purple tooltip
      '--tooltip-border': '#ab57ff',
      '--tooltip-text': '#f2e7fe',
      '--legend-text': '#f2e7fe',
      '--toggle-active-bg': '#ab57ff',
      '--toggle-inactive-bg': '#581c87', // Purple-800
      '--toggle-handle': '#ffffff',
      '--alert-triggered-bg': 'rgba(80, 250, 123, 0.15)', // Neon green with light alpha
      '--alert-triggered-border': '#50fa7b', // Neon green
      '--alert-triggered-text': '#b0fed0', // lighter neon green
      '--alert-active-icon': '#d8b4fe', // Purple-300
      '--alert-triggered-icon': '#50fa7b', // Neon green
      '--notification-success-bg': '#035f1e', // Dark neon green
      '--notification-error-bg': '#7d0202', // Dark neon red
      '--notification-info-bg': '#3b0764', // Dark neon purple base
      '--notification-text': '#ffffff',
      '--logo-pulse-color': '#ab57ff', // Bright neon purple
      '--logo-coin-fill': '#fef08a', // yellow-200 (less intense gold)
      '--logo-coin-stroke': '#eab308', // yellow-500
      '--logo-gp-text-color': '#fef08a',
      '--icon-button-hover-bg': '#2c234d',
      '--icon-button-default-text': '#c084fc',
      '--icon-button-hover-text': '#ab57ff',
      '--favorite-icon-default': '#c084fc', // Lighter purple
      '--favorite-icon-favorited': '#ef4444', // red-500
    },
  }
];
