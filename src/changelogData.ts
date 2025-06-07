
import { ChangelogEntry } from './types';

// Entries should be in reverse chronological order (newest first)
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "Beta v0.07",
    date: "2024-08-01", // Placeholder: Adjust to actual date
    changes: [
      "Added 'Top Market Movers' section: Users can now see the top 5 item price winners and losers over the last 1 hour or 24 hours.",
      "The Top Movers section is collapsible and located in the left sidebar.",
      "Data for Top Movers is calculated based on the 50 most actively traded items to manage API usage.",
      "Movers data can be manually refreshed.",
      "Item names in the Top Movers list are clickable, loading the item in the main display.",
      "Appropriate loading, error, and empty states are handled for the Movers section.",
      "Added a note in the Movers section about how data is derived.",
      "Sidebar sections (Search, Favorites, Alerts, Top Movers) can now be re-ordered via drag and drop. This preference is saved if consent is granted.",
      "Drag and drop reordering for sidebar sections is disabled by default and can be toggled via a new header icon.",
      "Implemented shareable links: Users can now copy a direct link to an item's view from the item display header. Opening this link loads the specific item's chart and details.",
      "Updated type definitions for API responses and new feature data.",
    ],
    notes: "This update introduces market trend analysis, shareable item views, and customizable sidebar layout. Due to API limitations, mover calculations are based on a subset of actively traded items."
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
