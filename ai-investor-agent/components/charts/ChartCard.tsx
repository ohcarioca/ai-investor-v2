'use client';

import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type ChartType = 'line' | 'area' | 'bar';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartConfig {
  title: string;
  description?: string;
  type: ChartType;
  data: ChartDataPoint[];
  dataKeys: {
    x: string;
    y: string[];
  };
  colors?: string[];
  yAxisLabel?: string;
  xAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

interface ChartCardProps {
  config: ChartConfig;
}

const defaultColors = ['#9333ea', '#ec4899', '#10b981', '#3b82f6', '#f59e0b'];

export default function ChartCard({ config }: ChartCardProps) {
  const {
    title,
    description,
    type,
    data,
    dataKeys,
    colors = defaultColors,
    yAxisLabel,
    xAxisLabel,
    showLegend = true,
    showGrid = true,
  } = config;

  // Calculate trend
  const firstValue = data[0]?.[dataKeys.y[0]] as number;
  const lastValue = data[data.length - 1]?.[dataKeys.y[0]] as number;
  const trend = lastValue > firstValue ? 'up' : 'down';
  const trendPercentage = firstValue ? (((lastValue - firstValue) / firstValue) * 100).toFixed(2) : '0';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const axisProps = {
      xAxis: (
        <XAxis
          dataKey={dataKeys.x}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          stroke="#e5e7eb"
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
      ),
      yAxis: (
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          stroke="#e5e7eb"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
      ),
      grid: showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /> : null,
      tooltip: <Tooltip content={<CustomTooltip />} />,
      legend: showLegend ? <Legend wrapperStyle={{ fontSize: '14px' }} /> : null,
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.y.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.y.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.y.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {dataKeys.y.length === 1 && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{trendPercentage}%</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>

      {/* Footer Stats */}
      {dataKeys.y.length === 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Starting</p>
            <p className="text-sm font-bold text-gray-900">
              ${firstValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current</p>
            <p className="text-sm font-bold text-gray-900">
              ${lastValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Change</p>
            <p className={`text-sm font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(lastValue - firstValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
