
import { useState, useCallback, useEffect } from 'react';
import { AllItemsTimestepResponse, MoverItem, TopMoversData, TopMoversTimespan, ChartDataPoint, TimestepItemPriceVolumeData, ItemMapInfo, TopMoversCalculationMode, TopMoversMetricType } from '../src/types';
import { fetchAllItemsData, fetchHistoricalData } from '../services/runescapeService';
import { MAX_CANDIDATE_ITEMS_PERFORMANCE, MIN_PRICE_FOR_MOVER_CONSIDERATION } from '../constants';


const MAX_PAST_DATA_AGE_1H_MS = 30 * 60 * 1000; 
const MAX_PAST_DATA_AGE_24H_MS = 3 * 60 * 60 * 1000;
const VERY_HIGH_PERCENTAGE_CHANGE = 99999; // For newly traded items with 0 past volume


export const useTopMovers = (allItemsMap: ItemMapInfo[], calculationMode: TopMoversCalculationMode, metricType: TopMoversMetricType) => {
  const [topMoversData, setTopMoversData] = useState<TopMoversData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimespan, setSelectedTimespan] = useState<TopMoversTimespan>('1h');
  const [lastFetchedTimestamp, setLastFetchedTimestamp] = useState<number>(0); // This will store snapshot timestamp in MS

  const calculateMovers = useCallback(async (timespan: TopMoversTimespan, currentMetricType: TopMoversMetricType) => {
     if (allItemsMap.length === 0) {
      setError("Item data is not yet available. Please wait or try refreshing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTopMoversData(null); 

    if (calculationMode === 'accuracy') {
      console.warn("Top Movers: Accuracy mode selected. This may fetch data for a large number of items and could be slow.");
    }

    try {
      const allItemsTimestepApiResponse = await fetchAllItemsData(); // Fetches /5m data
      const itemPriceVolumeDataMap = allItemsTimestepApiResponse.data;
      const snapshotTimestampMs = allItemsTimestepApiResponse.timestamp * 1000; // API returns seconds
      
      const allItemsMapForLookup = new Map(allItemsMap.map(item => [item.id, item]));
      
      let candidateItemsData: ({id:number, name:string, icon:string} & TimestepItemPriceVolumeData)[] = [];

      if (calculationMode === 'performance') {
        const performanceCandidates = Object.entries(itemPriceVolumeDataMap)
          .map(([idStr, priceVolumeData]) => {
            const numericId = parseInt(idStr);
            const itemInfo = allItemsMapForLookup.get(numericId);
            
            if (!itemInfo || 
                priceVolumeData.avgHighPrice === null || 
                priceVolumeData.avgHighPrice < MIN_PRICE_FOR_MOVER_CONSIDERATION ||
                (currentMetricType === 'price' && (priceVolumeData.highPriceVolume === 0 && priceVolumeData.lowPriceVolume === 0))
            ) {
              return null;
            }
            return {
              id: numericId,
              name: itemInfo.name,
              icon: itemInfo.icon,
              ...priceVolumeData, 
            };
          })
          .filter(item => item !== null) as ({id:number, name:string, icon:string} & TimestepItemPriceVolumeData)[];

        performanceCandidates.sort((itemA, itemB) => 
          (itemB.highPriceVolume + itemB.lowPriceVolume) - (itemA.highPriceVolume + itemA.lowPriceVolume)
        );
        candidateItemsData = performanceCandidates.slice(0, MAX_CANDIDATE_ITEMS_PERFORMANCE);

      } else { // Accuracy Mode
        candidateItemsData = Object.entries(itemPriceVolumeDataMap)
          .map(([idStr, priceVolumeData]) => {
            const numericId = parseInt(idStr);
            const itemInfo = allItemsMapForLookup.get(numericId);

            if (!itemInfo || 
                priceVolumeData.avgHighPrice === null || 
                priceVolumeData.avgHighPrice < MIN_PRICE_FOR_MOVER_CONSIDERATION
            ) {
              return null; 
            }
            return {
              id: numericId,
              name: itemInfo.name,
              icon: itemInfo.icon,
              ...priceVolumeData,
            };
          })
          .filter(item => item !== null) as ({id:number, name:string, icon:string} & TimestepItemPriceVolumeData)[];
      }
      
      if (candidateItemsData.length === 0) {
        setTopMoversData({ winners: [], losers: [] });
        setIsLoading(false);
        setLastFetchedTimestamp(snapshotTimestampMs);
        return;
      }

      const historicalDataPromises = candidateItemsData.map(item =>
        fetchHistoricalData(item.id, '5m') 
          .catch(err => {
            console.warn(`Failed to fetch historical data for mover candidate ${item.id} (${item.name}):`, err);
            return [] as ChartDataPoint[]; 
          })
      );

      const historicalDataResults = await Promise.all(historicalDataPromises);
      
      const movers: MoverItem[] = [];
      const nowMs = snapshotTimestampMs; // Use the snapshot's timestamp as "now"

      for (let i = 0; i < candidateItemsData.length; i++) {
        const candidate = candidateItemsData[i];
        const currentPrice = candidate.avgHighPrice!; 
        const currentVolume = (candidate.highPriceVolume || 0) + (candidate.lowPriceVolume || 0);

        if (currentMetricType === 'price' && currentPrice === 0) continue;
        
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
        
        if (!closestPastPoint || smallestDiff > maxPastDataAgeMs) {
            continue;
        }

        let percentChange: number;
        let pastPriceForMoverItem: number;
        let pastVolumeForMoverItem: number | undefined;

        if (currentMetricType === 'price') {
          if (closestPastPoint.price === null || closestPastPoint.price === 0) continue;
          pastPriceForMoverItem = closestPastPoint.price;
          percentChange = ((currentPrice - pastPriceForMoverItem) / pastPriceForMoverItem) * 100;
        } else { // volume metric
          pastPriceForMoverItem = closestPastPoint.price ?? 0; 
          const pastVolume = (closestPastPoint.highPriceVolume || 0) + (closestPastPoint.lowPriceVolume || 0);
          pastVolumeForMoverItem = pastVolume;

          if (pastVolume === 0) {
            percentChange = currentVolume > 0 ? VERY_HIGH_PERCENTAGE_CHANGE : 0; 
          } else {
            percentChange = ((currentVolume - pastVolume) / pastVolume) * 100;
          }
        }
        
        if (isNaN(percentChange) || !isFinite(percentChange)) continue;
        
        movers.push({
          id: candidate.id,
          name: candidate.name,
          icon: candidate.icon,
          currentPrice: currentPrice,
          currentVolume: currentVolume,
          pastPrice: pastPriceForMoverItem,
          pastVolume: pastVolumeForMoverItem,
          percentChange: percentChange,
        });
      }

      const sortedMovers = movers.sort((a, b) => b.percentChange - a.percentChange);
      
      const winners = sortedMovers.filter(m => m.percentChange > 0).slice(0, 5);
      const losers = sortedMovers.filter(m => m.percentChange < 0).sort((a,b) => a.percentChange - b.percentChange).slice(0, 5);

      setTopMoversData({ winners, losers });
      setLastFetchedTimestamp(snapshotTimestampMs); // Set this after all calculations

    } catch (err) {
      console.error('Error fetching top movers data:', err);
      setError('Failed to load market movers. API may be unavailable or an unexpected error occurred.');
      setTopMoversData(null);
      setLastFetchedTimestamp(Date.now()); // Fallback if API fails early
    } finally {
      setIsLoading(false);
    }
  }, [allItemsMap, calculationMode, setIsLoading, setError, setTopMoversData, setLastFetchedTimestamp]);

  const refreshMovers = useCallback(() => {
    calculateMovers(selectedTimespan, metricType);
  }, [calculateMovers, selectedTimespan, metricType]);
  
  useEffect(() => {
    if (allItemsMap.length > 0) { 
        calculateMovers(selectedTimespan, metricType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationMode, metricType, allItemsMap.length > 0 ? true : false]);

  return {
    topMoversData,
    isLoading,
    error,
    selectedTimespan,
    setSelectedTimespan: (ts: TopMoversTimespan) => {
      setSelectedTimespan(ts);
      if (allItemsMap.length > 0) calculateMovers(ts, metricType);
    },
    refreshMovers,
    fetchMovers: (ts: TopMoversTimespan, mt: TopMoversMetricType) => calculateMovers(ts, mt),
    lastFetchedTimestamp,
  };
};
