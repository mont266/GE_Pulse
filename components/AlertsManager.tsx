
import React, { useState } from 'react';
import { PriceAlert, ItemMapInfo } from '../types';
import { PriceAlertForm } from './PriceAlertForm';
import { PriceAlertList } from './PriceAlertList';

interface AlertsManagerProps {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => void; // New prop
  allItems: ItemMapInfo[];
  getItemName: (itemId: number) => string;
  getItemIconUrl: (iconName: string) => string;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSelectAlertItemById: (itemId: number) => void;
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
    setEditingAlert(null); // Close form after update
    props.addNotification('Alert updated successfully!', 'success');
  };

  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl space-y-6">
      <h2 className="text-2xl font-semibold text-[var(--text-accent)]">
        {editingAlert ? 'Edit Price Alert' : 'Price Alerts'}
      </h2>
      <PriceAlertForm 
        allItems={props.allItems} 
        onAddAlert={props.addAlert}
        addNotification={props.addNotification}
        editingAlert={editingAlert} // Pass editingAlert
        onUpdateAlert={handleUpdateAlert} // Pass handler for updating
        onCancelEdit={handleCancelEdit} // Pass handler for cancelling edit
      />
      {!editingAlert && ( // Only show list if not editing, or form is above it and separated
        <PriceAlertList 
          alerts={props.alerts} 
          onRemoveAlert={props.removeAlert} 
          getItemName={props.getItemName} 
          getItemIconUrl={props.getItemIconUrl}
          onSelectAlertItem={props.onSelectAlertItemById}
          onStartEdit={handleStartEditAlert} // Pass handler to start editing
        />
      )}
    </div>
  );
};