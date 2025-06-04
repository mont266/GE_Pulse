
import React from 'react';
import { PriceAlert, ItemMapInfo } from '../types';
import { PriceAlertForm } from './PriceAlertForm';
import { PriceAlertList } from './PriceAlertList';

interface AlertsManagerProps {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  removeAlert: (alertId: string) => void;
  allItems: ItemMapInfo[];
  getItemName: (itemId: number) => string;
  getItemIconUrl: (iconName: string) => string;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = (props) => {
  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-xl space-y-6">
      <h2 className="text-2xl font-semibold text-[var(--text-accent)]">Price Alerts</h2>
      <PriceAlertForm 
        allItems={props.allItems} 
        onAddAlert={props.addAlert}
        addNotification={props.addNotification}
      />
      <PriceAlertList 
        alerts={props.alerts} 
        onRemoveAlert={props.removeAlert} 
        getItemName={props.getItemName} // Kept for safety, though alert.itemName is used
        getItemIconUrl={props.getItemIconUrl}
      />
    </div>
  );
};
