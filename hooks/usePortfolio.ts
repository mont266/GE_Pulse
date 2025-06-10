
import { useState, useEffect, useCallback } from 'react';
import { PortfolioEntry, ItemMapInfo } from '../src/types'; // Assuming ItemMapInfo might be needed indirectly
import { PORTFOLIO_STORAGE_KEY } from '../constants';
import { calculateGeTax } from '../utils/taxUtils'; // Import the new tax utility

// Helper to generate unique IDs
const generateUniqueId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

export const usePortfolio = (
  isConsentGranted: boolean,
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void
) => {
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>(() => {
    if (isConsentGranted) {
      try {
        const storedPortfolio = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
        return storedPortfolio ? JSON.parse(storedPortfolio) : [];
      } catch (error) {
        console.error("Error loading portfolio from localStorage:", error);
      }
    }
    return [];
  });

  useEffect(() => {
    if (isConsentGranted) {
      try {
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolioEntries));
      } catch (error) {
        console.error("Error saving portfolio to localStorage:", error);
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
    setPortfolioEntries(prevEntries => [...prevEntries, newEntry]);
    addNotification(`${item.name} (${quantity}) added to portfolio.`, 'success');
  }, [isConsentGranted, addNotification]);


  const recordSaleAndUpdatePortfolio = useCallback((
    entryId: string, 
    quantityToSell: number, 
    salePricePerItem: number, 
    saleDateTimestamp: number
  ) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to record sales.', 'info');
      return;
    }

    setPortfolioEntries(prevEntries => {
      const entryIndex = prevEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        addNotification('Error: Could not find investment lot to record sale.', 'error');
        return prevEntries;
      }

      const updatedEntries = [...prevEntries];
      const entryToUpdate = { ...updatedEntries[entryIndex] };

      const remainingInLot = entryToUpdate.quantityPurchased - entryToUpdate.quantitySoldFromThisLot;
      if (quantityToSell > remainingInLot) {
        addNotification('Error: Cannot sell more than available in this lot.', 'error');
        return prevEntries; 
      }
      if (quantityToSell <= 0) {
        addNotification('Error: Quantity to sell must be positive.', 'error');
        return prevEntries;
      }
       if (salePricePerItem < 0) { 
        addNotification('Error: Sale price must be zero or positive.', 'error');
        return prevEntries;
      }

      // Calculate tax for this specific sale transaction
      const taxForThisSale = calculateGeTax(salePricePerItem, quantityToSell, entryToUpdate.itemId);

      entryToUpdate.quantitySoldFromThisLot += quantityToSell;
      entryToUpdate.totalProceedsFromThisLot += (quantityToSell * salePricePerItem);
      entryToUpdate.totalTaxPaidFromThisLot += taxForThisSale; // Accumulate tax
      entryToUpdate.lastSaleDate = saleDateTimestamp; 

      updatedEntries[entryIndex] = entryToUpdate;
      
      // Note: Item name for notification is handled in SellInvestmentModal now
      // addNotification(`${quantityToSell} of Item sold. Tax: ${taxForThisSale.toLocaleString()} GP.`, 'success');
      return updatedEntries;
    });
  }, [isConsentGranted, addNotification]);
  
  const deletePortfolioEntry = useCallback((entryId: string) => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to manage portfolio.', 'info');
      return;
    }
    setPortfolioEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
    addNotification('Investment lot removed from portfolio.', 'info');
  }, [isConsentGranted, addNotification]);

  const clearAllPortfolioData = useCallback(() => {
    if (!isConsentGranted) {
      addNotification('Enable preferences in settings to manage portfolio.', 'info');
      return;
    }
    setPortfolioEntries([]);
    addNotification('All portfolio data has been cleared.', 'success');
  }, [isConsentGranted, addNotification]);

  return { 
    portfolioEntries, 
    addPortfolioEntry: addPortfolioEntryUI, 
    recordSaleAndUpdatePortfolio,
    deletePortfolioEntry, 
    clearAllPortfolioData 
  };
};
