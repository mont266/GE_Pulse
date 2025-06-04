
import React from 'react';
import { NotificationMessage } from '../types';

interface NotificationBarProps {
  notifications: NotificationMessage[];
}

export const NotificationBar: React.FC<NotificationBarProps> = ({ notifications }) => {
  if (notifications.length === 0) {
    return null;
  }

  const getBgColorVar = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success': return 'var(--notification-success-bg)';
      case 'error': return 'var(--notification-error-bg)';
      case 'info':
      default: return 'var(--notification-info-bg)';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-md shadow-lg text-[var(--notification-text)] bg-[${getBgColorVar(notification.type)}] animate-fadeInOut`}
          role="alert"
        >
          {notification.message}
        </div>
      ))}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};