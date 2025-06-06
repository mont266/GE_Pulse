import { ChangelogEntry } from './types';

// Entries should be in reverse chronological order (newest first)
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "Beta v0.06",
    date: "2024-07-30", // Placeholder date, adjust as needed
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
    date: "2024-07-29", // Date this version's changes were implemented
    changes: [
      "Added application version number (Beta v0.05) to the footer.",
      "Removed the 'data refreshed' notification when selecting an item to view its details.",
      "Removed the 'Refreshing all favorite item data...' notification when refreshing all favorite items.",
      "Introduced this changelog viewer, accessible from the Settings panel.",
    ],
    notes: "This version focuses on refining user notifications, establishing application versioning, and providing a way to view updates via this changelog."
  },
  // {
  //   version: "Beta v0.04",
  //   date: "2024-07-25",
  //   changes: [
  //     "Initial feature set implemented.",
  //     "Price tracking and historical data charts added.",
  //   ],
  // },
  // Future entries will be added above this line.
];