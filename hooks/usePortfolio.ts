
import { useState, useEffect, useCallback } from 'react';
import { PortfolioEntry, ItemMapInfo } from '../src/types'; // Assuming ItemMapInfo might be needed indirectly
import { PORTFOLIO_STORAGE_KEY } from '../constants';
import { calculateGeTax } from '../utils/taxUtils'; // Import the new tax utility

// Helper to generate unique IDs
const generateUniqueId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

export type PortfolioEntryUpdate = Partial<Pick<PortfolioEntry, 'quantityPurchased' | 'purchasePricePerItem' | 'purchaseDate'>>;


export const usePortfolio = (
  isConsentGranted: boolean,
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void
) => {
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>(() => {
    if (isConsentGranted) {
      try {
        const storedPortfolio = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
        return storedPortfolio ? JSON.parse(storedPortfolio) : [];
      } catch (e) {
        console.error("Error loading portfolio from localStorage:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolioEntries));
      } catch (e) {
        console.error("Error saving portfolio to localStorage:", e);
      }
    }
  }, [portfolioEntries, isConsentGranted]);

  // Effect to clear in-memory portfolio if consent is revoked
  useEffect(() => {
    if (!isConsentGranted) {
      setPortfolioEntries([]);
    }
  }, [isConsentGranted]);

  const addPortfolioEntryUI = useCallback((
    item: ItemMapInfo,
    quantity: number,
    purchasePrice: number,
    purchaseDateTimestamp: number
  ) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to save investments.', 'info');
      return;
    }
    const newEntry: PortfolioEntry = {
      id: generateUniqueId(),
      itemId: item.id,
      quantityPurchased: quantity,
      purchasePricePerItem: purchasePrice,
      purchaseDate: purchaseDateTimestamp,
      quantitySoldFromThisLot: 0,
      totalProceedsFromThisLot: 0,
      totalTaxPaidFromThisLot: 0, // Initialize tax paid
    };
    setPortfolioEntries(prevEntries => [...prevEntries, newEntry].sort((a,b) => b.purchaseDate - a.purchaseDate));
    addNotification(`${item.name} (${quantity}) added to portfolio.`, 'success');
  }, [isConsentGranted, addNotification, setPortfolioEntries]);


  const recordSaleAndUpdatePortfolio = useCallback((
    entryId: string,
    quantityToSellNow: number,
    salePricePerItem: number,
    saleDateTimestamp: number
  ) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to record sales.', 'info');
      return;
    }

    setPortfolioEntries(prevEntries => {
      const originalEntryIndex = prevEntries.findIndex(e => e.id === entryId);
      if (originalEntryIndex === -1) {
        addNotification('Error: Could not find investment lot to record sale.', 'error');
        return prevEntries;
      }

      const originalEntry = prevEntries[originalEntryIndex];

      if (quantityToSellNow <= 0) {
        addNotification('Error: Quantity to sell must be positive.', 'error');
        return prevEntries;
      }
      if (salePricePerItem < 0) {
        addNotification('Error: Sale price must be zero or positive.', 'error');
        return prevEntries;
      }
      if (quantityToSellNow > originalEntry.quantityPurchased) {
        addNotification(`Error: Attempting to sell ${quantityToSellNow.toLocaleString()} but only ${originalEntry.quantityPurchased.toLocaleString()} were originally purchased in this lot.`, 'error');
        return prevEntries;
      }
      
      const taxForThisSaleTransaction = calculateGeTax(salePricePerItem, quantityToSellNow, originalEntry.itemId);

      const soldPortionEntry: PortfolioEntry = {
        id: generateUniqueId(), // New ID for the sold portion
        itemId: originalEntry.itemId,
        quantityPurchased: quantityToSellNow, // The "purchased" quantity for this *new* entry is what was sold
        purchasePricePerItem: originalEntry.purchasePricePerItem, // Cost basis from original
        purchaseDate: originalEntry.purchaseDate, // Original purchase date for this portion
        quantitySoldFromThisLot: quantityToSellNow, // This new entry is immediately and fully sold
        totalProceedsFromThisLot: quantityToSellNow * salePricePerItem,
        totalTaxPaidFromThisLot: taxForThisSaleTransaction,
        lastSaleDate: saleDateTimestamp,
      };

      let updatedEntries = prevEntries.filter(e => e.id !== entryId); // Remove original entry
      updatedEntries.push(soldPortionEntry); // Add the new "closed" entry for the sold portion

      // If the original lot had more quantity than what was just sold, create/update the remaining part
      if (originalEntry.quantityPurchased > quantityToSellNow) {
        const remainingOriginalLot: PortfolioEntry = {
          ...originalEntry, // Retain original ID, itemId, purchasePricePerItem, purchaseDate
          quantityPurchased: originalEntry.quantityPurchased - quantityToSellNow, // Reduce original quantity
          // Reset sale-related fields as this is now a smaller, purely "unsold" original lot
          quantitySoldFromThisLot: 0,
          totalProceedsFromThisLot: 0,
          totalTaxPaidFromThisLot: 0,
          lastSaleDate: undefined,
        };
        updatedEntries.push(remainingOriginalLot);
      }
      // If originalEntry.quantityPurchased === quantityToSellNow, the original lot is fully covered by soldPortionEntry,
      // so no remaining part is added back.

      return updatedEntries.sort((a,b) => b.purchaseDate - a.purchaseDate);
    });
  }, [isConsentGranted, addNotification, setPortfolioEntries]);

  const deletePortfolioEntry = useCallback((entryId: string) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to manage portfolio.', 'info');
      return;
    }
    setPortfolioEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
    addNotification('Investment lot removed from portfolio.', 'info');
  }, [isConsentGranted, addNotification, setPortfolioEntries]);

  const clearAllPortfolioData = useCallback(() => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to manage portfolio.', 'info');
      return;
    }
    setPortfolioEntries([]);
    // Notification will be triggered by PortfolioModal after confirmation
  }, [isConsentGranted, setPortfolioEntries]);


  const updatePortfolioEntryDetails = useCallback((entryId: string, updates: PortfolioEntryUpdate) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to edit investments.', 'info');
      return;
    }

    setPortfolioEntries(prevEntries => {
      const entryIndex = prevEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        addNotification('Error: Could not find investment lot to update.', 'error');
        return prevEntries;
      }

      const updatedEntries = [...prevEntries];
      const entryToUpdate = { ...updatedEntries[entryIndex] };

      let quantityChanged = false;

      if (updates.quantityPurchased !== undefined) {
        if (updates.quantityPurchased <= 0) {
          addNotification('Error: Purchase quantity must be positive.', 'error');
          return prevEntries;
        }
        // Under the new "split-off" sale logic, an open lot has quantitySoldFromThisLot = 0.
        // A closed lot (created from a sale) has quantitySoldFromThisLot = quantityPurchased.
        // If editing a closed lot's quantityPurchased, it must not be less than its quantitySoldFromThisLot.
        if (updates.quantityPurchased < entryToUpdate.quantitySoldFromThisLot) {
           addNotification(`Error: New purchase quantity (${updates.quantityPurchased.toLocaleString()}) cannot be less than recorded sold quantity (${entryToUpdate.quantitySoldFromThisLot.toLocaleString()}).`, 'error');
          return prevEntries;
        }
        if(entryToUpdate.quantityPurchased !== updates.quantityPurchased) quantityChanged = true;
        entryToUpdate.quantityPurchased = updates.quantityPurchased;
      }

      if (updates.purchasePricePerItem !== undefined) {
        if (updates.purchasePricePerItem <= 0 && updates.purchasePricePerItem !== 0) { // Allow 0 for items like event items
          addNotification('Error: Purchase price must be zero or positive.', 'error');
          return prevEntries;
        }
        entryToUpdate.purchasePricePerItem = updates.purchasePricePerItem;
      }

      if (updates.purchaseDate !== undefined) {
        entryToUpdate.purchaseDate = updates.purchaseDate;
      }
      
      // If quantityPurchased of a "closed" lot is increased to be > quantitySoldFromThisLot, it effectively "re-opens".
      // If quantityPurchased of an "open" lot changes, it just changes its size.
      // The crucial part is that quantitySoldFromThisLot for an "open" lot created by the split-off logic is always 0.
      // If we are editing a "closed" lot (one where quantityPurchased == quantitySoldFromThisLot initially),
      // and we increase quantityPurchased, it means the lot is no longer fully sold.
      // We might need to adjust quantitySoldFromThisLot if the edit implies it should become an open lot.
      // For simplicity, if a "closed" lot's quantityPurchased is increased, it becomes "open"
      // with its existing quantitySoldFromThisLot. This is complex.
      //
      // The current edit modal and this update logic is more for the "original purchase" details.
      // If an "open" lot (which has `quantitySoldFromThisLot = 0`) has its `quantityPurchased` changed, it's straightforward.
      // If a "closed" lot (`quantityPurchased === quantitySoldFromThisLot`) has `quantityPurchased` changed:
      //   - If new `quantityPurchased` > `quantitySoldFromThisLot`, it becomes partially open.
      //   - If new `quantityPurchased` = `quantitySoldFromThisLot` (e.g. price/date changed but quantities effectively the same), it remains closed.
      // This behavior seems acceptable.

      updatedEntries[entryIndex] = entryToUpdate;
      addNotification('Investment details updated successfully!', 'success');
      return updatedEntries.sort((a,b) => b.purchaseDate - a.purchaseDate);
    });
  }, [isConsentGranted, addNotification, setPortfolioEntries]);

  const replacePortfolio = useCallback((newEntries: PortfolioEntry[]) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to import portfolio data.', 'info');
      return;
    }
    setPortfolioEntries(newEntries.sort((a,b) => b.purchaseDate - a.purchaseDate));
    // Notification is handled by PortfolioModal after confirmation
  }, [isConsentGranted, addNotification, setPortfolioEntries]);


  return {
    portfolioEntries,
    addPortfolioEntry: addPortfolioEntryUI,
    recordSaleAndUpdatePortfolio,
    deletePortfolioEntry,
    clearAllPortfolioData,
    updatePortfolioEntryDetails,
    replacePortfolio, 
  };
};
