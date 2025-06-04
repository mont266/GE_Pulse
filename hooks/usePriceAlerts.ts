
import { useState, useEffect, useCallback } from 'react';
import { PriceAlert, LatestPriceData } from '../types';
import { ALERT_CHECK_INTERVAL } from '../constants';

const ALERTS_STORAGE_KEY = 'runescapePriceAlerts';

type FetchPriceFn = (itemId: number) => Promise<LatestPriceData | null>;

export const usePriceAlerts = (
  onAlertTriggered: (alert: PriceAlert) => void,
  fetchPrice: FetchPriceFn 
) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const storedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);
      return storedAlerts ? JSON.parse(storedAlerts) : [];
    } catch (error) {
      console.error("Error loading alerts from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch (error) {
      console.error("Error saving alerts to localStorage:", error);
    }
  }, [alerts]);

  const addAlert = useCallback((newAlertData: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: PriceAlert = {
      ...newAlertData,
      id: `${newAlertData.itemId}-${Date.now()}`, // Simple unique ID
      createdAt: Date.now(),
      status: 'active',
    };
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  }, []);

  const checkAlerts = useCallback(async (alertsToCheck: PriceAlert[], specificPrices?: Record<number, LatestPriceData>) => {
    const updatedAlerts = [...alerts]; // Create a mutable copy
    let anyAlertTriggered = false;

    for (let i = 0; i < alertsToCheck.length; i++) {
      const alert = alertsToCheck[i];
      if (alert.status !== 'active') continue;

      let currentPriceData = specificPrices?.[alert.itemId];
      if (!currentPriceData) {
          try {
            currentPriceData = await fetchPrice(alert.itemId);
          } catch (error) {
            console.error(`Failed to fetch price for alert check (item ${alert.itemId}):`, error);
            continue; // Skip this alert if price fetch fails
          }
      }
      
      if (currentPriceData) {
        const priceToCheck = alert.condition === 'below' ? currentPriceData.low : currentPriceData.high;
        if (priceToCheck === null) continue; // Can't check if price is null

        const conditionMet = alert.condition === 'below' 
          ? priceToCheck < alert.targetPrice 
          : priceToCheck > alert.targetPrice;

        if (conditionMet) {
          const alertIndexInMainList = updatedAlerts.findIndex(a => a.id === alert.id);
          if (alertIndexInMainList !== -1) {
            const triggeredAlert = {
              ...updatedAlerts[alertIndexInMainList],
              status: 'triggered' as 'triggered',
              priceAtTrigger: priceToCheck,
              triggeredAt: Date.now(),
            };
            updatedAlerts[alertIndexInMainList] = triggeredAlert;
            onAlertTriggered(triggeredAlert);
            anyAlertTriggered = true;
          }
        }
      }
    }
    if (anyAlertTriggered) {
      setAlerts(updatedAlerts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, fetchPrice, onAlertTriggered]); // `alerts` is a dep for `updatedAlerts` copy

  useEffect(() => {
    const activeAlerts = alerts.filter(alert => alert.status === 'active');
    if (activeAlerts.length === 0) return;

    const intervalId = setInterval(() => {
      console.log('Periodically checking alerts...', new Date().toLocaleTimeString());
      checkAlerts(activeAlerts);
    }, ALERT_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, checkAlerts]); // Re-run if alerts list changes (e.g. new active alert)

  return { alerts, addAlert, removeAlert, checkAlerts };
};
    