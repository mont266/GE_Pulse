
import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { PriceAlert, LatestPriceData } from '../types';
import { ALERT_CHECK_INTERVAL, ALERTS_STORAGE_KEY } from '../constants';

type FetchPriceFn = (itemId: number) => Promise<LatestPriceData | null>;

export const usePriceAlerts = (
  onAlertTriggered: (alert: PriceAlert) => void,
  fetchPrice: FetchPriceFn,
  isConsentGranted: boolean,
  trackGaEvent?: (eventName: string, eventParams?: Record<string, any>) => void,
  getItemName?: (itemId: number) => string
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

  const alertsRef = useRef(alerts); 
  useEffect(() => {
    alertsRef.current = alerts; 
  }, [alerts]);


  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
      } catch (error) {
        console.error("Error saving alerts to localStorage:", error);
      }
    }
  }, [alerts, isConsentGranted]);

  useEffect(() => {
    if (!isConsentGranted) {
      setAlerts([]); 
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
    if (trackGaEvent && getItemName && isConsentGranted) {
      const alertToRemove = alertsRef.current.find(alert => alert.id === alertId);
      if (alertToRemove) {
        trackGaEvent('remove_price_alert', { item_id: alertToRemove.itemId, item_name: getItemName(alertToRemove.itemId) });
      }
    }
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  }, [trackGaEvent, getItemName, isConsentGranted]);

  const updateAlert = useCallback((alertId: string, updatedValues: { targetPrice: number; condition: 'above' | 'below' }) => {
    if (trackGaEvent && getItemName && isConsentGranted) {
      const alertToUpdate = alertsRef.current.find(alert => alert.id === alertId && alert.status === 'active');
      if (alertToUpdate) {
        trackGaEvent('update_price_alert', {
          item_id: alertToUpdate.itemId,
          item_name: getItemName(alertToUpdate.itemId),
          target_price: updatedValues.targetPrice,
          condition: updatedValues.condition
        });
      }
    }
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
  }, [trackGaEvent, getItemName, isConsentGranted]);

  const checkAlerts = useCallback(async (alertsToCheck: PriceAlert[], specificPrices?: Record<number, LatestPriceData>) => {
    const currentAlertsState = alertsRef.current; 
    const updatedAlertsFromState = [...currentAlertsState]; 
    let anyAlertTriggeredThisCheck = false;

    for (const alertToCheck of alertsToCheck) { 
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
  }, [fetchPrice, onAlertTriggered]); 

  useEffect(() => {
    const activeAlertsToCheck = alertsRef.current.filter(alert => alert.status === 'active');
    if (activeAlertsToCheck.length === 0 || !isConsentGranted) return;

    const intervalId = setInterval(() => {
      console.log('Periodically checking alerts...', new Date().toLocaleTimeString());
      const currentActiveAlerts = alertsRef.current.filter(alert => alert.status === 'active');
      if (currentActiveAlerts.length > 0) {
        checkAlerts(currentActiveAlerts);
      }
    }, ALERT_CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkAlerts, isConsentGranted]); 

  const clearAllAlertsAndStorage = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, addAlert, removeAlert, updateAlert, checkAlerts, clearAllAlertsAndStorage };
};
