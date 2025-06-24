
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PortfolioPerformanceDataPoint } from '../../src/types';

interface PortfolioPerformanceChartProps {
  data: PortfolioPerformanceDataPoint[];
  showRealizedPLLine: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const formatGPShorthand = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B GP`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M GP`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K GP`;
  return value.toLocaleString() + ' GP';
};

const CustomProfitTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as PortfolioPerformanceDataPoint;
    const formattedLabel = new Date(label as number).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
    });
    
    const totalProfitText = formatGPShorthand(dataPoint.profit);
    const realizedPLText = dataPoint.realizedPL !== undefined ? formatGPShorthand(dataPoint.realizedPL) : null;

    return (
      <div 
        className="p-3 rounded-md shadow-lg"
        style={{ 
          backgroundColor: 'var(--tooltip-bg)',
          border: '1px solid var(--tooltip-border)',
          color: 'var(--tooltip-text)',
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formattedLabel}</p>
        <p>Total Portfolio Profit: <span style={{color: dataPoint.profit >= 0 ? 'var(--price-high)' : 'var(--price-low)'}}>{totalProfitText}</span></p>
        {realizedPLText !== null && payload.find(p => p.dataKey === 'realizedPL') && (
             <p>Cumulative Realized P/L: <span style={{color: (dataPoint.realizedPL || 0) >= 0 ? 'var(--price-high)' : 'var(--price-low)'}}>{realizedPLText}</span></p>
        )}
      </div>
    );
  }
  return null;
};

const formatProfitTick = (profit: number) => {
  if (Math.abs(profit) >= 1000000000) return `${(profit / 1000000000).toFixed(1)}B`;
  if (Math.abs(profit) >= 1000000) return `${(profit / 1000000).toFixed(1)}M`;
  if (Math.abs(profit) >= 1000) return `${(profit / 1000).toFixed(0)}K`;
  return profit.toLocaleString();
};

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({ data, showRealizedPLLine }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-[var(--text-muted)]"><p>No performance data to display.</p></div>;
  }

  const yAxisProfitDomain = useMemo(() => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    let minProfit = Infinity;
    let maxProfit = -Infinity;
    
    data.forEach(p => {
      if (p.profit > maxProfit) maxProfit = p.profit;
      if (p.profit < minProfit) minProfit = p.profit;
      if (showRealizedPLLine && p.realizedPL !== undefined) {
        if (p.realizedPL > maxProfit) maxProfit = p.realizedPL;
        if (p.realizedPL < minProfit) minProfit = p.realizedPL;
      }
    });

    if (minProfit === Infinity || maxProfit === -Infinity ) return ['auto', 'auto'];
    
    const range = maxProfit - minProfit;
    let padding = Math.max(1000, range === 0 ? Math.abs(maxProfit) * 0.1 || 1000 : range * 0.1);

    const finalMin = minProfit - padding;
    const finalMax = maxProfit + padding;
    
    if (Math.abs(finalMin) < 1000 && Math.abs(finalMax) < 1000 && range < 2000) {
        return [-10000, 10000];
    }

    return [finalMin, finalMax];
  }, [data, showRealizedPLLine]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString([], {month: 'short', day: 'numeric'})} 
          stroke="var(--chart-axis-text)"
          tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
        />
        <YAxis 
          stroke="var(--chart-axis-text)"
          tickFormatter={formatProfitTick}
          domain={yAxisProfitDomain}
          allowDataOverflow={true}
          tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
          width={65}
        />
        <Tooltip content={<CustomProfitTooltip />} />
        <Legend wrapperStyle={{color: 'var(--legend-text)', paddingTop: '10px'}}/>
        <Line 
          type="monotone" 
          dataKey="profit"
          stroke="var(--chart-line)" // Main profit line color (e.g., Purple)
          strokeWidth={2} 
          dot={{ r: 2, fill: 'var(--chart-line)'}}
          activeDot={{ r: 6, stroke: 'var(--chart-line-active-dot)', fill: 'var(--chart-line-active-dot)', strokeWidth: 1 }}
          name="Total Portfolio Profit"
          connectNulls={false} 
        />
        {showRealizedPLLine && (
          <Line
            type="monotone"
            dataKey="realizedPL"
            stroke="var(--price-high)" // Color for Realized P/L (e.g., Green)
            strokeWidth={1.5}
            dot={{ r: 2, fill: 'var(--price-high)'}}
            activeDot={{ r: 5, stroke: 'var(--price-high)', fill: 'var(--price-high)', strokeWidth: 1 }}
            name="Cumulative Realized P/L"
            connectNulls={false}
            strokeDasharray="5 5" // Optional: make it a dashed line
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};