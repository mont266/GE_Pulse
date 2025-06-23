
import React from 'react';
import { PortfolioEntry, ItemMapInfo, LatestPriceData } from '../../src/types';
import { TrashIcon, EditIcon } from '../Icons'; // Import EditIcon

interface PortfolioTableProps {
  entries: PortfolioEntry[];
  allItems: ItemMapInfo[]; 
  getItemIconUrl: (iconName: string) => string;
  getItemName: (itemId: number) => string;
  livePrices: Record<number, LatestPriceData | null>; 
  tableType: 'open' | 'closed';
  onSellAction?: (entry: PortfolioEntry) => void; 
  onDeleteAction?: (entry: PortfolioEntry) => void; 
  onEditAction?: (entry: PortfolioEntry) => void;
  onSelectItemAction?: (itemId: number) => void; // New prop for item click
}

const formatGP = (value?: number | null, shorthand: boolean = false): string => {
  if (value === null || value === undefined) return 'N/A';
  if (shorthand) {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString() + ' GP';
};

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString();
};

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  entries,
  allItems,
  getItemIconUrl,
  getItemName,
  livePrices,
  tableType,
  onSellAction,
  onDeleteAction, 
  onEditAction,
  onSelectItemAction, // Destructure new prop
}) => {
  if (entries.length === 0) {
    return <p className="text-[var(--text-secondary)] text-center py-6">No {tableType} positions found.</p>;
  }

  const columnsOpen = [
    { header: 'Item', accessor: 'item' },
    { header: 'Qty Rem.', accessor: 'qtyRemaining', numeric: true },
    { header: 'Avg. Buy', accessor: 'avgBuy', numeric: true, shorthand: true },
    { header: 'Total Cost', accessor: 'totalCost', numeric: true, shorthand: true },
    { header: 'Curr. Price', accessor: 'currPrice', numeric: true, shorthand: true },
    { header: 'Curr. Value', accessor: 'currValue', numeric: true, shorthand: true },
    { header: 'Unreal. P/L', accessor: 'unrealPL', numeric: true, shorthand: true },
    { header: 'Date', accessor: 'date' },
    { header: 'Actions', accessor: 'actions'},
  ];

  const columnsClosed = [
    { header: 'Item', accessor: 'item' },
    { header: 'Qty Sold', accessor: 'qtySold', numeric: true },
    { header: 'Avg. Buy', accessor: 'avgBuy', numeric: true, shorthand: true },
    { header: 'Total Cost', accessor: 'totalCost', numeric: true, shorthand: true },
    { header: 'Avg. Sell', accessor: 'avgSell', numeric: true, shorthand: true },
    { header: 'Total Proceeds', accessor: 'totalProceeds', numeric: true, shorthand: true },
    { header: 'Tax Paid', accessor: 'taxPaid', numeric: true, shorthand: true },
    { header: 'Real. P/L', accessor: 'realPL', numeric: true, shorthand: true },
    { header: 'Sale Date', accessor: 'saleDate' },
    { header: 'Actions', accessor: 'actions' }, // Added Actions column for closed
  ];

  const columns = tableType === 'open' ? columnsOpen : columnsClosed;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--border-primary)]">
        <thead className="bg-[var(--bg-input-secondary)]">
          <tr>
            {columns.map(col => (
              <th
                key={col.accessor}
                scope="col"
                className={`px-3 py-3 text-left text-xs font-medium text-[var(--text-accent)] uppercase tracking-wider ${col.numeric ? 'text-right' : ''} ${col.accessor === 'actions' ? 'text-center' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[var(--bg-secondary)] divide-y divide-[var(--border-primary)]">
          {entries.map(entry => {
            const itemInfo = allItems.find(i => i.id === entry.itemId);
            if (!itemInfo) return null; 

            const qtyPurchased = entry.quantityPurchased;
            const purchasePrice = entry.purchasePricePerItem;
            
            const qtyRemaining = qtyPurchased - entry.quantitySoldFromThisLot;
            const currentMarketPriceData = livePrices[entry.itemId];
            const currentMarketPrice = currentMarketPriceData?.high ?? null;
            const costOfRemaining = qtyRemaining * purchasePrice;
            const currentValue = currentMarketPrice !== null ? qtyRemaining * currentMarketPrice : null;
            const unrealizedPL = currentValue !== null ? currentValue - costOfRemaining : null;

            const qtySoldThisLot = entry.quantitySoldFromThisLot;
            const costOfSold = qtySoldThisLot * purchasePrice;
            const avgSalePrice = qtySoldThisLot > 0 ? entry.totalProceedsFromThisLot / qtySoldThisLot : 0;
            const taxPaidThisLot = entry.totalTaxPaidFromThisLot;
            const realizedPLThisLot = (entry.totalProceedsFromThisLot - costOfSold) - taxPaidThisLot;


            return (
              <tr key={entry.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="px-3 py-3 whitespace-nowrap">
                  {onSelectItemAction ? (
                    <button
                        onClick={() => onSelectItemAction(entry.itemId)}
                        className="flex items-center group focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)] focus:ring-offset-1 focus:ring-offset-[var(--bg-secondary)] rounded-sm p-0.5 -m-0.5 w-full text-left"
                        aria-label={`View details for ${itemInfo.name}`}
                    >
                        <img src={getItemIconUrl(itemInfo.icon)} alt="" className="w-7 h-7 mr-2 object-contain flex-shrink-0" />
                        <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors truncate" title={itemInfo.name}>
                        {itemInfo.name}
                        </span>
                    </button>
                  ) : (
                    <div className="flex items-center">
                        <img src={getItemIconUrl(itemInfo.icon)} alt={itemInfo.name} className="w-7 h-7 mr-2 object-contain flex-shrink-0" />
                        <span className="text-sm text-[var(--text-primary)] truncate" title={itemInfo.name}>{itemInfo.name}</span>
                    </div>
                  )}
                </td>

                {tableType === 'open' ? (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right">{qtyRemaining.toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(purchasePrice)}>{formatGP(purchasePrice, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(costOfRemaining)}>{formatGP(costOfRemaining, true)}</td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm text-right ${currentMarketPrice === null ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`} title={formatGP(currentMarketPrice)}>{formatGP(currentMarketPrice, true)}</td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm text-right ${currentValue === null ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`} title={formatGP(currentValue)}>{formatGP(currentValue, true)}</td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium text-right ${unrealizedPL === null ? 'text-[var(--text-muted)]' : unrealizedPL >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]'}`} title={formatGP(unrealizedPL)}>{formatGP(unrealizedPL, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-muted)]">{formatDate(entry.purchaseDate)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-1 sm:space-x-1.5">
                        {onSellAction && (
                          <button
                            onClick={() => onSellAction(entry)}
                            className="text-[var(--bg-interactive)] hover:text-[var(--bg-interactive-hover)] font-medium py-1 px-1.5 sm:px-2 rounded-md text-xs bg-[var(--bg-interactive)]/10 hover:bg-[var(--bg-interactive)]/20 transition-colors"
                            aria-label={`Sell ${itemInfo.name}`}
                          >
                            Sell
                          </button>
                        )}
                        {onEditAction && (
                           <button
                            onClick={() => onEditAction(entry)}
                            className="text-[var(--text-accent)] hover:text-[var(--text-accent)]/80 p-0.5 sm:p-1 rounded-full hover:bg-[var(--text-accent)]/10 transition-colors"
                            aria-label={`Edit investment lot for ${itemInfo.name}`}
                            title="Edit this lot"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteAction && (
                           <button
                            onClick={() => onDeleteAction(entry)}
                            className="text-[var(--price-low)] hover:text-[var(--price-low)]/80 p-0.5 sm:p-1 rounded-full hover:bg-[var(--price-low)]/10 transition-colors"
                            aria-label={`Delete investment lot for ${itemInfo.name}`}
                            title="Delete this lot"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                ) : ( // Closed positions
                  <>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right">{qtySoldThisLot.toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(purchasePrice)}>{formatGP(purchasePrice, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(costOfSold)}>{formatGP(costOfSold, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(avgSalePrice)}>{formatGP(avgSalePrice, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(entry.totalProceedsFromThisLot)}>{formatGP(entry.totalProceedsFromThisLot, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-muted)] text-right" title={formatGP(taxPaidThisLot)}>{formatGP(taxPaidThisLot, true)}</td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium text-right ${realizedPLThisLot >= 0 ? 'text-[var(--price-high)]' : 'text-[var(--price-low)]'}`} title={formatGP(realizedPLThisLot)}>{formatGP(realizedPLThisLot, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-muted)]">{formatDate(entry.lastSaleDate)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                       <div className="flex items-center justify-center space-x-1 sm:space-x-1.5">
                          {onEditAction && (
                             <button
                              onClick={() => onEditAction(entry)}
                              className="text-[var(--text-accent)] hover:text-[var(--text-accent)]/80 p-0.5 sm:p-1 rounded-full hover:bg-[var(--text-accent)]/10 transition-colors"
                              aria-label={`Edit original purchase details for ${itemInfo.name}`}
                              title="Edit purchase details"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                          )}
                           {onDeleteAction && ( // Retain delete for closed positions as well
                             <button
                              onClick={() => onDeleteAction(entry)}
                              className="text-[var(--price-low)] hover:text-[var(--price-low)]/80 p-0.5 sm:p-1 rounded-full hover:bg-[var(--price-low)]/10 transition-colors"
                              aria-label={`Delete investment lot for ${itemInfo.name}`}
                              title="Delete this lot"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
