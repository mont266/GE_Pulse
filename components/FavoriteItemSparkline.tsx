import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { FavoriteItemSparklineState, ChartDataPoint } from '../types';

interface FavoriteItemSparklineProps {
  data: FavoriteItemSparklineState;
}

const SmallSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
);

export const FavoriteItemSparkline: React.FC<FavoriteItemSparklineProps> = ({ data }) => {
  if (data === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
        <SmallSpinner />
      </div>
    );
  }

  if (data === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
        Err
      </div>
    );
  }
  
  if (data === 'no_data' || data === null || !Array.isArray(data) || data.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs px-1 text-center">
        No 1hr Chart
      </div>
    );
  }

  // Determine min/max for YAxis domain to prevent line going out of bounds
  let minY = Infinity;
  let maxY = -Infinity;
  data.forEach(p => {
    if (p.price < minY) minY = p.price;
    if (p.price > maxY) maxY = p.price;
  });
  const padding = (maxY - minY) * 0.05; // 5% padding, or a small fixed value if range is 0
  const domainMin = minY - (padding > 0 ? padding : 1);
  const domainMax = maxY + (padding > 0 ? padding : 1);


  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data as ChartDataPoint[]} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
         {/* Hidden YAxis to control domain and prevent line clipping */}
        <YAxis hide={true} domain={[domainMin, domainMax]} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--chart-line)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};