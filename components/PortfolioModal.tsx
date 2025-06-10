
import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioEntry, ItemMapInfo, LatestPriceData } from '../src/types';
import { AddInvestmentForm } from './portfolio/AddInvestmentForm';
import { PortfolioTable } from './portfolio/PortfolioTable';
import { PortfolioSummary } from './portfolio/PortfolioSummary';
import { SellInvestmentModal } from './portfolio/SellInvestmentModal';
import { ConfirmDeletePortfolioEntryModal } from './portfolio/ConfirmDeletePortfolioEntryModal';
import { ConfirmClearAllPortfolioModal } from './portfolio/ConfirmClearAllPortfolioModal'; // New import
import { LoadingSpinner } from './LoadingSpinner';
import { TrashIcon } from './Icons'; // For clear all button

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioEntries: PortfolioEntry[];
  addPortfolioEntry: (item: ItemMapInfo, quantity: number, purchasePrice: number, purchaseDate: number) => void;
  recordSaleAndUpdatePortfolio: (entryId: string, quantitySold: number, salePrice: number, saleDate: number) => void;
  deletePortfolioEntry: (entryId: string) => void; 
  clearAllPortfolioData: () => void; // New prop
  allItems: ItemMapInfo[];
  getItemIconUrl: (iconName: string) => string;
  getItemName: (itemId: number) => string; 
  fetchLatestPrice: (itemId: number) => Promise<LatestPriceData | null>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isConsentGranted: boolean; 
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  portfolioEntries,
  addPortfolioEntry,
  recordSaleAndUpdatePortfolio,
  deletePortfolioEntry, 
  clearAllPortfolioData, // Destructure new prop
  allItems,
  getItemIconUrl,
  getItemName,
  fetchLatestPrice,
  addNotification,
  isConsentGranted,
}) => {
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'add'>('open');
  const [itemToSell, setItemToSell] = useState<PortfolioEntry | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [livePrices, setLivePrices] = useState<Record<number, LatestPriceData | null>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);

  const [entryToDelete, setEntryToDelete] = useState<PortfolioEntry | null>(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState<boolean>(false);
  const [isConfirmClearAllModalOpen, setIsConfirmClearAllModalOpen] = useState<boolean>(false); // New state


  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isConfirmClearAllModalOpen) {
            setIsConfirmClearAllModalOpen(false);
        } else if (isConfirmDeleteModalOpen) {
          setIsConfirmDeleteModalOpen(false);
          setEntryToDelete(null);
        } else if (isSellModalOpen) {
          setIsSellModalOpen(false);
          setItemToSell(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, isSellModalOpen, isConfirmDeleteModalOpen, isConfirmClearAllModalOpen]);
  
  const fetchAllLivePrices = useCallback(async () => {
    if (!isConsentGranted || portfolioEntries.length === 0) return;
    
    const openEntries = portfolioEntries.filter(e => e.quantityPurchased - e.quantitySoldFromThisLot > 0);
    if (openEntries.length === 0) {
        setLivePrices({});
        return;
    }

    setIsLoadingPrices(true);
    const pricesToFetch = new Set(openEntries.map(e => e.itemId));
    const newLivePrices: Record<number, LatestPriceData | null> = {};
    
    const pricePromises = Array.from(pricesToFetch).map(itemId => 
        fetchLatestPrice(itemId)
            .then(priceData => ({ itemId, priceData }))
            .catch(error => {
                console.error(`Failed to fetch price for item ID ${itemId} in portfolio:`, error);
                return { itemId, priceData: null }; 
            })
    );

    const results = await Promise.all(pricePromises);
    results.forEach(result => {
        newLivePrices[result.itemId] = result.priceData;
    });

    setLivePrices(newLivePrices);
    setIsLoadingPrices(false);
  }, [portfolioEntries, fetchLatestPrice, isConsentGranted]);


  useEffect(() => {
    if (isOpen && isConsentGranted) {
      fetchAllLivePrices();
      if (!isSellModalOpen && !isConfirmDeleteModalOpen && !isConfirmClearAllModalOpen) setActiveTab('open'); 
    }
  }, [isOpen, isConsentGranted, fetchAllLivePrices, isSellModalOpen, isConfirmDeleteModalOpen, isConfirmClearAllModalOpen]);


  const handleOpenSellModal = (entry: PortfolioEntry) => {
    setItemToSell(entry);
    setIsSellModalOpen(true);
  };

  const handleCloseSellModal = () => {
    setItemToSell(null);
    setIsSellModalOpen(false);
  };

  const handleConfirmSale = (entryId: string, quantitySold: number, salePrice: number, saleDate: number) => {
    const entryDetails = portfolioEntries.find(e => e.id === entryId);
    if (entryDetails) {
        const originalItemName = getItemName(entryDetails.itemId);
        recordSaleAndUpdatePortfolio(entryId, quantitySold, salePrice, saleDate);
        addNotification(`${quantitySold} of ${originalItemName} sold successfully!`, 'success');
    } else {
        addNotification(`Error: Could not find item details for sale record.`, 'error');
        recordSaleAndUpdatePortfolio(entryId, quantitySold, salePrice, saleDate); 
    }
    fetchAllLivePrices(); 
    handleCloseSellModal();
  };

  const handleOpenConfirmDeleteModal = (entry: PortfolioEntry) => {
    setEntryToDelete(entry);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleCloseConfirmDeleteModal = () => {
    setEntryToDelete(null);
    setIsConfirmDeleteModalOpen(false);
  };

  const handleConfirmDeleteEntry = (entryId: string) => {
    deletePortfolioEntry(entryId);
    fetchAllLivePrices(); 
    handleCloseConfirmDeleteModal();
  };


  if (!isOpen) {
    return null;
  }
  if (!isConsentGranted) { 
    return (
       <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
        onClick={onClose}
        role="dialog" aria-modal="true"
      >
        <div className="bg-[var(--bg-modal)] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <p className="text-[var(--text-primary)] text-lg">Portfolio feature requires consent for preference storage.</p>
            <p className="text-[var(--text-secondary)] mt-2">Please enable it in settings.</p>
            <button
                onClick={onClose}
                className="mt-6 bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2 px-6 rounded-md transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    );
  }
  
  const openPositions = portfolioEntries.filter(e => e.quantityPurchased - e.quantitySoldFromThisLot > 0)
    .sort((a,b) => b.purchaseDate - a.purchaseDate);
  const closedPositions = portfolioEntries.filter(e => e.quantityPurchased - e.quantitySoldFromThisLot <= 0)
    .sort((a,b) => (b.lastSaleDate || b.purchaseDate) - (a.lastSaleDate || a.purchaseDate));


  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-2 sm:p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-modal-title"
    >
      <div
        className="bg-[var(--bg-secondary)] p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-4xl text-[var(--text-primary)] h-[95vh] max-h-[1000px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 id="portfolio-modal-title" className="text-2xl sm:text-3xl font-semibold text-[var(--text-accent)]">My Portfolio</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close portfolio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoadingPrices && (
          <div className="absolute inset-0 bg-[var(--bg-secondary)]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <LoadingSpinner />
            <p className="ml-3 text-[var(--text-accent)]">Refreshing market data...</p>
          </div>
        )}
        
        <PortfolioSummary 
            entries={portfolioEntries} 
            livePrices={livePrices} 
            getItemName={getItemName} 
            onRefreshPrices={fetchAllLivePrices}
            isLoadingPrices={isLoadingPrices}
        />

        <div className="my-4 sm:my-6 border-b border-[var(--border-primary)]">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            {([
                {key: 'open', label: 'Open Positions'}, 
                {key: 'closed', label: 'Closed Positions'},
                {key: 'add', label: 'Add Investment'}
            ] as const ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 sm:px-4 font-medium text-sm sm:text-base rounded-t-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)]
                  ${activeTab === tab.key
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input-secondary)]/70'
                  }`}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-1">
            {activeTab === 'add' && (
                <AddInvestmentForm
                    allItems={allItems}
                    onAddInvestment={addPortfolioEntry}
                    addNotification={addNotification}
                    isConsentGranted={isConsentGranted}
                    fetchLatestPrice={fetchLatestPrice} 
                />
            )}
            {activeTab === 'open' && (
                 <PortfolioTable
                    entries={openPositions}
                    allItems={allItems}
                    getItemIconUrl={getItemIconUrl}
                    getItemName={getItemName}
                    livePrices={livePrices}
                    onSellAction={handleOpenSellModal}
                    onDeleteAction={handleOpenConfirmDeleteModal} 
                    tableType="open"
                />
            )}
            {activeTab === 'closed' && (
                <PortfolioTable
                    entries={closedPositions}
                    allItems={allItems}
                    getItemIconUrl={getItemIconUrl}
                    getItemName={getItemName}
                    livePrices={{}} 
                    tableType="closed"
                />
            )}
        </div>
        
        {/* Footer for Clear All button */}
        <div className="mt-auto pt-4 border-t border-[var(--border-primary)] flex justify-end">
            <button
                onClick={() => setIsConfirmClearAllModalOpen(true)}
                disabled={portfolioEntries.length === 0}
                className="flex items-center text-sm px-4 py-2 rounded-md bg-[var(--error-bg)] hover:bg-[var(--error-bg)]/80 text-[var(--error-text)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--error-text)]/70 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Clear all portfolio data"
            >
                <TrashIcon className="w-4 h-4 mr-2" />
                Clear All Portfolio Data
            </button>
        </div>


        {isSellModalOpen && itemToSell && (
          <SellInvestmentModal
            isOpen={isSellModalOpen}
            onClose={handleCloseSellModal}
            entryToSell={itemToSell}
            allItems={allItems}
            getItemIconUrl={getItemIconUrl}
            getItemName={getItemName}
            onConfirmSale={handleConfirmSale}
            addNotification={addNotification}
          />
        )}

        {isConfirmDeleteModalOpen && entryToDelete && (
          <ConfirmDeletePortfolioEntryModal
            isOpen={isConfirmDeleteModalOpen}
            onClose={handleCloseConfirmDeleteModal}
            entryToDelete={entryToDelete}
            onConfirmDelete={handleConfirmDeleteEntry}
            getItemIconUrl={getItemIconUrl}
            getItemName={getItemName}
          />
        )}

        {isConfirmClearAllModalOpen && (
            <ConfirmClearAllPortfolioModal
                isOpen={isConfirmClearAllModalOpen}
                onClose={() => setIsConfirmClearAllModalOpen(false)}
                onConfirmClearAll={clearAllPortfolioData}
            />
        )}
      </div>
    </div>
  );
};
