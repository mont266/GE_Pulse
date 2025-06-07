import { useState, useCallback, useEffect } from 'react';
import { AllItemsTimestepResponse, MoverItem, TopMoversData, TopMoversTimespan, ChartDataPoint, TimestepItemPriceVolumeData, ItemMapInfo } from '../src/types';
import { fetchAllItemsData, fetchHistoricalData } from '../services/runescapeService';

const MAX_CANDIDATE_ITEMS = 50; // Number of most active items to check for movers
const MIN_PRICE_FOR_MOVER_CONSIDERATION = 100; // Minimum current price for an item to be considered a mover (to avoid noise from very cheap items)
const MAX_PAST_DATA_AGE_1H_MS = 30 * 60 * 1000; // For 1h movers, past data point shouldn't be older than 30 mins from target
const MAX_PAST_DATA_AGE_24H_MS = 3 * 60 * 60 * 1000; // For 24h movers, past data point shouldn't be older than 3 hours from target


export const useTopMovers = (allItemsMap: ItemMapInfo[]) => {
  const [topMoversData, setTopMoversData] = useState<TopMoversData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimespan, setSelectedTimespan] = useState<TopMoversTimespan>('1h');
  const [lastFetchedTimestamp, setLastFetchedTimestamp] = useState<number>(0);

  const calculateMovers = useCallback(async (timespan: TopMoversTimespan) => {
     if (allItemsMap.length === 0) {
      setError("Item data is not yet available. Please wait or try refreshing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTopMoversData(null); 

    try {
      const allItemsTimestepApiResponse = await fetchAllItemsData();
      const itemPriceVolumeDataMap = allItemsTimestepApiResponse.data;
      
      const allItemsMapForLookup = new Map(allItemsMap.map(item => [item.id, item]));

      const candidateItemsData = Object.entries(itemPriceVolumeDataMap)
        .map(([idStr, priceVolumeData]) => {
          const numericId = parseInt(idStr);
          const itemInfo = allItemsMapForLookup.get(numericId);
          
          if (!itemInfo || 
              priceVolumeData.avgHighPrice === null || 
              priceVolumeData.avgHighPrice < MIN_PRICE_FOR_MOVER_CONSIDERATION ||
              (priceVolumeData.highPriceVolume === 0 && priceVolumeData.lowPriceVolume === 0)
          ) {
            return null;
          }
          return {
            id: numericId,
            name: itemInfo.name,
            icon: itemInfo.icon,
            avgHighPrice: priceVolumeData.avgHighPrice, 
            highPriceVolume: priceVolumeData.highPriceVolume,
            avgLowPrice: priceVolumeData.avgLowPrice,
            lowPriceVolume: priceVolumeData.lowPriceVolume,
          };
        })
        .filter(item => item !== null) as ({id:number, name:string, icon:string} & TimestepItemPriceVolumeData)[];


      candidateItemsData.sort((itemA, itemB) =>
        (itemB.highPriceVolume + itemB.lowPriceVolume) - (itemA.highPriceVolume + itemA.lowPriceVolume)
      );
      
      const topCandidateItems = candidateItemsData.slice(0, MAX_CANDIDATE_ITEMS);
      
      if (topCandidateItems.length === 0) {
        setTopMoversData({ winners: [], losers: [] });
        setIsLoading(false);
        setLastFetchedTimestamp(Date.now());
        return;
      }

      const historicalDataPromises = topCandidateItems.map(item =>
        fetchHistoricalData(item.id, '5m') 
          .catch(err => {
            console.warn(`Failed to fetch historical data for mover candidate ${item.id}:`, err);
            return [] as ChartDataPoint[]; 
          })
      );

      const historicalDataResults = await Promise.all(historicalDataPromises);
      setLastFetchedTimestamp(Date.now());

      const movers: MoverItem[] = [];
      const nowMs = allItemsTimestepApiResponse.timestamp * 1000;

      for (let i = 0; i < topCandidateItems.length; i++) {
        const candidate = topCandidateItems[i];
        
        const currentPrice = candidate.avgHighPrice; 
        if (currentPrice === 0) continue; 

        const historicalPoints = historicalDataResults[i];
        if (historicalPoints.length === 0) continue;

        let pastPriceReferenceMs: number;
        let maxPastDataAgeMs: number;

        if (timespan === '1h') {
          pastPriceReferenceMs = nowMs - (1 * 60 * 60 * 1000);
          maxPastDataAgeMs = MAX_PAST_DATA_AGE_1H_MS;
        } else { // 24h
          pastPriceReferenceMs = nowMs - (24 * 60 * 60 * 1000);
          maxPastDataAgeMs = MAX_PAST_DATA_AGE_24H_MS;
        }
        
        let closestPastPoint: ChartDataPoint | null = null;
        let smallestDiff = Infinity;

        for (let j = historicalPoints.length - 1; j >= 0; j--) {
            const point = historicalPoints[j];
            if (point.timestamp > pastPriceReferenceMs + maxPastDataAgeMs) continue; 
            if (point.timestamp < pastPriceReferenceMs - maxPastDataAgeMs && closestPastPoint) break;

            const diff = Math.abs(point.timestamp - pastPriceReferenceMs);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestPastPoint = point;
            } else if (diff > smallestDiff && point.timestamp < pastPriceReferenceMs) { 
                break;
            }
        }
        
        if (!closestPastPoint || smallestDiff > maxPastDataAgeMs || closestPastPoint.price === null || closestPastPoint.price === 0) {
            continue;
        }
        
        const pastPrice = closestPastPoint.price;
        const percentChange = ((currentPrice - pastPrice) / pastPrice) * 100;

        if (isNaN(percentChange) || !isFinite(percentChange)) continue;
        
        movers.push({
          id: candidate.id,
          name: candidate.name,
          icon: candidate.icon,
          currentPrice: currentPrice,
          pastPrice: pastPrice,
          percentChange: percentChange,
        });
      }

      const sortedMovers = movers.sort((a, b) => b.percentChange - a.percentChange);
      
      const winners = sortedMovers.filter(m => m.percentChange > 0).slice(0, 5);
      const losers = sortedMovers.filter(m => m.percentChange < 0).sort((a,b) => a.percentChange - b.percentChange).slice(0, 5);

      setTopMoversData({ winners, losers });

    } catch (err) {
      console.error('Error fetching top movers data:', err);
      setError('Failed to load market movers. API may be unavailable or an unexpected error occurred.');
      setTopMoversData(null);
    } finally {
      setIsLoading(false);
    }
  }, [allItemsMap, setIsLoading, setError, setTopMoversData, setLastFetchedTimestamp]);

  const refreshMovers = useCallback(() => {
    calculateMovers(selectedTimespan);
  }, [calculateMovers, selectedTimespan]);
  
  return {
    topMoversData,
    isLoading,
    error,
    selectedTimespan,
    setSelectedTimespan,
    refreshMovers,
    fetchMovers: calculateMovers,
    lastFetchedTimestamp,
  };
};