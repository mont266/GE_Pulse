
import { ChangelogEntry } from './types';

// Entries should be in reverse chronological order (newest first)
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "Beta v0.07",
    date: "2024-08-01", // Placeholder: Adjust to actual date
    changes: [
      "Added 'Top Market Movers' section: View top 5 item price/volume winners & losers (1h/24h). Section is collapsible and in the sidebar.",
      "Enhanced 'Top Market Movers' with a 'Fast Scan' (top 50 actively traded items >100GP) vs. 'Full Scan' (all items >100GP) toggle, directly in the section. This setting is session-only and defaults to Fast Scan.",
      "Added a 'Price %' vs. 'Volume %' toggle to 'Top Market Movers', allowing ranking by either price fluctuation or trade volume change. This setting is session-only and defaults to Price %.",
      "Top Movers data can be manually refreshed. Item names are clickable, loading the item in the main display with synced timespan.",
      "Loading, error, and empty states are handled for the Movers section. Descriptive note dynamically reflects current scan mode and metric.",
      "Sidebar sections (Search, Favorites, Alerts, Top Movers) can now be re-ordered via drag and drop. This preference is saved if consent is granted.",
      "Drag and drop reordering for sidebar sections is disabled by default and can be toggled via a header icon.",
      "Implemented shareable links: Users can copy a direct link to an item's view from the item display header. Opening this link loads the specific item.",
      "Added icons to section headers (Search, Favorites, Top Movers, Alerts) for improved visual navigation.",
      "Improved consistency of price fluctuation percentages between 'Top Market Movers' and the main 'Item Display' by aligning historical data reference points.",
      "Updated type definitions for API responses and new feature data.",
    ],
    notes: "This update introduces market trend analysis with customizable scan modes (Fast/Full) and metric types (Price/Volume), shareable item views, and a customizable sidebar layout. UI enhancements include section icons and improved data consistency between movers and item views."
  },
  {
    version: "Beta v0.06",
    date: "2024-07-30", 
    changes: [
      "Updated application version to Beta v0.06.",
      "Enhanced Price Alert Creation: Users can now set a price alert directly from an item's detailed view using a new dedicated popup modal. This replaces the previous behavior of scrolling to and pre-filling the main alert form.",
      "Introduced 'Quick Actions' for faster interactions:",
      "  - Search Results: Added a heart icon next to each item, allowing for instant adding or removing from favorites without navigating away.",
      "  - Favorites List: Added a bell icon next to each favorited item to quickly open the 'Set Alert' modal for that item.",
      "  - Note: Quick actions (including favorite/alert icons in main item display) are only available if the user has consented to preference storage.",
      "Refactored UI icons into a shared `components/Icons.tsx` module for better maintainability and consistency.",
      "Sidebar sections (Search, Favorites, Alerts) are now collapsible to allow users to customize their view.",
      "Added mini sparkline charts to the Favorites list, showing a ~1-hour price trend for each item.",
      "Added a setting in 'Chart & Display Settings' to toggle the visibility of sparkline charts in the Favorites list (requires consent).",
      "Favorite items' data (prices, hourly changes, sparklines) now automatically refreshes when the main selected item's price chart data is refreshed.",
      "Improved sparkline display: Shows 'No 1hr Chart' instead of 'N/A' when 1-hour data is insufficient.",
    ],
    notes: "This update focuses on streamlining user workflows, enhancing data visibility in the favorites section, and providing more UI customization options."
  },
  {
    version: "Beta v0.05",
    date: "2024-07-29",
    changes: [
      "Added application version number (Beta v0.05) to the footer.",
      "Removed the 'data refreshed' notification when selecting an item to view its details.",
      "Removed the 'Refreshing all favorite item data...' notification when refreshing all favorite items.",
      "Introduced this changelog viewer, accessible from the Settings panel.",
    ],
    notes: "This version focuses on refining user notifications, establishing application versioning, and providing a way to view updates via this changelog."
  },
];
