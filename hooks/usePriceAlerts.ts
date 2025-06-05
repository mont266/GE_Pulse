
import { useState, useEffect, useCallback } from 'react';
import { PriceAlert, LatestPriceData } from '../types';
import { ALERT_CHECK_INTERVAL, ALERTS_STORAGE_KEY } from '../constants';

type FetchPriceFn = (itemId: number) => Promise<LatestPriceData | null>;

export const usePriceAlerts = (
  onAlertTriggered: (alert: PriceAlert) => void,
  fetchPrice: FetchPriceFn,
  isConsentGranted: boolean // Added to control localStorage access
) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    if (isConsentGranted) {
      try {
        const storedAlerts = localStorage.getItem(ALERTS_STORAGE_KEY);
        return storedAlerts ? JSON.parse(storedAlerts) : [];
      } catch (error) {
        console.error("Error loading alerts from localStorage:", error);
      }
    }
    return [];
  });

  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
      } catch (error) {
        console.error("Error saving alerts to localStorage:", error);
      }
    }
    // If consent is not granted, alerts are only in-memory for the session.
    // If consent is revoked, App.tsx handles clearing the localStorage directly.
  }, [alerts, isConsentGranted]);

  // Effect to clear in-memory alerts if consent is revoked
  useEffect(() => {
    if (!isConsentGranted) {
      setAlerts([]); // Clear in-memory alerts if consent is no longer granted
    }
  }, [isConsentGranted]);


  const addAlert = useCallback((newAlertData: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: PriceAlert = {
      ...newAlertData,
      id: `${newAlertData.itemId}-${Date.now()}`,
      createdAt: Date.now(),
      status: 'active',
    };
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  }, []);

  const updateAlert = useCallback((alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert => {
        if (alert.id === alertId && alert.status === 'active') {
          return {
            ...alert,
            targetPrice: updatedValues.targetPrice,
            condition: updatedValues.condition,
          };
        }
        return alert;
      })
    );
  }, []);

  const checkAlerts = useCallback(async (alertsToCheck: PriceAlert[], specificPrices?: Record<number, LatestPriceData>) => {
    const currentAlertsCopy = [...alerts]; // Work with a copy of the current state alerts
    let anyAlertTriggeredThisCheck = false;

    for (const alert of alertsToCheck) { // Iterate over the passed alertsToCheck (likely active ones)
      if (alert.status !== 'active') continue;

      let currentPriceData = specificPrices?.[alert.itemId];
      if (!currentPriceData) {
          try {
            currentPriceData = await fetchPrice(alert.itemId);
          } catch (error) {
            console.error(`Failed to fetch price for alert check (item ${alert.itemId}):`, error);
            continue; 
          }
      }
      
      if (currentPriceData) {
        const priceToCheck = alert.condition === 'below' ? currentPriceData.low : currentPriceData.high;
        if (priceToCheck === null) continue;

        const conditionMet = alert.condition === 'below' 
          ? priceToCheck < alert.targetPrice 
          : priceToCheck > alert.targetPrice;

        if (conditionMet) {
          const alertIndexInMainList = currentAlertsCopy.findIndex(a => a.id === alert.id);
          if (alertIndexInMainList !== -1 && currentAlertsCopy[alertIndexInMainList].status === 'active') {
            const triggeredAlertUpdate = {
              ...currentAlertsCopy[alertIndexInMainList],
              status: 'triggered' as 'triggered',
              priceAtTrigger: priceToCheck,
              triggeredAt: Date.now(),
            };
            currentAlertsCopy[alertIndexInMainList] = triggeredAlertUpdate;
            onAlertTriggered(triggeredAlertUpdate);
            anyAlertTriggeredThisCheck = true;
          }
        }
      }
    }
    if (anyAlertTriggeredThisCheck) {
      setAlerts(currentAlertsCopy); // Update state with all modifications from this check
    }
  }, [alerts, fetchPrice, onAlertTriggered]);

  useEffect(() => {
    const activeAlertsToCheck = alerts.filter(alert => alert.status === 'active');
    if (activeAlertsToCheck.length === 0) return;

    const intervalId = setInterval(() => {
      console.log('Periodically checking alerts...', new Date().toLocaleTimeString());
      checkAlerts(activeAlertsToCheck);
    }, ALERT_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [alerts, checkAlerts]);

  const clearAllAlertsAndStorage = useCallback(() => {
    setAlerts([]);
    // App.tsx will handle removing from localStorage based on ALL_USER_PREFERENCE_KEYS
    // which includes ALERTS_STORAGE_KEY.
  }, []);

  return { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage };
};