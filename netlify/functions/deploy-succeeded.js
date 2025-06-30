// netlify/functions/deploy-succeeded.js

const fetch = require('node-fetch');
const { execSync } = require('child_process');

// The changelogEntries array is now defined directly in this file
// to avoid issues with module resolution during Netlify's function bundling.
const changelogEntries = [
  {
    version: "Beta v0.15",
    date: "2025-06-28",
    changes: [
      "Added a global keyboard shortcut (Cmd/Ctrl + K) to open and focus the main item search bar from anywhere in the app.",
      "The portfolio performance chart is now displayed in a full-screen view on mobile devices to improve readability and user experience.",
      "Enhanced portfolio import/export to include the user's RuneScape Name (RSN), ensuring it's saved and restored along with investment data.",
      "Extended the 'Chart Line Glow' setting to the Portfolio Performance chart, applying the effect to both the 'Total Profit' and 'Realized P/L' lines when enabled.",
      "Added 'Estimated Profit' to the item sale modal, showing the potential net profit after GE tax and item cost.",
      "Added 'Break-Even Price' to the Open Positions table and the item sale modal, indicating the minimum sale price needed to avoid a loss after tax.",
    ],
    notes: "This update enhances the Portfolio Tracker with more detailed financial insights and improves app-wide usability by introducing a global search shortcut (Cmd/Ctrl + K)."
  },
  {
    version: "Beta v0.14",
    date: "2025-06-27",
    changes: [
      "Hyperlinked item images on the main item display to their corresponding Old School RuneScape Wiki pages, opening in a new tab.",
      "Added a 'Reset Section Heights' button for desktop users, conveniently located above the sidebar sections. The button appears only when section heights have been customized.",
      "Added visual feedback for chart loading. The price chart now dims and displays a loading spinner while new data is being fetched for a different timespan, providing a smoother user experience.",
      "Added sortable columns to the portfolio tables. Users can now click on headers for 'Open' and 'Closed' positions to sort by P/L, date, name, and other metrics.",
      "Enhanced empty state displays: Added large, contextual background icons to the Favorites List, Portfolio tables, and main Item Display area for a more polished UI when no content is present.",
      "Integrated fuzzy search (`fuse.js`) into the main item search bar to provide more forgiving and relevant search results, correcting for typos and partial matches.",
      "Added a 'New' indicator for updates. It appears on the changelog button in the footer and on the latest changelog entry when a new version is released. The indicator is cleared after the user views the changelog.",
      "Added 'Top Trade' to Portfolio Snapshot: Displays the item name (clickable) and net profit of the user's most profitable closed trade.",
      "Refined UI for 'Top Trade' in Portfolio Snapshot: Item name is now white by default, blue on hover/focus, and without underline on hover, matching app-wide link styling.",
      "Added RuneScape Name (RSN) input to Portfolio Snapshot, allowing users to personalize the snapshot title (e.g., 'YourUsername's Snapshot'). RSN is saved to local preferences if consent is granted.",
      "The 'Your Snapshot' title in the Portfolio modal is now positioned further to the left of its section for improved layout.",
      "Implemented lazy loading for images to get faster initial load times for the site.",
      "iOS compatiability update",
    ],
    notes: "This major update focuses on widespread UI/UX enhancements and critical compatibility fixes. Key features include a more intelligent fuzzy search, sortable portfolio tables, and improved visual feedback across the app. The portfolio snapshot is enhanced with a 'Top Trade' view and RSN personalization. Importantly, this release also includes crucial updates to ensure compatibility with iOS devices."
  },
  {
    version: "Beta v0.13",
    date: "2025-06-25", 
    changes: [
      "Added resizable sidebar sections for desktop users. Section heights can now be adjusted by dragging a handle and are saved to local preferences if consent is granted.",
      "Improved in-app alert sound: Changed from a simple beep to a more distinct 'ding' or 'chime-like' sound for better notification recognition.",
      "Added toggleable in-app sound notifications for triggered price alerts (enabled by default). A short beep will play when an alert condition is met if the setting is active.",
      "Reordered fields in Price Alert modals: 'Condition' (above/below) now appears before 'Target Price' for a more intuitive user flow.",
      "Added in-modal text confirmations for Google Drive save and load operations. Success messages are green, failures are red, and informational messages (like dev mode active) are displayed directly in the save/load modals.",
      "Optimized Favorite Item Loading: Significantly improved the loading speed and reliability of favorite items. Data for all favorited items (latest price, hourly change, and sparkline) is now fetched in parallel. This makes the initial display and refreshes much faster and more resilient to individual item data fetching errors, preventing the entire list from stalling due to a single problematic item.",
      "Updated the 'Share' icon in the Item Display header to a more universally recognized network/connection symbol for better clarity on its link-sharing functionality.",
    ],
    notes: "Focus for this version includes enhanced alert notifications (sound and UI), UI/UX refinements, performance enhancements, and improved layout flexibility for desktop users."
  },
  {
    version: "Beta v0.12",
    date: "2025-06-23", 
    changes: [
      "Enhanced Changelog: Changelog entries are now collapsible, with the latest update expanded by default for a cleaner view.",
      "Added Portfolio Performance chart: Visualizes total portfolio profit and cumulative realized P/L over time. Includes selectable timespans (1M, 3M, 6M, 1Y, ALL) and a toggle for the realized P/L line.",
      "Redesigned Google Drive integration buttons in the Portfolio modal for a cleaner UI: Uses a dropdown for Save/Load actions when signed in, and a separate Sign Out icon button.",
      "Fixed visibility of local Import/Export/Clear All buttons in Portfolio modal, ensuring they are available when consent is granted, independent of Google Drive status."
    ],
    notes: "Key updates include the portfolio performance chart, a revamped Google Drive UI in the portfolio section, important visibility fixes for local portfolio actions, and an improved changelog display."
  },
  {
    version: "Beta v0.11",
    date: "2025-06-23", 
    changes: [
      "Re-implemented Google Drive integration for portfolio backup & restore, resolving previous deployment issues. Users can now connect their Google Drive to save and load their portfolio data.",
      "Portfolio items are now clickable. Clicking an item in the Portfolio modal will close the modal and display the item's chart and details in the main view.",
      "Added a human verification field (simple math question) to the feedback form to help reduce spam submissions.",
      "Initial setup for version 0.11.",
      "Prepared application for new feature development and enhancements under v0.11."
    ],
    notes: "This update focuses on enhancing Google Drive integration and user experience improvements in portfolio management."
  },
  {
    version: "Beta v0.10",
    date: "2025-06-12", 
    changes: [
      "Fixed text overflow for long item names in 'Top Market Movers' section by allowing up to two lines with an ellipsis, improving desktop display.",
      "Removed info notifications when using 'Limit' (quantity) and 'Current' (price) helper buttons in portfolio investment forms to reduce UI clutter. Input fields updating provide sufficient feedback.",
      "Added portfolio editing: Users can now modify the original purchase quantity, price, and date for investment lots.",
      "Implemented portfolio import/export: Users can back up their portfolio as a downloadable JSON file or a copyable Base64 encoded code, and restore it using either method. Includes custom confirmation modals for overwrite actions.",
      "Improved copy-to-clipboard confirmation for portfolio export code: An inline message with an icon now appears next to the 'Copy Code' button for clear feedback.",
      "Added 'Quick Access' section to Settings for easier mobile navigation (e.g., section reordering toggle).",
      "Initial setup for version 0.10.",
    ],
    notes: "This version significantly enhances portfolio management with editing, robust import/export capabilities, and improved UI feedback. It also refines the user experience by reducing notification clutter in portfolio forms and fixing text display issues."
  },
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


const CHANGELOG_FILE_PATH = 'src/changelogData.ts';

exports.handler = async (event) => {
  // 1. Get the secret webhook URL from Netlify's environment variables
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Discord Webhook URL not found. Please set DISCORD_WEBHOOK_URL in Netlify's environment variables.");
    return {
      statusCode: 400,
      body: 'Discord Webhook URL not configured.',
    };
  }
  
  // 2. Check if the changelog file was actually updated in this deploy
  const currentCommit = process.env.COMMIT_REF;
  const prevCommit = process.env.CACHED_COMMIT_REF;

  // Only check for changes if we have both commit references, and they are different.
  // The first deploy won't have a prevCommit, so we'll post.
  if (currentCommit && prevCommit && currentCommit !== prevCommit) {
    try {
      console.log(`Checking for changes between commits ${prevCommit.slice(0, 7)} and ${currentCommit.slice(0, 7)}...`);
      // Use git to get a list of changed files between the last successful deploy and this one.
      const changedFilesOutput = execSync(`git diff --name-only ${prevCommit} ${currentCommit}`).toString();
      const changedFiles = changedFilesOutput.split('\n');

      console.log('Files changed in this deploy:', changedFiles);

      // If our specific changelog file is NOT in the list of changes, exit successfully.
      if (!changedFiles.includes(CHANGELOG_FILE_PATH)) {
        console.log(`Changelog file '${CHANGELOG_FILE_PATH}' was not updated. Skipping Discord notification.`);
        return {
          statusCode: 200,
          body: 'Changelog not updated, notification skipped.',
        };
      }
      console.log(`Changelog file '${CHANGELOG_FILE_PATH}' was updated. Proceeding with notification.`);
    } catch (gitError) {
      // This might happen in certain local dev environments or if git isn't available.
      // In a real Netlify build environment, this should succeed. We'll log a warning and proceed.
      console.warn("Could not execute git diff. Proceeding with notification as a fallback.", gitError);
    }
  } else {
     console.log("No previous commit reference found, or commits are the same. This is likely the first deploy. Proceeding with notification.");
  }

  // 3. Get the most recent changelog entry
  if (!changelogEntries || changelogEntries.length === 0) {
    console.log("No changelog entries found. Skipping Discord notification.");
    return {
      statusCode: 200,
      body: 'No changelog entries, no notification sent.',
    };
  }
  const latestEntry = changelogEntries[0];

  // 4. Format the data into a beautiful Discord Embed
  const discordPayload = {
    content: `🚀 **A new update for GE Pulse has just been deployed!**`,
    embeds: [
      {
        title: `Release: ${latestEntry.version}`,
        description: latestEntry.notes || 'Here are the latest changes.',
        color: 3447003, // A nice blue color
        fields: [
          {
            name: 'Changes',
            value: latestEntry.changes.map(change => `- ${change}`).join('\n'),
          },
        ],
        footer: {
          text: `GE Pulse | Deployed on ${new Date(latestEntry.date).toDateString()}`,
        },
        url: 'https://beta.gepulse.net/', // Link the title to your site
      },
    ],
  };

  // 5. Send the POST request to the Discord Webhook URL
  try {
    console.log(`Sending changelog for version ${latestEntry.version} to Discord...`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Discord webhook failed with status ${response.status}:`, errorBody);
      return {
        statusCode: response.status,
        body: `Error sending to Discord: ${errorBody}`,
      };
    }

    console.log("Successfully sent changelog to Discord.");
    return {
      statusCode: 200,
      body: 'Changelog notification sent successfully!',
    };
  } catch (error) {
    console.error('Error executing Discord webhook:', error);
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`,
    };
  }
};