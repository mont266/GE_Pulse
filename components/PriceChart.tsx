
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

interface PriceChartProps {
  data: ChartDataPoint[];
  showGrid: boolean;
  showLineGlow: boolean;
}

// Custom Tooltip Component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as ChartDataPoint;
    const formattedLabel = new Date(label).toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

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
        <p>High Price: {dataPoint.price.toLocaleString()} GP</p>
        {dataPoint.avgLowPrice !== undefined && (
          <p>Low Price: {dataPoint.avgLowPrice.toLocaleString()} GP</p>
        )}
      </div>
    );
  }
  return null;
};

const EndPointDot = (props: any) => {
  const { cx, cy, stroke, index, dataLength } = props;

  if (index !== dataLength - 1 || cx === undefined || cy === undefined) {
    return null;
  }

  const dotColor = stroke || 'var(--chart-line)'; 

  return (
    <g>
      <circle cx={cx} cy={cy} r="8" fill={dotColor} fillOpacity={0.5} />
      <circle cx={cx} cy={cy} r="4" fill={dotColor} stroke="var(--bg-primary)" strokeWidth="1.5" />
    </g>
  );
};


export const PriceChart: React.FC<PriceChartProps> = ({ data, showGrid, showLineGlow }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-[var(--text-muted)]"><p>No data to display chart.</p></div>;
  }

  const yAxisDomain = useMemo(() => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    data.forEach(p => {
      if (p.price > maxPrice) maxPrice = p.price; // p.price is avgHighPrice
      const low = p.avgLowPrice !== undefined ? p.avgLowPrice : p.price;
      if (low < minPrice) minPrice = low;
    });

    if (minPrice === Infinity || maxPrice === -Infinity ) return ['auto', 'auto'];

    const range = maxPrice - minPrice;
    let padding;
    if (range === 0) { 
      padding = Math.max(10, maxPrice * 0.1); 
    } else {
      padding = Math.max(10, range * 0.1); 
    }
    
    return [Math.max(0, minPrice - padding), maxPrice + padding];
  }, [data]);

  const lineStyle = showLineGlow 
    ? { filter: 'drop-shadow(0px 0px 3px var(--chart-line-glow)) drop-shadow(0px 0px 6px var(--chart-line-glow))' }
    : {};

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5, right: 30, left: 20, bottom: 20,
        }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          stroke="var(--chart-axis-text)"
          angle={-30}
          textAnchor="end"
          height={50}
          tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
        />
        <YAxis 
          dataKey="price" // This primarily sets the scale based on avgHighPrice
          stroke="var(--chart-axis-text)"
          tickFormatter={(price) => {
            if (price >= 1000000) return `${(price / 1000000).toFixed(1)}m`;
            if (price >= 1000) return `${(price / 1000).toFixed(0)}k`;
            return price.toLocaleString();
          }}
          domain={yAxisDomain}
          allowDataOverflow={true}
          tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
        />
        <Tooltip 
          content={<CustomTooltip />} // Use the custom tooltip component
        />
        <Legend 
            wrapperStyle={{color: 'var(--legend-text)', paddingTop: '10px'}} 
        />
        <Line 
            type="monotone" 
            dataKey="price" // This line plots the avgHighPrice
            stroke="var(--chart-line)"
            strokeWidth={2.5} 
            dot={false}
            activeDot={{ r: 7, stroke: 'var(--chart-line-active-dot)', fill: 'var(--chart-line-active-dot)', strokeWidth: 1 }}
            name="Average High Price" // Legend name for the main line
            style={lineStyle}
        />
        <Line
            dataKey="price" // EndPointDot is associated with the avgHighPrice line
            stroke="transparent"
            activeDot={false}
            dot={(props) => <EndPointDot {...props} dataLength={data.length} stroke="var(--chart-line)" />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
