import { GE_TAX_RATE, GE_TAX_CAP, TAX_EXEMPT_ITEM_IDS } from '../constants';

/**
 * Calculates the Grand Exchange tax for a transaction.
 * @param salePricePerItem The price each item was sold for.
 * @param quantitySold The number of items sold.
 * @param itemId The ID of the item sold.
 * @returns The total tax amount for the transaction.
 */
export const calculateGeTax = (
  salePricePerItem: number,
  quantitySold: number,
  itemId: number
): number => {
  if (TAX_EXEMPT_ITEM_IDS.includes(itemId)) {
    return 0;
  }

  const totalSaleValue = salePricePerItem * quantitySold;

  // Tax is 2% of total value, rounded down
  const rawTax = Math.floor(totalSaleValue * GE_TAX_RATE);

  // If tax is less than 1 GP (e.g. item value < 50gp), no tax is paid
  if (rawTax < 1) {
    return 0;
  }

  // Apply the 5M GP cap
  return Math.min(rawTax, GE_TAX_CAP);
};

/**
 * Calculates the break-even sale price for an item to not make a loss after tax.
 * @param purchasePricePerItem The price the item was bought for.
 * @param itemId The ID of the item.
 * @returns The minimum integer sale price to break even or profit.
 */
export const calculateBreakEvenPrice = (
  purchasePricePerItem: number,
  itemId: number
): number => {
  if (TAX_EXEMPT_ITEM_IDS.includes(itemId)) {
    return purchasePricePerItem;
  }
  // To break even, Profit >= 0.
  // Profit = SalePrice - PurchasePrice - Tax
  // SalePrice - PurchasePrice - floor(SalePrice * TaxRate) >= 0
  // SalePrice - floor(SalePrice * TaxRate) >= PurchasePrice
  // The smallest integer SalePrice that satisfies this is what we need.
  // A close approximation is PurchasePrice / (1 - TaxRate). We ceil it to be safe.
  const breakEven = Math.ceil(purchasePricePerItem / (1 - GE_TAX_RATE));
  return breakEven;
};
