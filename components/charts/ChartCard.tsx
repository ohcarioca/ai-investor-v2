'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ChartConfig, ChartDataPoint, ChartType } from '@/lib/tools/base/types';

// Re-export types for backward compatibility
export type { ChartConfig, ChartDataPoint, ChartType };

// Types for Recharts tooltip
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

interface ChartCardProps {
  config: ChartConfig;
}

// Elegant color palette (purple theme)
const DEFAULT_COLORS = ['#9333ea', '#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#6366f1'];

// Format currency values
const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format percentage values
const _formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export default function ChartCard({ config }: ChartCardProps) {
  const {
    title,
    description,
    type,
    data,
    dataKeys,
    colors = DEFAULT_COLORS,
    gradient = true,
    showDots = false,
    curveType = 'monotone',
    showYAxis = true,
    showXAxis = true,
    showGrid = false,
    showLegend = false,
    legendPosition = 'bottom',
    highlightValue,
    showFooterStats = false,
    footerStats,
  } = config;

  // Custom tooltip with elegant styling
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
          {payload.map((entry: TooltipPayloadEntry, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend with clean styling
  const renderLegend = () => {
    if (!showLegend) return null;

    return (
      <div
        className={`flex flex-wrap gap-4 ${legendPosition === 'bottom' ? 'mt-4 justify-center' : 'mb-4'}`}
      >
        {dataKeys.y.map((key, index) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm text-gray-600 capitalize">{key}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render trend indicator
  const renderTrendIndicator = () => {
    if (!highlightValue?.trend) return null;

    const trendConfig = {
      up: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
      neutral: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50' },
    };

    const { icon: Icon, color, bg } = trendConfig[highlightValue.trend];

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bg}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        {highlightValue.trendPercent && (
          <span className={`text-xs font-semibold ${color}`}>{highlightValue.trendPercent}</span>
        )}
      </div>
    );
  };

  // Generate gradient definitions for charts
  const renderGradientDefs = () => {
    if (!gradient) return null;

    return (
      <defs>
        {colors.map((color, index) => (
          <linearGradient
            key={`gradient-${index}`}
            id={`gradient-${index}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
    );
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const commonAxisProps = {
      tick: { fontSize: 11, fill: '#9ca3af' },
      tickLine: false,
      axisLine: false,
    };

    const chartMargin = { top: 10, right: 10, left: 0, bottom: 0 };

    switch (type) {
      case 'area':
        return (
          <AreaChart data={data} margin={chartMargin}>
            {renderGradientDefs()}
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />}
            {showXAxis && <XAxis dataKey={dataKeys.x} {...commonAxisProps} />}
            {showYAxis && (
              <YAxis
                {...commonAxisProps}
                tickFormatter={(value) =>
                  `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                }
                width={50}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.y.map((key, index) => (
              <Area
                key={key}
                type={curveType}
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2.5}
                fill={gradient ? `url(#gradient-${index})` : colors[index % colors.length]}
                fillOpacity={gradient ? 1 : 0.2}
                dot={showDots}
              />
            ))}
          </AreaChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={chartMargin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />}
            {showXAxis && <XAxis dataKey={dataKeys.x} {...commonAxisProps} />}
            {showYAxis && (
              <YAxis
                {...commonAxisProps}
                tickFormatter={(value) =>
                  `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                }
                width={50}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.y.map((key, index) => (
              <Line
                key={key}
                type={curveType}
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2.5}
                dot={showDots ? { r: 3, fill: colors[index % colors.length] } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data} margin={chartMargin}>
            {renderGradientDefs()}
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />}
            {showXAxis && <XAxis dataKey={dataKeys.x} {...commonAxisProps} />}
            {showYAxis && (
              <YAxis
                {...commonAxisProps}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
                }
                width={40}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.y.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={gradient ? `url(#gradient-${index})` : colors[index % colors.length]}
                stroke={colors[index % colors.length]}
                strokeWidth={1}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={type === 'donut' ? '55%' : 0}
              outerRadius="80%"
              paddingAngle={type === 'donut' ? 3 : 0}
              dataKey={dataKeys.y[0]}
              nameKey={dataKeys.x}
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #f3f4f6',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
          </PieChart>
        );

      default:
        return (
          <LineChart data={data} margin={chartMargin}>
            {showXAxis && <XAxis dataKey={dataKeys.x} {...commonAxisProps} />}
            {showYAxis && <YAxis {...commonAxisProps} width={50} />}
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.y.map((key, index) => (
              <Line
                key={key}
                type={curveType}
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2.5}
                dot={false}
              />
            ))}
          </LineChart>
        );
    }
  };

  // Render pie/donut legend
  const renderPieLegend = () => {
    if (type !== 'pie' && type !== 'donut') return null;

    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
      <div className="flex flex-col gap-2 ml-4">
        {data.map((item, index) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {highlightValue && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-bold text-purple-600">{highlightValue.value}</span>
            {highlightValue.label && (
              <span className="text-xs text-gray-500">{highlightValue.label}</span>
            )}
            {renderTrendIndicator()}
          </div>
        )}
      </div>

      {/* Legend (top position) */}
      {legendPosition === 'top' && renderLegend()}

      {/* Chart Container */}
      <div className={`${type === 'pie' || type === 'donut' ? 'flex items-center' : ''}`}>
        <ResponsiveContainer
          width={type === 'pie' || type === 'donut' ? '60%' : '100%'}
          height={280}
        >
          {renderChart()}
        </ResponsiveContainer>
        {renderPieLegend()}
      </div>

      {/* Legend (bottom position) */}
      {legendPosition === 'bottom' && renderLegend()}

      {/* Footer Stats */}
      {showFooterStats && footerStats && footerStats.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
          {footerStats.map((stat, index) => (
            <div key={index}>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: stat.color || '#111827' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
