import React, { useState, useEffect, useRef } from 'react';
import { PortfolioEntry, ItemMapInfo } from '../../src/types'; // Corrected path
import { ITEM_IMAGE_BASE_URL } from '../../constants';
import { calculateGeTax, calculateBreakEvenPrice } from '../../utils/taxUtils'; // Import both utilities

interface SellInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToSell: PortfolioEntry | null;
  allItems: ItemMapInfo[]; // For item details
  getItemIconUrl: (iconName: string) => string;
  getItemName: (itemId: number) => string;
  onConfirmSale: (entryId: string, quantitySold: number, salePrice: number, saleDate: number) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Helper: Parse shorthand price (e.g., 100k, 2.5m)
const parseShorthandPrice = (value: string): number | null => {
  const cleanedValue = value.trim().toLowerCase();
  if (!cleanedValue) return null;
  let multiplier = 1;
  let numericPartStr = cleanedValue;

  if (cleanedValue.endsWith('k')) {
    multiplier = 1000;
    numericPartStr = cleanedValue.slice(0, -1);
  } else if (cleanedValue.endsWith('m')) {
    multiplier = 1000000;
    numericPartStr = cleanedValue.slice(0, -1);
  } else if (cleanedValue.endsWith('b')) {
    multiplier = 1000000000;
    numericPartStr = cleanedValue.slice(0, -1);
  }
  
  if (numericPartStr === '' || isNaN(parseFloat(numericPartStr))) {
     if (cleanedValue.match(/^[0-9.]+$/)) { 
        const num = parseFloat(cleanedValue);
        return !isNaN(num) && num >= 0 ? num : null; // Allow 0 for sale price
    }
    return null;
  }
  const numericValue = parseFloat(numericPartStr);
  if (isNaN(numericValue) || numericValue < 0) return null; // Allow 0
  const finalValue = numericValue * multiplier;
  return finalValue >= 0 ? Math.floor(finalValue) : null; // Allow 0
};


export const SellInvestmentModal: React.FC<SellInvestmentModalProps> = ({
  isOpen,
  onClose,
  entryToSell,
  allItems, 
  getItemIconUrl,
  getItemName,
  onConfirmSale,
  addNotification,
}) => {
  const [quantityToSellInput, setQuantityToSellInput] = useState('');
  const [salePriceInput, setSalePriceInput] = useState('');
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [estimatedTax, setEstimatedTax] = useState<number>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number>(0);
  const [breakEvenPrice, setBreakEvenPrice] = useState<number>(0);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const itemInfo = entryToSell ? allItems.find(i => i.id === entryToSell.itemId) : null;
  const itemNameDisplay = itemInfo?.name || `Item ID ${entryToSell?.itemId}`;


  useEffect(() => {
    if (isOpen && entryToSell && itemInfo) {
      const remainingQty = entryToSell.quantityPurchased - entryToSell.quantitySoldFromThisLot;
      setQuantityToSellInput(remainingQty.toString());
      setSalePriceInput('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setEstimatedTax(0);
      setEstimatedProfit(0);

      const bePrice = calculateBreakEvenPrice(entryToSell.purchasePricePerItem, itemInfo.id);
      setBreakEvenPrice(bePrice);
      
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  }, [isOpen, entryToSell, itemInfo]);

  // Calculate estimated tax and profit dynamically
  useEffect(() => {
    if (entryToSell && itemInfo) {
      const quantity = parseInt(quantityToSellInput, 10);
      const price = parseShorthandPrice(salePriceInput);
      if (!isNaN(quantity) && quantity > 0 && price !== null && price >= 0) {
        const tax = calculateGeTax(price, quantity, itemInfo.id);
        setEstimatedTax(tax);

        const proceeds = price * quantity;
        const cost = entryToSell.purchasePricePerItem * quantity;
        const profit = proceeds - cost - tax;
        setEstimatedProfit(profit);
      } else {
        setEstimatedTax(0);
        setEstimatedProfit(0);
      }
    }
  }, [quantityToSellInput, salePriceInput, entryToSell, itemInfo]);


  if (!isOpen || !entryToSell || !itemInfo) {
    return null;
  }
  
  const remainingQuantity = entryToSell.quantityPurchased - entryToSell.quantitySoldFromThisLot;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityToSell = parseInt(quantityToSellInput, 10);
    const salePrice = parseShorthandPrice(salePriceInput);
    const dateTimestamp = new Date(saleDate).getTime();

    if (isNaN(quantityToSell) || quantityToSell <= 0) {
      addNotification('Quantity to sell must be a positive number.', 'error');
      return;
    }
    if (quantityToSell > remainingQuantity) {
      addNotification(`Cannot sell more than available (${remainingQuantity.toLocaleString()}).`, 'error');
      return;
    }
    if (salePrice === null || salePrice < 0) { // Allow 0 GP sale price
      addNotification('Invalid sale price. Use numbers or shorthand (e.g., 100k). Must be zero or positive.', 'error');
      return;
    }
    if (isNaN(dateTimestamp)) {
      addNotification('Invalid sale date.', 'error');
      return;
    }
    
    // onConfirmSale is now called from PortfolioModal to pass itemName for notification
    onConfirmSale(entryToSell.id, quantityToSell, salePrice, dateTimestamp);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4" // Higher z-index than PortfolioModal
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sell-investment-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-md text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="sell-investment-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Sell: <span className="text-[var(--text-primary)]">{itemNameDisplay}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close sell modal"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center mb-4 p-3 bg-[var(--bg-input-secondary)] rounded-md">
            <img loading="lazy" src={getItemIconUrl(itemInfo.icon)} alt={itemInfo.name} className="w-10 h-10 mr-3 object-contain"/>
            <div>
                <p className="text-sm text-[var(--text-secondary)]">
                    Lot purchased on: {new Date(entryToSell.purchaseDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                    Original Qty: {entryToSell.quantityPurchased.toLocaleString()} @ {entryToSell.purchasePricePerItem.toLocaleString()} GP each
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                    Remaining in this lot: {remainingQuantity.toLocaleString()}
                </p>
            </div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sellQuantity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Quantity to Sell
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                id="sellQuantity"
                value={quantityToSellInput}
                onChange={(e) => setQuantityToSellInput(e.target.value)}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none"
                min="1"
                max={remainingQuantity}
                required
              />
            </div>
            <div>
              <label htmlFor="sellPrice" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Sale Price (per item)
              </label>
              <input
                type="text"
                id="sellPrice"
                value={salePriceInput}
                onChange={(e) => setSalePriceInput(e.target.value)}
                placeholder="e.g., 2k or 2000"
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                required
              />
            </div>
          </div>
           <div>
                <label htmlFor="sellDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Sale Date
                </label>
                <input
                    type="date"
                    id="sellDate"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                    required
                />
            </div>
            
            <div className="mt-3 p-3 bg-[var(--bg-input-secondary)] rounded-md text-sm space-y-1">
                <div>
                    <span className="text-[var(--text-muted)]">Estimated Tax for this Sale: </span>
                    <span className="font-medium text-[var(--text-primary)]">{estimatedTax.toLocaleString()} GP</span>
                </div>
                <div>
                    <span className="text-[var(--text-muted)]">Estimated Profit for this Sale: </span>
                    <span className={`font-medium ${estimatedProfit >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]'}`}>
                        {estimatedProfit.toLocaleString()} GP
                    </span>
                </div>
                <div>
                    <span className="text-[var(--text-muted)]">Break-Even Sale Price: </span>
                    <span className="font-medium text-[var(--text-primary)]">
                        {breakEvenPrice.toLocaleString()} GP
                    </span>
                </div>
            </div>


          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-opacity-50 disabled:opacity-60"
              disabled={!quantityToSellInput || !salePriceInput}
            >
              Confirm Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};