
import React from 'react';
import { PriceAlert } from '../types';

interface PriceAlertListProps {
  alerts: PriceAlert[];
  onRemoveAlert: (alertId: string) => void;
  getItemName: (itemId: number) => string; 
  getItemIconUrl: (iconName: string) => string;
  onSelectAlertItem: (itemId: number) => void;
  onStartEdit: (alert: PriceAlert) => void; // New prop
}

const AlertIcon: React.FC<{ status: PriceAlert['status'] }> = ({ status }) => {
  if (status === 'triggered') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--alert-triggered-icon)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--alert-active-icon)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const EditIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);


export const PriceAlertList: React.FC<PriceAlertListProps> = ({ alerts, onRemoveAlert, getItemIconUrl, onSelectAlertItem, onStartEdit }) => {
  if (alerts.length === 0) {
    return <p className="text-[var(--text-secondary)] text-center py-4">No active alerts.</p>;
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.status === 'triggered' && b.status !== 'triggered') return -1;
    if (a.status !== 'triggered' && b.status === 'triggered') return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {sortedAlerts.map(alert => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg shadow flex items-start justify-between space-x-3
            ${alert.status === 'triggered' 
              ? 'bg-[var(--alert-triggered-bg)] border border-[var(--alert-triggered-border)]' 
              : 'bg-[var(--bg-tertiary)]'
            }`}
        >
          <div className="flex items-center space-x-3 flex-grow">
            <AlertIcon status={alert.status} />
            <img 
              loading="lazy"
              src={getItemIconUrl(alert.itemIcon)} 
              alt={alert.itemName} 
              className="w-10 h-10 object-contain flex-shrink-0" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="flex-grow">
              <button
                onClick={() => onSelectAlertItem(alert.itemId)}
                className={`${alert.status === 'triggered' ? 'font-bold' : 'font-semibold'} text-left transition-colors 
                  ${alert.status === 'triggered' 
                    ? 'text-[var(--alert-triggered-text)] hover:text-[var(--alert-triggered-text)]/80' 
                    : 'text-[var(--text-primary)] hover:text-[var(--text-accent)]'
                  } focus:outline-none focus:underline`}
                aria-label={`View chart for ${alert.itemName}`}
              >
                {alert.itemName}
              </button>
              <p className={`text-sm ${alert.status === 'triggered' ? 'text-[var(--alert-triggered-text)] opacity-80' : 'text-[var(--text-secondary)]'}`}>
                {alert.condition === 'above' ? 'Above' : 'Below'} {alert.targetPrice.toLocaleString()} GP
              </p>
              {alert.status === 'triggered' && alert.priceAtTrigger && (
                <p className="text-xs text-[var(--alert-triggered-text)] opacity-70">
                  Triggered at {alert.priceAtTrigger.toLocaleString()} GP on {new Date(alert.triggeredAt!).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            {alert.status === 'active' && (
              <button
                onClick={() => onStartEdit(alert)}
                className={`p-1 rounded-full hover:bg-[var(--bg-interactive)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--bg-interactive)] text-[var(--text-muted)] hover:text-[var(--bg-interactive)]`}
                aria-label="Edit alert"
              >
                <EditIcon />
              </button>
            )}
            <button
              onClick={() => onRemoveAlert(alert.id)}
              className={`p-1 rounded-full hover:bg-[var(--price-low)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--price-low)] 
                ${alert.status === 'triggered' ? 'text-[var(--alert-triggered-text)] hover:text-[var(--price-low)]' : 'text-[var(--text-muted)] hover:text-[var(--price-low)]'}`}
              aria-label="Remove alert"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};