
import React, { useState, useEffect } from 'react';
import { PriceAlert, ItemMapInfo, SectionRenderProps } from '../src/types'; // Corrected path
import { PriceAlertForm } from './PriceAlertForm';
import { PriceAlertList } from './PriceAlertList';
import { ChevronDownIcon, BellIcon } from './Icons'; 

interface AlertsManagerProps extends SectionRenderProps { 
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
    isConsentGranted,
    sectionId,
    isDragAndDropEnabled,
    handleDragStart,
    draggedItem,
    currentHeight, 
    isResizable, 
    onResizeMouseDown,
  } = props;
  
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    if (editingAlert && isCollapsed) {
      onToggleCollapse(); 
    }
  }, [editingAlert, isCollapsed, onToggleCollapse]);

  const handleStartEditAlertInternal = (alert: PriceAlert) => {
    setEditingAlert(alert);
    if (isCollapsed) { 
        onToggleCollapse(); 
    }
    setTimeout(() => {
        const alertsManagerElement = document.getElementById('alerts-manager-section');
        if (alertsManagerElement) {
            const elementRect = alertsManagerElement.getBoundingClientRect();
            const threshold = 20; 
            if (elementRect.top < threshold || elementRect.bottom > window.innerHeight) {
                alertsManagerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, 150); 
  };

  const handleCancelEdit = () => {
    setEditingAlert(null);
  };

  const handleUpdateAlertInternal = (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => {
    propUpdateAlert(alertId, updatedValues);
    setEditingAlert(null); 
    addNotification('Alert updated successfully!', 'success');
  };

  const getButtonCursorClass = () => {
    if (isDragAndDropEnabled) {
      return draggedItem === sectionId ? 'cursor-grabbing' : 'cursor-grab';
    }
    return '';
  };

  return (
    <div id="alerts-manager-section" className="bg-[var(--bg-secondary)] rounded-lg shadow-xl scroll-mt-20">
      <button
        onClick={onToggleCollapse}
        draggable={isDragAndDropEnabled}
        onDragStart={(e) => handleDragStart(e, sectionId)}
        aria-grabbed={isDragAndDropEnabled && draggedItem === sectionId ? 'true' : 'false'}
        className={`${getButtonCursorClass()} w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] transition-colors ${!isCollapsed ? 'rounded-t-lg hover:bg-[var(--bg-tertiary)]/70' : 'rounded-lg hover:bg-[var(--bg-tertiary)]/50'}`}
        aria-expanded={!isCollapsed}
        aria-controls={`${sectionId}-content-wrapper`}
      >
        <div className="flex-grow flex items-center min-w-0">
          <BellIcon className="w-6 h-6 text-[var(--text-accent)] mr-3 pointer-events-none flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-[var(--text-accent)] pointer-events-none"> 
            {editingAlert ? 'Edit Price Alert' : 'Manage Price Alerts'}
          </h2>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-accent)] transition-transform duration-200 pointer-events-none ${isCollapsed ? '-rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="rounded-b-lg">
          <div 
            id={`${sectionId}-content-wrapper`} 
            className="p-4 md:p-6 space-y-6"
            style={{ 
              maxHeight: isResizable ? `${currentHeight}px` : undefined, 
              overflowY: 'auto',
              transition: isResizable ? 'max-height 0.1s linear' : 'none',
            }}
          >
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
          {isResizable && (
            <div
              className="section-resize-handle"
              onMouseDown={(e) => onResizeMouseDown(e, sectionId)}
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize Alerts Manager section`}
              title="Drag to resize section"
            />
          )}
        </div>
      )}
    </div>
  );
};
