
import React, { useState } from 'react';
import { PriceAlert, ItemMapInfo } from '../types';
import { PriceAlertForm } from './PriceAlertForm';
import { PriceAlertList } from './PriceAlertList';

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
  isConsentGranted: boolean; // New prop
}

export const AlertsManager: React.FC<AlertsManagerProps> = (props) => {
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  const handleStartEditAlert = (alert: PriceAlert) => {
    setEditingAlert(alert);
  };

  const handleCancelEdit = () => {
    setEditingAlert(null);
  };

  const handleUpdateAlert = (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => {
    props.updateAlert(alertId, updatedValues);
    setEditingAlert(null); 
    props.addNotification('Alert updated successfully!', 'success');
  };

  if (!props.isConsentGranted && props.alerts.length === 0 && !editingAlert) {
    return (
      <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl space-y-6">
        <h2 className="text-2xl font-semibold text-[var(--text-accent)]">Price Alerts</h2>
        <p className="text-[var(--text-secondary)] text-center py-4">
          Enable preference storage in settings to use Price Alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl space-y-6">
      <h2 className="text-2xl font-semibold text-[var(--text-accent)]">
        {editingAlert ? 'Edit Price Alert' : 'Price Alerts'}
      </h2>
      <PriceAlertForm 
        allItems={props.allItems} 
        onAddAlert={props.addAlert}
        addNotification={props.addNotification}
        editingAlert={editingAlert}
        onUpdateAlert={handleUpdateAlert}
        onCancelEdit={handleCancelEdit}
        isConsentGranted={props.isConsentGranted}
      />
      {!editingAlert && (
        <PriceAlertList 
          alerts={props.alerts} 
          onRemoveAlert={props.removeAlert} 
          getItemName={props.getItemName} 
          getItemIconUrl={props.getItemIconUrl}
          onSelectAlertItem={props.onSelectAlertItemById}
          onStartEdit={handleStartEditAlert}
        />
      )}
    </div>
  );
};