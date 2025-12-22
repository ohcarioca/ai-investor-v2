'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PNLResult } from '@/types/pnl';

interface PNLCardProps {
  pnlData: PNLResult | null;
  isLoading: boolean;
}

export default function PNLCard({ pnlData, isLoading }: PNLCardProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-3" />
          <div className="h-8 bg-gray-300 rounded w-3/4 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded w-full" />
            <div className="h-3 bg-gray-300 rounded w-full" />
            <div className="h-3 bg-gray-300 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!pnlData) {
    return null;
  }

  // No investments found but user has SIERRA balance
  // This can happen if SIERRA was received via transfer (not swap) or if transaction is too old
  if (pnlData.investments.length === 0 && pnlData.currentSierraBalance > 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Investment Performance</h3>

        {/* Current Value */}
        <div className="text-2xl font-bold text-gray-900 mb-3">
          $
          {pnlData.currentValueUsdc.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">SIERRA Balance</span>
            <span className="font-medium text-gray-900">
              {pnlData.currentSierraBalance.toFixed(2)} SIERRA
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current Price</span>
            <span className="font-medium text-gray-900">
              ${pnlData.currentPricePerSierra.toFixed(4)}
            </span>
          </div>
          <div className="border-t border-gray-200 my-2" />
          <div className="flex justify-between">
            <span className="text-gray-500">Annual Projection ({pnlData.currentApy.toFixed(2)}% APY)</span>
            <span className="font-medium text-purple-600">
              +${pnlData.projectedAnnualYieldUsdc.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Purchase history not found. PNL will be calculated after new transactions.
        </p>
      </div>
    );
  }

  // No SIERRA balance at all
  if (pnlData.investments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Investment Performance</h3>
        <p className="text-sm text-gray-500">No investments found yet.</p>
      </div>
    );
  }

  const isPositive = pnlData.totalPnlUsdc >= 0;
  const isNeutral = Math.abs(pnlData.totalPnlUsdc) < 0.01;

  const pnlColor = isNeutral ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isNeutral ? 'bg-gray-50' : isPositive ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isNeutral
    ? 'border-gray-200'
    : isPositive
      ? 'border-green-200'
      : 'border-red-200';

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const formatUsd = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-5 mb-4`}>
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-600 mb-3">Investment Performance</h3>

      {/* Main PNL Display */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-2xl font-bold ${pnlColor}`}>{formatUsd(pnlData.totalPnlUsdc)}</span>
        <span className={`text-sm font-medium ${pnlColor}`}>
          ({formatPercent(pnlData.totalPnlPercent)})
        </span>
        <TrendIcon className={`w-5 h-5 ${pnlColor}`} />
      </div>

      {/* Details Grid */}
      <div className="space-y-2 text-sm">
        {/* Average Entry Price */}
        <div className="flex justify-between">
          <span className="text-gray-500">Avg. Entry Price</span>
          <span className="font-medium text-gray-900">${pnlData.averageEntryPrice.toFixed(4)}</span>
        </div>

        {/* Current Price */}
        <div className="flex justify-between">
          <span className="text-gray-500">Current Price</span>
          <span className="font-medium text-gray-900">
            ${pnlData.currentPricePerSierra.toFixed(4)}
          </span>
        </div>

        {/* Current Value */}
        <div className="flex justify-between">
          <span className="text-gray-500">Current Value</span>
          <span className="font-medium text-gray-900">
            $
            {pnlData.currentValueUsdc.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Yield Accumulated */}
        <div className="flex justify-between">
          <span className="text-gray-500">Accumulated Yield</span>
          <span
            className={`font-medium ${pnlData.accumulatedYieldUsdc >= 0 ? 'text-green-600' : 'text-gray-900'}`}
          >
            {formatUsd(pnlData.accumulatedYieldUsdc)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Annual Projection */}
        <div className="flex justify-between">
          <span className="text-gray-500">Annual Projection ({pnlData.currentApy.toFixed(2)}% APY)</span>
          <span className="font-medium text-purple-600">
            {formatUsd(pnlData.projectedAnnualYieldUsdc)}
          </span>
        </div>

        {/* Holding Period */}
        {pnlData.holdingPeriodDays > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Holding Period</span>
            <span className="text-gray-400">{pnlData.holdingPeriodDays} days</span>
          </div>
        )}
      </div>
    </div>
  );
}
