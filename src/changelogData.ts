
import { ChangelogEntry } from './types';

// Entries should be in reverse chronological order (newest first)
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "Beta v0.09",
    date: "2025-06-10", 
    changes: [
      "Introduced Portfolio Tracker: Allows logging investments (including shorthand quantity input & helper buttons for buy limit/current price), recording sales with integrated GE tax calculation, managing lots, and viewing open/closed positions. Features a portfolio summary for P/L analysis and an option to add items directly from the Item View. Data is stored locally (requires user consent).",
      "Addressed an issue causing duplicate notifications for actions like toggling drag & drop, managing favourites, and auto/manual refreshes, ensuring notifications appear only once per event.",
      "Updated application version to Beta v0.09 in footer and relevant internal constants.",
    ],
    notes: "This major update introduces the comprehensive Portfolio Tracker and includes fixes for duplicate notifications."
  },
  {
    version: "Beta v0.08",
    date: "2025-06-08", 
    changes: [
      "Added a subtle neon glow effect to the main application title 'GE Pulse' and a pulsing animation to the dot in the SVG logo for enhanced visual appeal.",
      "Integrated a feedback/bug report system: Users can now submit feedback, feature requests, or bug reports directly through a modal accessible from the application footer. This uses a Netlify form for submission.",
      "Fixed an issue where favourite items' data (price, hourly change, sparkline) would not automatically refresh with the latest information when a user revisited the site after a period of inactivity if consent for preference storage was granted. Favourite data now reliably updates upon returning to the app or when explicitly refreshed.",
      "Diagnostic logging added to the notification system to help trace duplicate notifications by logging unique ID, type, and message for each notification created.",
      "Redesigned the 'Top Market Movers' section layout for improved readability and better space utilisation on desktop views.",
      "Changed the 'Favourites' section icon in the sidebar to an unfilled heart for visual consistency with other section icons.",
      "Fixed an issue where the screen would scroll to the top when selecting an item to view; it now correctly scrolls to the item display area.",
      "Fixed a bug where the 'Top Market Movers' section would get stuck in a constant loading loop if expanded after the initial page load and subsequent data fetch. Data fetching logic for this section has been stabilized to prevent unintended re-fetches.",
      "Updated application version to Beta v0.08 in footer and relevant internal constants.",
    ],
    notes: "This update brings visual enhancements to the logo, introduces a direct feedback mechanism, improves data freshness for favourited items, enhances notification diagnostics, refines the Top Market Movers layout for desktop, standardises section icon appearance, and improves navigation by scrolling to the selected item."
  },
  {
    version: "Beta v0.07",
    date: "2025-06-07", 
    changes: [
      "Added 'Top Market Movers' section: View top 5 item price/volume winners & losers (1h/24h). Section is collapsible and in the sidebar.",
      "Enhanced 'Top Market Movers' with a 'Fast Scan' (top 50 actively traded items >100GP) vs. 'Full Scan' (all items >100GP) toggle, directly in the section. This setting is session-only and defaults to Fast Scan.",
      "Added a 'Price %' vs. 'Volume %' toggle to 'Top Market Movers', allowing ranking by either price fluctuation or trade volume change. This setting is session-only and defaults to Price %.",
      "Top Movers data can be manually refreshed. Item names are clickable, loading the item in the main display with synced timespan.",
      "Sidebar sections (Search, Favourites, Alerts, Top Movers) can now be re-ordered via drag and drop. This preference is saved if consent is granted.",
      "Drag and drop reordering for sidebar sections is disabled by default and can be toggled via a header icon.",
      "Implemented shareable links: Users can copy a direct link to an item's view from the item display header. Opening this link loads the specific item.",
      "Added icons to section headers (Search, Favourites, Top Movers, Alerts) for improved visual navigation.",
      "Improved consistency of price fluctuation percentages between 'Top Market Movers' and the main 'Item Display' by aligning historical data reference points.",
      "Updated type definitions for API responses and new feature data.",
    ],
    notes: "This update introduces market trend analysis with customisable scan modes (Fast/Full) and metric types (Price/Volume), shareable item views, and a customisable sidebar layout. UI enhancements include section icons and improved data consistency between movers and item views."
  },
  {
    version: "Beta v0.06",
    date: "2025-06-05", 
    changes: [
      "Updated application version to Beta v0.06.",
      "Enhanced Price Alert Creation: Users can now set a price alert directly from an item's detailed view using a new dedicated popup modal. This replaces the previous behaviour of scrolling to and pre-filling the main alert form.",
      "Introduced 'Quick Actions' for faster interactions:",
      "  - Search Results: Added a heart icon next to each item, allowing for instant adding or removing from favourites without navigating away.",
      "  - Favourites List: Added a bell icon next to each favourited item to quickly open the 'Set Alert' modal for that item.",
      "  - Note: Quick actions (including favourite/alert icons in main item display) are only available if the user has consented to preference storage.",
      "Refactored UI icons into a shared `components/Icons.tsx` module for better maintainability and consistency.",
      "Sidebar sections (Search, Favourites, Alerts) are now collapsible to allow users to customise their view.",
      "Added mini sparkline charts to the Favourites list, showing a ~1-hour price trend for each item.",
      "Added a setting in 'Chart & Display Settings' to toggle the visibility of sparkline charts in the Favourites list (requires consent).",
      "Favourite items' data (prices, hourly changes, sparklines) now automatically refreshes when the main selected item's price chart data is refreshed.",
      "Improved sparkline display: Shows 'No 1hr Chart' instead of 'N/A' when 1-hour data is insufficient.",
    ],
    notes: "This update focuses on streamlining user workflows, enhancing data visibility in the favourites section, and providing more UI customisation options."
  },
  {
    version: "Beta v0.05",
    date: "2025-06-04",
    changes: [
      "Added application version number (Beta v0.05) to the footer.",
      "Removed the 'data refreshed' notification when selecting an item to view its details.",
      "Removed the 'Refreshing all favourite item data...' notification when refreshing all favourite items.",
      "Introduced this changelog viewer, accessible from the Settings panel.",
    ],
    notes: "This version focuses on refining user notifications, establishing application versioning, and providing a way to view updates via this changelog."
  },
];
