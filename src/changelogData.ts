import { ChangelogEntry } from './types';

// Entries should be in reverse chronological order (newest first)
export const changelogEntries: ChangelogEntry[] = [
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
