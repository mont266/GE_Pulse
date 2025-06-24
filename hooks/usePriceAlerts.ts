
import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
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

  const alertsRef = useRef(alerts); // Create a ref to hold the current alerts
  useEffect(() => {
    alertsRef.current = alerts; // Keep the ref updated
  }, [alerts]);


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
    const currentAlertsState = alertsRef.current; // Read from ref
    const updatedAlertsFromState = [...currentAlertsState]; // Make a mutable copy
    let anyAlertTriggeredThisCheck = false;

    for (const alertToCheck of alertsToCheck) { // Iterate over the subset passed in
      if (alertToCheck.status !== 'active') continue;

      const originalAlertIndex = updatedAlertsFromState.findIndex(a => a.id === alertToCheck.id);
      if (originalAlertIndex === -1 || updatedAlertsFromState[originalAlertIndex].status !== 'active') continue;

      let currentPriceData = specificPrices?.[alertToCheck.itemId];
      if (!currentPriceData) {
          try {
            currentPriceData = await fetchPrice(alertToCheck.itemId);
          } catch (error) {
            console.error(`Failed to fetch price for alert check (item ${alertToCheck.itemId}):`, error);
            continue; 
          }
      }
      
      if (currentPriceData) {
        const priceForCondition = alertToCheck.condition === 'below' ? currentPriceData.low : currentPriceData.high;
        if (priceForCondition === null) continue;

        const conditionMet = alertToCheck.condition === 'below' 
          ? priceForCondition < alertToCheck.targetPrice 
          : priceForCondition > alertToCheck.targetPrice;

        if (conditionMet) {
          const triggeredAlertUpdate: PriceAlert = {
            ...updatedAlertsFromState[originalAlertIndex],
            status: 'triggered',
            priceAtTrigger: priceForCondition,
            triggeredAt: Date.now(),
          };
          updatedAlertsFromState[originalAlertIndex] = triggeredAlertUpdate;
          onAlertTriggered(triggeredAlertUpdate);
          anyAlertTriggeredThisCheck = true;
        }
      }
    }
    if (anyAlertTriggeredThisCheck) {
      setAlerts(updatedAlertsFromState); 
    }
  }, [fetchPrice, onAlertTriggered, setAlerts]); // Removed 'alerts' from deps, alertsRef handles it

  useEffect(() => {
    const activeAlertsToCheck = alertsRef.current.filter(alert => alert.status === 'active');
    if (activeAlertsToCheck.length === 0 || !isConsentGranted) return; // Added isConsentGranted check

    const intervalId = setInterval(() => {
      console.log('Periodically checking alerts...', new Date().toLocaleTimeString());
      const currentActiveAlerts = alertsRef.current.filter(alert => alert.status === 'active');
      if (currentActiveAlerts.length > 0) {
        checkAlerts(currentActiveAlerts);
      }
    }, ALERT_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkAlerts, isConsentGranted]); // checkAlerts is now stable

  const clearAllAlertsAndStorage = useCallback(() => {
    setAlerts([]);
    // App.tsx will handle removing from localStorage based on ALL_USER_PREFERENCE_KEYS
    // which includes ALERTS_STORAGE_KEY.
  }, []);

  return { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage };
};
