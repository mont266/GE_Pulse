
import React from 'react';

export const PrivacyPolicyContent: React.FC = () => {
  const effectiveDate = "June 23, 2025"; // Update as needed

  return (
    <div className="space-y-4 text-[var(--text-primary)]">
      <p className="text-xs text-[var(--text-muted)]">Effective Date: {effectiveDate}</p>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">1. Introduction</h3>
        <p>
          Welcome to GE Pulse ("we," "us," or "our"). We are committed to protecting your privacy. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
          when you use our web application, GE Pulse. Please read this privacy policy carefully. 
          If you do not agree with the terms of this privacy policy, please do not access the application.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">2. Information We Collect</h3>
        <p>We may collect information about you in a variety of ways:</p>
        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
          <li>
            <strong>Data from Old School RuneScape Wiki:</strong> We fetch item data, including names, icons, 
            and price history, from the publicly available prices.runescape.wiki API. This data is not personal information.
          </li>
          <li>
            <strong>Preferences Stored Locally (with your consent):</strong> If you grant consent, we store certain 
            preferences in your browser's Local Storage to enhance your experience. This includes:
            <ul className="list-circle list-inside space-y-0.5 pl-6 text-xs">
              <li>Your consent status regarding preference storage.</li>
              <li>Selected application theme (e.g., "GE Pulse Dark", "Rune Light").</li>
              <li>List of your favourited items (item IDs).</li>
              <li>Configurations for any price alerts you set (item ID, target price, condition).</li>
              <li>Chart display settings: visibility of the chart grid, line glow effect, and volume chart.</li>
              <li>Visibility of mini sparkline charts in your favourites list.</li>
              <li>Preference for enabling or disabling desktop notifications for price alerts.</li>
              <li>Your preferred wording style (e.g., UK/US English for terms like "favourite").</li>
              <li>Custom order of sidebar sections (Search, Favourites, Top Movers, Alerts).</li>
              <li>Status of whether drag & drop reordering for sidebar sections is enabled.</li>
              <li>Portfolio data: If you use the Portfolio feature, all your investment entries (item ID, quantity, purchase price, purchase date, sales data) are stored locally.</li>
            </ul>
            This data is stored directly in your browser and is not transmitted to our servers.
          </li>
          <li>
            <strong>Google Drive Integration (with your consent and Google Sign-In):</strong>
            <ul className="list-circle list-inside space-y-0.5 pl-6 text-xs">
              <li>
                Authentication: When you choose to use Google Drive for portfolio backup, you authenticate directly with Google. 
                GE Pulse does not see or store your Google password.
              </li>
              <li>
                Access Tokens: We handle Google access tokens (temporarily stored in your browser's session storage) to interact with the Google Drive API on your behalf. These tokens are specific to GE Pulse and are used only for the Google Drive features you initiate.
              </li>
              <li>
                Portfolio Data: If you save your portfolio to Google Drive, the `gepulse_portfolio.json` file is stored in *your* Google Drive account, under your control. GE Pulse does not store this file on its own servers. We only facilitate the upload and download at your explicit request.
              </li>
              <li>
                Basic Profile Information: If you sign in with Google, we may receive basic profile information (such as your email address and name, if provided by Google) which is displayed in the application for your reference during your session. This information is not persistently stored by GE Pulse beyond your active session.
              </li>
            </ul>
          </li>
          <li>
            <strong>Feedback (if you choose to submit it):</strong> If you use the feedback form, we collect the type of feedback (feature request, bug report, general), your message, and your answer to the human verification question (e.g., "What is 2 + 3?"). This information is processed by Netlify Forms.
          </li>
          <li>
            <strong>Usage Data (Analytics - with your consent):</strong> If you grant consent, we use Google Analytics to collect anonymised information about how you interact with GE Pulse, such as features used and pages visited. This helps us understand usage patterns and improve the application. This data is aggregated and does not personally identify you.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">3. How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
          <li>Provide, operate, and maintain the GE Pulse application.</li>
          <li>Personalise your experience based on your saved preferences.</li>
          <li>Enable features such as price alerts, favourites, portfolio tracking, and custom UI layouts.</li>
          <li>Facilitate the backup and restoration of your portfolio data to/from your Google Drive, at your direction.</li>
          <li>Process and respond to your feedback and support requests.</li>
          <li>Monitor and analyse usage and trends (with consent for analytics) to improve the application's functionality and user experience.</li>
        </ul>
      </section>
      
      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">4. Data Storage and Security</h3>
         <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
            <li>
              <strong>Local Preferences & Portfolio:</strong> Data stored using Local Storage resides directly in your browser. You have control over this data and can clear it through your browser settings or by using the "Clear Preferences & Stop Saving" option within the GE Pulse settings.
            </li>
            <li>
              <strong>Google Drive Data:</strong> When you use the Google Drive integration, your portfolio file (`gepulse_portfolio.json`) is stored in your personal Google Drive account. Its security and privacy are subject to Google's policies and your Google account settings. GE Pulse uses Google's standard APIs and OAuth 2.0 for secure authentication and data transfer. Access tokens for Google Drive are stored temporarily in your browser's session storage and are cleared when you sign out or your session ends.
            </li>
             <li>
              <strong>Feedback Data:</strong> Feedback submitted through our form is handled by Netlify and is subject to Netlify's data handling policies.
            </li>
            <li>
              <strong>General Security:</strong> GE Pulse is a client-side application. We do not operate our own servers for storing your personal preferences, portfolio data, or Google Drive access tokens (beyond your browser's session). We rely on the security measures of your browser and the third-party services we integrate with (Google, Netlify).
            </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">5. Sharing Your Information</h3>
        <p>We do not sell your personal information.</p>
        <p>We only share information with third-party services as necessary to provide GE Pulse features and as described below:</p>
        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
          <li>
            <strong>Google:</strong> For Google Drive integration (authentication, file storage/retrieval in your Drive) and, with your consent, Google Analytics (anonymised usage data). Google's use of your information is governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--link-text)] hover:text-[var(--link-text-hover)]">Google's Privacy Policy</a>.
          </li>
          <li>
            <strong>Netlify:</strong> For processing feedback submissions via Netlify Forms. Netlify's use of your information is governed by <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-[var(--link-text)] hover:text-[var(--link-text-hover)]">Netlify's Privacy Policy</a>.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">6. Your Rights and Choices</h3>
        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
          <li>
            <strong>Consent Management:</strong> You can grant or revoke consent for storing preferences and using features like Portfolio, Google Drive backup, and Google Analytics at any time via the Settings panel in GE Pulse. Revoking consent will clear locally stored data related to these preferences and disable associated features.
          </li>
          <li>
            <strong>Google Drive Access:</strong> You can manage GE Pulse's access to your Google Drive account through your Google Account security settings page.
          </li>
          <li>
            <strong>Google Analytics Opt-out:</strong> Even if you initially consent, you can effectively opt-out of Google Analytics by revoking consent in the settings panel, which will stop future tracking. For broader opt-out, consider browser add-ons provided by Google or adjusting your browser settings.
          </li>
          <li>
            <strong>Feedback:</strong> Submitting feedback is entirely optional.
          </li>
           <li>
            <strong>Accessing and Deleting Local Data:</strong> You can clear all locally stored data by using the "Clear Preferences & Stop Saving" option in GE Pulse settings or by clearing your browser's Local Storage for this site.
          </li>
        </ul>
      </section>
      
      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">7. Third-Party Services</h3>
        <p>GE Pulse utilises the following third-party services:</p>
        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
          <li><strong>RuneScape Wiki API:</strong> For fetching Old School RuneScape item and price data.</li>
          <li><strong>Google (Google Identity Services, Google Drive API, Google Analytics):</strong> For authentication, cloud backup, and usage analytics (with consent).</li>
          <li><strong>Netlify (Netlify Forms):</strong> For handling feedback submissions.</li>
        </ul>
        <p>The use of information by these third-party services is governed by their respective privacy policies, which we encourage you to review.</p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">8. Children's Privacy</h3>
        <p>
          GE Pulse is not intended for use by children under the age of 13 (or the equivalent minimum age in your jurisdiction). 
          We do not knowingly collect personal information from children. If we become aware that we have collected 
          personal information from a child without verification of parental consent, we will take steps to remove that information.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">9. Changes to This Privacy Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting 
          the new Privacy Policy within the application (e.g., via an in-app notification or by updating the changelog) 
          and updating the "Effective Date" at the top of this policy. You are advised to review this Privacy Policy 
          periodically for any changes. Your continued use of GE Pulse after such modifications will constitute your: 
          (a) acknowledgement of the modified Privacy Policy; and (b) agreement to abide and be bound by that Policy.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--text-accent)] mb-2">10. Contact Us</h3>
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us 
          by using the "Request Feature / Report Bug" option available in the GE Pulse application footer.
        </p>
      </section>
    </div>
  );
};
