
import { ItemMapInfo, ItemMappingResponse, LatestPriceData, LatestPriceApiResponse, HistoricalDataPointAPI, TimeseriesApiResponse, ChartDataPoint, TimespanAPI, AllItemsTimestepResponse } from '../src/types'; // Updated import path
import { API_BASE_URL } from '../constants';

// Helper to make API requests
async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      // The API documentation suggests a User-Agent. For client-side, this is less controllable
      // but good practice to note.
      // 'User-Agent': 'YourAppName/1.0 (yourcontact@example.com or GitHub repo)'
    }
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchItemMapping(): Promise<ItemMapInfo[]> {
  const response = await apiRequest<ItemMappingResponse>('/mapping');
  return Object.values(response); // Convert object of items to array
}

export async function fetchLatestPrice(itemId: number): Promise<LatestPriceData | null> {
  try {
    const response = await apiRequest<LatestPriceApiResponse>(`/latest?id=${itemId}`);
    if (response.data && response.data[itemId.toString()]) {
      return response.data[itemId.toString()];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching latest price for item ID ${itemId}:`, error);
    // Return null or throw, depending on desired error handling for the caller
    return null; 
  }
}

export async function fetchHistoricalData(itemId: number, timespan: TimespanAPI): Promise<ChartDataPoint[]> {
  const response = await apiRequest<TimeseriesApiResponse>(`/timeseries?timestep=${timespan}&id=${itemId}`);
  if (!response.data) return [];
  
  const now = Date.now(); // Get current time in milliseconds

  return response.data
    .filter(dp => {
      const pointTimestampMs = dp.timestamp * 1000;
      return dp.avgHighPrice !== null && pointTimestampMs <= now; // Filter out future timestamps and null prices
    })
    .map(dp => ({
      timestamp: dp.timestamp * 1000, // Convert seconds to milliseconds for JS Date
      price: dp.avgHighPrice as number, // This is avgHighPrice, already filtered for null
      avgLowPrice: dp.avgLowPrice === null ? undefined : dp.avgLowPrice, // Add avgLowPrice
      highPriceVolume: dp.highPriceVolume,
      lowPriceVolume: dp.lowPriceVolume,
      formattedDate: new Date(dp.timestamp * 1000).toLocaleString(), // Keep for potential use, though custom tooltip will format
    }));
}

export async function fetchAllItemsData(): Promise<AllItemsTimestepResponse> {
  return apiRequest<AllItemsTimestepResponse>('/5m'); // Changed from /all to /5m
}