
import React, { useState, useEffect } from 'react';
import { PriceAlert, ItemMapInfo } from '../types';
import { PriceAlertForm } from './PriceAlertForm';
import { PriceAlertList } from './PriceAlertList';
import { ChevronDownIcon } from './Icons'; 

interface AlertsManagerProps {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => void;
  allItems: ItemMapInfo[];
  getItemName: (itemId: number) => string;
  getItemIconUrl: (iconName: string) => string;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSelectAlertItemById: (itemId: number) => void;
  isConsentGranted: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = (props) => {
  const { 
    isCollapsed, 
    onToggleCollapse, 
    alerts, 
    addAlert: propAddAlert,
    removeAlert: propRemoveAlert,
    updateAlert: propUpdateAlert,
    allItems,
    getItemName,
    getItemIconUrl,
    addNotification,
    onSelectAlertItemById,
    isConsentGranted
  } = props;
  
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    if (editingAlert && isCollapsed) {
      onToggleCollapse(); // Expand if an alert is being edited and section is collapsed
    }
  }, [editingAlert, isCollapsed, onToggleCollapse]);

  const handleStartEditAlertInternal = (alert: PriceAlert) => {
    setEditingAlert(alert);
    if (isCollapsed) { 
        onToggleCollapse(); // Expand if collapsed when starting edit
    }
    // Scroll into view logic, might need adjustment after expand animation
    setTimeout(() => {
        const alertsManagerElement = document.getElementById('alerts-manager-section');
        if (alertsManagerElement) {
            const elementRect = alertsManagerElement.getBoundingClientRect();
            // Check if the top of the element is out of viewport or if a significant portion is cut off.
            // A small threshold (e.g., 20px) can be added to ensure the header is fully visible.
            const threshold = 20; 
            if (elementRect.top < threshold || elementRect.bottom > window.innerHeight) {
                alertsManagerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, 150); // Increased delay for collapse/expand to settle and potential layout shifts
  };

  const handleCancelEdit = () => {
    setEditingAlert(null);
  };

  const handleUpdateAlertInternal = (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => {
    propUpdateAlert(alertId, updatedValues);
    setEditingAlert(null); 
    addNotification('Alert updated successfully!', 'success');
  };


  return (
    <div id="alerts-manager-section" className="bg-[var(--bg-secondary)] rounded-lg shadow-xl scroll-mt-20">
      <button
        onClick={onToggleCollapse}
        className={`w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] transition-colors
         ${!isCollapsed ? 'rounded-t-lg hover:bg-[var(--bg-tertiary)]/70' : 'rounded-lg hover:bg-[var(--bg-tertiary)]/50'}`}
        aria-expanded={!isCollapsed}
        aria-controls="alerts-section-content"
      >
        <h2 className="text-2xl font-semibold text-[var(--text-accent)]">
          {editingAlert ? 'Edit Price Alert' : 'Manage Price Alerts'}
        </h2>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div id="alerts-section-content" className="p-4 md:p-6 rounded-b-lg space-y-6">
          {(!isConsentGranted && alerts.length === 0 && !editingAlert) ? (
             <p className="text-[var(--text-secondary)] text-center py-4">
                Enable preference storage in settings to use Price Alerts.
            </p>
          ) : (
            <>
              <PriceAlertForm 
                allItems={allItems} 
                onAddAlert={propAddAlert}
                addNotification={addNotification}
                editingAlert={editingAlert}
                onUpdateAlert={handleUpdateAlertInternal}
                onCancelEdit={handleCancelEdit}
                isConsentGranted={isConsentGranted}
              />
              {!editingAlert && (
                <PriceAlertList 
                  alerts={alerts} 
                  onRemoveAlert={propRemoveAlert} 
                  getItemName={getItemName} 
                  getItemIconUrl={getItemIconUrl}
                  onSelectAlertItem={onSelectAlertItemById}
                  onStartEdit={handleStartEditAlertInternal}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};