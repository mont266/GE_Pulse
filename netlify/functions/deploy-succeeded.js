// netlify/functions/deploy-succeeded.js

const fetch = require('node-fetch');
const { execSync } = require('child_process');

// ts-node is needed to execute the TypeScript file and get the data.
// It should be listed in package.json devDependencies.
require('ts-node').register();
const { changelogEntries } = require('../../src/changelogData.ts');

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
