
import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../src/types';

interface PriceChartProps {
  data: ChartDataPoint[];
  showGrid: boolean;
  showLineGlow: boolean;
  showVolumeChart: boolean;
}

// Custom Tooltip for Price Data
interface CustomPriceTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomPriceTooltip: React.FC<CustomPriceTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as ChartDataPoint;
    const formattedLabel = new Date(label as number).toLocaleString([], { 
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

// Custom Tooltip for Volume Data
interface CustomVolumeTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomVolumeTooltip: React.FC<CustomVolumeTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as ChartDataPoint; 
    const formattedLabel = new Date(label as number).toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const hasBuyVolume = payload.some(p => p.dataKey === 'highPriceVolume');
    const hasSellVolume = payload.some(p => p.dataKey === 'lowPriceVolume');

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
        {hasBuyVolume && dataPoint.highPriceVolume !== undefined && (
          <p>Buy Volume: {dataPoint.highPriceVolume.toLocaleString()}</p>
        )}
        {hasSellVolume && dataPoint.lowPriceVolume !== undefined && (
          <p>Sell Volume: {dataPoint.lowPriceVolume.toLocaleString()}</p>
        )}
      </div>
    );
  }
  return null;
};


const EndPointDot = (props: any) => {
  const { cx, cy, stroke, index, dataLength } = props;
  if (index !== dataLength - 1 || cx === undefined || cy === undefined) return null;
  const dotColor = stroke || 'var(--chart-line)'; 
  return (
    <g>
      <circle cx={cx} cy={cy} r="8" fill={dotColor} fillOpacity={0.5} />
      <circle cx={cx} cy={cy} r="4" fill={dotColor} stroke="var(--bg-primary)" strokeWidth="1.5" />
    </g>
  );
};

const formatVolumeTick = (volume: number) => {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
  return volume.toLocaleString();
};

const Y_AXIS_SPACE = 50; // Consistent space for Y-axes

export const PriceChart: React.FC<PriceChartProps> = ({ data, showGrid, showLineGlow, showVolumeChart }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-[var(--text-muted)]"><p>No data to display chart.</p></div>;
  }

  const yAxisPriceDomain = useMemo(() => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    data.forEach(p => {
      if (p.price > maxPrice) maxPrice = p.price;
      const low = p.avgLowPrice !== undefined ? p.avgLowPrice : p.price;
      if (low < minPrice) minPrice = low;
    });
    if (minPrice === Infinity || maxPrice === -Infinity ) return ['auto', 'auto'];
    const range = maxPrice - minPrice;
    let padding = Math.max(10, range === 0 ? maxPrice * 0.1 : range * 0.1);
    return [Math.max(0, minPrice - padding), maxPrice + padding];
  }, [data]);

  const lineStyle = showLineGlow 
    ? { filter: 'drop-shadow(0px 0px 3px var(--chart-line-glow)) drop-shadow(0px 0px 6px var(--chart-line-glow))' }
    : {};

  const commonXAxis = (
    <XAxis 
      dataKey="timestamp" 
      tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
      stroke="var(--chart-axis-text)"
      angle={-30}
      textAnchor="end"
      height={50}
      tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
    />
  );

  const priceChartHeight = showVolumeChart ? '70%' : '100%';
  const volumeChartHeight = showVolumeChart ? '25%' : '0%';


  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height={priceChartHeight}>
        <LineChart
          data={data}
          margin={{ 
            top: 5, 
            right: Y_AXIS_SPACE, // Space for volume chart's Y-axis
            left: 0,             // Y-axis component defines its own width
            bottom: showVolumeChart ? 0 : 20 
          }}
          syncId="priceVolumeSync"
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
          {showVolumeChart ? ( 
             <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} height={0} />
          ) : (
            commonXAxis
          )}
          <YAxis 
            yAxisId="left"
            dataKey="price"
            stroke="var(--chart-axis-text)"
            tickFormatter={(price) => {
              if (price >= 1000000) return `${(price / 1000000).toFixed(1)}m`;
              if (price >= 1000) return `${(price / 1000).toFixed(0)}k`;
              return price.toLocaleString();
            }}
            domain={yAxisPriceDomain}
            allowDataOverflow={true}
            tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
            width={Y_AXIS_SPACE} // Explicit width for this Y-axis
          />
          <Tooltip content={<CustomPriceTooltip />} />
          <Legend 
            wrapperStyle={{color: 'var(--legend-text)', paddingTop: '10px'}} 
          />
          <Line 
              type="monotone" 
              dataKey="price"
              yAxisId="left"
              stroke="var(--chart-line)"
              strokeWidth={2.5} 
              dot={false}
              activeDot={{ r: 7, stroke: 'var(--chart-line-active-dot)', fill: 'var(--chart-line-active-dot)', strokeWidth: 1 }}
              name="Average High Price"
              style={lineStyle}
          />
          <Line
              yAxisId="left"
              dataKey="price" 
              stroke="transparent"
              activeDot={false}
              dot={(props) => <EndPointDot {...props} dataLength={data.length} stroke="var(--chart-line)" />}
              legendType="none" // Don't show this utility line in legend
          />
        </LineChart>
      </ResponsiveContainer>

      {showVolumeChart && data.some(d => d.highPriceVolume !== undefined || d.lowPriceVolume !== undefined) && (
        <ResponsiveContainer width="100%" height={volumeChartHeight}>
          <BarChart 
            data={data} 
            margin={{ 
              top: 5, 
              right: 0,             // Y-axis component defines its own width
              left: Y_AXIS_SPACE,   // Space for price chart's Y-axis
              bottom: 20 
            }}
            syncId="priceVolumeSync"
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
            {commonXAxis}
            <YAxis 
              yAxisId="right"
              orientation="right" 
              stroke="var(--chart-axis-text)"
              tickFormatter={formatVolumeTick}
              tick={{ fontSize: '0.75rem', fill: 'var(--chart-axis-text)' }}
              width={Y_AXIS_SPACE} // Explicit width for this Y-axis
            />
            <Tooltip content={<CustomVolumeTooltip />} />
            <Legend 
                wrapperStyle={{color: 'var(--legend-text)', paddingTop: '10px'}} 
            />
            <Bar yAxisId="right" dataKey="highPriceVolume" fill="var(--chart-volume-buy)" name="Buy Volume" stackId="volume" />
            <Bar yAxisId="right" dataKey="lowPriceVolume" fill="var(--chart-volume-sell)" name="Sell Volume" stackId="volume" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
