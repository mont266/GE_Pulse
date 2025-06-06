
import React, { useEffect } from 'react';
import { AppTheme, WordingPreference } from '../types';
// ChangelogModal and changelogEntries imports removed

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showChartGrid: boolean;
  onToggleChartGrid: () => void;
  showChartLineGlow: boolean;
  onToggleChartLineGlow: () => void;
  showVolumeChart: boolean;
  onToggleShowVolumeChart: () => void;
  showFavoriteSparklines: boolean;
  onToggleFavoriteSparklines: () => void;
  activeThemeName: string;
  onSetThemeName: (themeName: string) => void;
  themes: AppTheme[];
  enableDesktopNotifications: boolean;
  onToggleDesktopNotifications: () => void;
  desktopNotificationPermission: NotificationPermission;
  wordingPreference: WordingPreference;
  onSetWordingPreference: (preference: WordingPreference) => void;
  consentStatus: 'pending' | 'granted' | 'denied';
  onGrantConsent: () => void;
  onRevokeConsent: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  showChartGrid,
  onToggleChartGrid,
  showChartLineGlow,
  onToggleChartLineGlow,
  showVolumeChart,
  onToggleShowVolumeChart,
  showFavoriteSparklines,
  onToggleFavoriteSparklines,
  activeThemeName,
  onSetThemeName,
  themes,
  enableDesktopNotifications,
  onToggleDesktopNotifications,
  desktopNotificationPermission,
  wordingPreference,
  onSetWordingPreference,
  consentStatus,
  onGrantConsent,
  onRevokeConsent,
}) => {
  // isChangelogModalOpen state removed

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Logic for closing changelog modal removed
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]); // isChangelogModalOpen dependency removed

  if (!isOpen) {
    return null;
  }

  const isNotificationToggleDisabled = desktopNotificationPermission === 'denied';

  return (
    <> {/* Fragment kept in case other top-level modals are added here in future, though unlikely for settings */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div 
          className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)] max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 id="settings-modal-title" className="text-2xl font-semibold text-[var(--text-accent)]">Settings</h2>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
              aria-label="Close settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">Privacy & Preferences</h3>
              <div className="p-3 bg-[var(--bg-input-secondary)] rounded-md space-y-3">
                {consentStatus === 'granted' ? (
                  <>
                    <p className="text-sm text-[var(--text-primary)]">
                      Preference storage is currently <span className="font-semibold text-[var(--price-high)]">enabled</span>.
                      Your choices for theme, favorites, alerts, etc., are saved in your browser.
                    </p>
                    <button
                      onClick={() => {
                        onRevokeConsent();
                      }}
                      className="w-full bg-[var(--error-bg)] hover:bg-[var(--error-bg)]/80 text-[var(--error-text)] font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--error-text)]/50"
                    >
                      Clear Preferences & Stop Saving
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-primary)]">
                      Preference storage is currently <span className="font-semibold text-[var(--price-low)]">disabled</span>.
                      Your choices will not be saved between sessions.
                    </p>
                    <button
                      onClick={() => {
                        onGrantConsent();
                      }}
                      className="w-full bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                    >
                      Allow Saving Preferences
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {consentStatus === 'granted' && (
              <>
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">Chart & Display Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-input-secondary)] rounded-md">
                      <span className="text-[var(--text-primary)]">Show Chart Grid</span>
                      <label htmlFor="chartGridToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            id="chartGridToggle" 
                            className="sr-only" 
                            checked={showChartGrid} 
                            onChange={onToggleChartGrid}
                          />
                          <div className={`block w-12 h-6 rounded-full transition-colors bg-[${showChartGrid ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                          <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${showChartGrid ? 'translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-input-secondary)] rounded-md">
                      <span className="text-[var(--text-primary)]">Show Chart Line Glow</span>
                      <label htmlFor="chartLineGlowToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            id="chartLineGlowToggle" 
                            className="sr-only" 
                            checked={showChartLineGlow} 
                            onChange={onToggleChartLineGlow}
                          />
                          <div className={`block w-12 h-6 rounded-full transition-colors bg-[${showChartLineGlow ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                          <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${showChartLineGlow ? 'translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-input-secondary)] rounded-md">
                      <span className="text-[var(--text-primary)]">Show Volume Chart</span>
                      <label htmlFor="volumeChartToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            id="volumeChartToggle" 
                            className="sr-only" 
                            checked={showVolumeChart} 
                            onChange={onToggleShowVolumeChart}
                          />
                          <div className={`block w-12 h-6 rounded-full transition-colors bg-[${showVolumeChart ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                          <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${showVolumeChart ? 'translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                     <div className="flex items-center justify-between p-3 bg-[var(--bg-input-secondary)] rounded-md">
                      <span className="text-[var(--text-primary)]">Show Favorite Sparklines</span>
                      <label htmlFor="favoriteSparklinesToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            id="favoriteSparklinesToggle" 
                            className="sr-only" 
                            checked={showFavoriteSparklines} 
                            onChange={onToggleFavoriteSparklines}
                          />
                          <div className={`block w-12 h-6 rounded-full transition-colors bg-[${showFavoriteSparklines ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                          <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${showFavoriteSparklines ? 'translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">Notification Settings</h3>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3 bg-[var(--bg-input-secondary)] rounded-md ${isNotificationToggleDisabled ? 'opacity-70' : ''}`}>
                      <span className="text-[var(--text-primary)]">Desktop Alert Notifications</span>
                      <label htmlFor="desktopNotificationToggle" className={`flex items-center ${isNotificationToggleDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            id="desktopNotificationToggle" 
                            className="sr-only" 
                            checked={enableDesktopNotifications} 
                            onChange={onToggleDesktopNotifications}
                            disabled={isNotificationToggleDisabled}
                          />
                          <div className={`block w-12 h-6 rounded-full transition-colors bg-[${enableDesktopNotifications && !isNotificationToggleDisabled ? 'var(--toggle-active-bg)' : 'var(--toggle-inactive-bg)'}]`}></div>
                          <div className={`dot absolute left-1 top-1 bg-[var(--toggle-handle)] w-4 h-4 rounded-full transition-transform ${enableDesktopNotifications && !isNotificationToggleDisabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                    {isNotificationToggleDisabled && (
                      <p className="text-xs text-[var(--text-muted)] px-1">
                        Notifications are blocked by your browser. Please enable them in your browser/OS settings and refresh the page.
                      </p>
                    )}
                    {desktopNotificationPermission === 'default' && !enableDesktopNotifications && (
                      <p className="text-xs text-[var(--text-muted)] px-1">
                        Click the toggle to request notification permission from your browser.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-3">Wording Style</h3>
                  <div className="flex space-x-3 p-3 bg-[var(--bg-input-secondary)] rounded-md">
                    {(['uk', 'us'] as WordingPreference[]).map(pref => (
                      <label key={pref} className="flex items-center space-x-2 cursor-pointer text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name="wordingPreference"
                          value={pref}
                          checked={wordingPreference === pref}
                          onChange={() => onSetWordingPreference(pref)}
                          className="form-radio h-4 w-4 text-[var(--bg-interactive)] bg-[var(--bg-input)] border-[var(--border-secondary)] focus:ring-[var(--border-accent)]"
                        />
                        <span>{pref === 'uk' ? 'UK English' : 'US English'}</span>
                      </label>
                    ))}
                  </div>
                </div>


                <div>
                  <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-3">Theme Selection</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {themes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => onSetThemeName(theme.id)}
                        className={`w-full p-3 rounded-md border-2 transition-all
                          ${activeThemeName === theme.id 
                            ? 'border-[var(--border-accent)] bg-[var(--bg-interactive)] text-[var(--text-on-interactive)] shadow-lg ring-2 ring-[var(--border-accent)] ring-offset-2 ring-offset-[var(--bg-modal)]' 
                            : 'border-[var(--border-secondary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-input-secondary)]'
                          }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* "About" section with Changelog button removed from here */}
            
            <div className="text-center text-[var(--text-muted)] pt-4">
              <p className="italic">Thank you for using GE Pulse!</p>
            </div>
          </div>

        </div>
      </div>
      {/* ChangelogModal rendering removed from here */}
    </>
  );
};