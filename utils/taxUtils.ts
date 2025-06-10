
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
