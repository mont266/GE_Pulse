import React, { useState, useMemo } from 'react';
import { PortfolioEntry, ItemMapInfo, LatestPriceData } from '../../src/types';
import { TrashIcon, EditIcon, PortfolioIcon } from '../Icons';
import { calculateBreakEvenPrice } from '../../utils/taxUtils';

type SortKey = 
  | 'item' | 'qtyRemaining' | 'avgBuy' | 'breakEvenPrice' | 'totalCost' | 'currPrice' | 'currValue' | 'unrealPL' | 'date'
  | 'qtySold' | 'avgSell' | 'totalProceeds' | 'taxPaid' | 'realPL' | 'saleDate';

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
  onSelectItemAction?: (itemId: number) => void;
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
  onSelectItemAction,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(() => {
    // Sensible default sort
    if (tableType === 'open') {
      return { key: 'unrealPL', direction: 'desc' };
    }
    return { key: 'realPL', direction: 'desc' };
  });

  const sortedEntries = useMemo(() => {
    let sortableItems = [...entries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortableValue = (entry: PortfolioEntry, key: SortKey): string | number | null => {
          const itemInfo = allItems.find(i => i.id === entry.itemId);
          if (!itemInfo) return null;

          const qtyPurchased = entry.quantityPurchased;
          const purchasePrice = entry.purchasePricePerItem;
          const qtyRemaining = qtyPurchased - entry.quantitySoldFromThisLot;
          const livePriceData = livePrices[entry.itemId];
          const currentPrice = livePriceData?.high ?? null;

          switch (key) {
            case 'item': return getItemName(entry.itemId);
            case 'date': return entry.purchaseDate;
            case 'saleDate': return entry.lastSaleDate || entry.purchaseDate;
            
            case 'qtyRemaining': return qtyRemaining;
            case 'avgBuy': return purchasePrice;
            case 'breakEvenPrice': return calculateBreakEvenPrice(entry.purchasePricePerItem, entry.itemId);
            case 'totalCost':
              if (tableType === 'open') return qtyRemaining * purchasePrice;
              return entry.quantitySoldFromThisLot * purchasePrice;
            
            case 'currPrice': return currentPrice;
            case 'currValue': return currentPrice !== null ? qtyRemaining * currentPrice : null;
            case 'unrealPL': {
              const costOfRem = qtyRemaining * purchasePrice;
              const currValue = currentPrice !== null ? qtyRemaining * currentPrice : null;
              return currValue !== null ? currValue - costOfRem : null;
            }

            case 'qtySold': return entry.quantitySoldFromThisLot;
            case 'avgSell': return entry.quantitySoldFromThisLot > 0 ? entry.totalProceedsFromThisLot / entry.quantitySoldFromThisLot : 0;
            case 'totalProceeds': return entry.totalProceedsFromThisLot;
            case 'taxPaid': return entry.totalTaxPaidFromThisLot;
            case 'realPL': {
              const costOfSold = entry.quantitySoldFromThisLot * purchasePrice;
              return (entry.totalProceedsFromThisLot - costOfSold) - entry.totalTaxPaidFromThisLot;
            }
            default: return null;
          }
        };

        const valA = getSortableValue(a, sortConfig.key);
        const valB = getSortableValue(b, sortConfig.key);

        if (valA === null) return 1;
        if (valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
    }
    return sortableItems;
  }, [entries, sortConfig, livePrices, allItems, getItemName, tableType]);


  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else {
      if (['unrealPL', 'realPL', 'totalCost', 'currValue', 'date', 'saleDate', 'breakEvenPrice'].includes(key)) {
        direction = 'desc';
      }
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode, numeric?: boolean }> = ({ sortKey, children, numeric }) => {
    const isSorting = sortConfig?.key === sortKey;
    return (
      <th
        scope="col"
        className={`sticky top-0 z-10 bg-[var(--bg-input-secondary)] px-3 py-3 text-left text-xs font-medium text-[var(--text-accent)] uppercase tracking-wider ${numeric ? 'text-right' : ''}`}
      >
        <button onClick={() => requestSort(sortKey)} className={`flex items-center gap-1 w-full ${numeric ? 'justify-end' : ''} transition-colors hover:text-[var(--text-primary)]`}>
          {children}
          <span className="text-base">
            {isSorting ? (sortConfig.direction === 'asc' ? '▲' : '▼') : <span className="opacity-30">↕</span>}
          </span>
        </button>
      </th>
    );
  };

  if (entries.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center text-center py-10 text-[var(--text-secondary)] overflow-hidden">
        <PortfolioIcon className="absolute w-28 h-28 text-[var(--bg-tertiary)] opacity-60" />
        <div className="relative">
            <p className="font-semibold text-base text-[var(--text-primary)]">No {tableType} positions found</p>
            {tableType === 'open' ? (
                <p className="text-sm mt-1 text-[var(--text-secondary)]">Use the "Add New" tab to log an investment.</p>
            ) : (
                 <p className="text-sm mt-1 text-[var(--text-secondary)]">Sold investments will appear here.</p>
            )}
        </div>
      </div>
    );
  }

  const columnsOpen: { header: string, accessor: SortKey, numeric?: boolean, shorthand?: boolean }[] = [
    { header: 'Item', accessor: 'item' },
    { header: 'Qty Rem.', accessor: 'qtyRemaining', numeric: true },
    { header: 'Avg. Buy', accessor: 'avgBuy', numeric: true, shorthand: true },
    { header: 'B/E Price', accessor: 'breakEvenPrice', numeric: true, shorthand: true },
    { header: 'Total Cost', accessor: 'totalCost', numeric: true, shorthand: true },
    { header: 'Curr. Price', accessor: 'currPrice', numeric: true, shorthand: true },
    { header: 'Curr. Value', accessor: 'currValue', numeric: true, shorthand: true },
    { header: 'Unreal. P/L', accessor: 'unrealPL', numeric: true, shorthand: true },
    { header: 'Date', accessor: 'date' },
  ];

  const columnsClosed: { header: string, accessor: SortKey, numeric?: boolean, shorthand?: boolean }[] = [
    { header: 'Item', accessor: 'item' },
    { header: 'Qty Sold', accessor: 'qtySold', numeric: true },
    { header: 'Avg. Buy', accessor: 'avgBuy', numeric: true, shorthand: true },
    { header: 'Total Cost', accessor: 'totalCost', numeric: true, shorthand: true },
    { header: 'Avg. Sell', accessor: 'avgSell', numeric: true, shorthand: true },
    { header: 'Total Proceeds', accessor: 'totalProceeds', numeric: true, shorthand: true },
    { header: 'Tax Paid', accessor: 'taxPaid', numeric: true, shorthand: true },
    { header: 'Real. P/L', accessor: 'realPL', numeric: true, shorthand: true },
    { header: 'Sale Date', accessor: 'saleDate' },
  ];

  const columns = tableType === 'open' ? columnsOpen : columnsClosed;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--border-primary)]">
        <thead className="bg-[var(--bg-input-secondary)]">
          <tr>
            {columns.map(col => (
              <SortableHeader key={col.accessor} sortKey={col.accessor} numeric={col.numeric}>
                {col.header}
              </SortableHeader>
            ))}
             <th scope="col" className="sticky top-0 z-10 bg-[var(--bg-input-secondary)] px-3 py-3 text-center text-xs font-medium text-[var(--text-accent)] uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-[var(--bg-secondary)] divide-y divide-[var(--border-primary)]">
          {sortedEntries.map(entry => {
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
            const breakEvenPrice = calculateBreakEvenPrice(entry.purchasePricePerItem, entry.itemId);

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
                        <img loading="lazy" src={getItemIconUrl(itemInfo.icon)} alt="" className="w-7 h-7 mr-2 object-contain flex-shrink-0" />
                        <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors truncate" title={itemInfo.name}>
                        {itemInfo.name}
                        </span>
                    </button>
                  ) : (
                    <div className="flex items-center">
                        <img loading="lazy" src={getItemIconUrl(itemInfo.icon)} alt={itemInfo.name} className="w-7 h-7 mr-2 object-contain flex-shrink-0" />
                        <span className="text-sm text-[var(--text-primary)] truncate" title={itemInfo.name}>{itemInfo.name}</span>
                    </div>
                  )}
                </td>

                {tableType === 'open' ? (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right">{qtyRemaining.toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(purchasePrice)}>{formatGP(purchasePrice, true)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right" title={formatGP(breakEvenPrice)}>{formatGP(breakEvenPrice, true)}</td>
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