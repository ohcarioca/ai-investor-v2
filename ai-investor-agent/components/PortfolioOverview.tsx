'use client';

import { TrendingUp, Copy, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { useWalletBalance } from '@/hooks/useWalletBalance';

export default function PortfolioOverview() {
  const { balance, isLoading, error, refetch, isConnected } = useWalletBalance(true, 30000); // Auto-refresh every 30s

  // Calculate top balances
  const topBalances = balance?.balances
    .filter(b => b.usdValue > 1) // Only show balances > $1
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 5); // Top 5

  return (
    <aside className="hidden lg:block fixed top-20 right-0 w-96 h-[calc(100vh-5rem)] bg-white border-l border-gray-200 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh balance"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Wallet Not Connected State */}
      {!isConnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Wallet Not Connected</p>
          </div>
          <p className="text-xs text-blue-700">
            Connect your wallet to view your portfolio balances
          </p>
        </div>
      )}

      {/* Error State */}
      {error && isConnected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Total Balance Card */}
      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Total Balance (USD)</span>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label="Copy balance">
            <Copy className="w-4 h-4 text-purple-600" />
          </button>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {isLoading ? (
            <div className="animate-pulse bg-gray-300 h-10 w-40 rounded" />
          ) : (
            `$${balance?.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
          )}
        </div>
        {balance && (
          <div className="text-xs text-gray-500">
            Last updated: {new Date(balance.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Top Balances */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Holdings</h3>
        {isLoading ? (
          // Loading skeleton
          [1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="bg-gray-300 h-4 w-16 rounded" />
                <div className="bg-gray-300 h-4 w-24 rounded" />
              </div>
            </div>
          ))
        ) : topBalances && topBalances.length > 0 ? (
          topBalances.map(bal => (
            <div key={bal.currency} className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">{bal.currency}</span>
                <button className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label={`View ${bal.currency} details`}>
                  <ExternalLink className="w-3 h-3 text-purple-600" />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {bal.available.toFixed(8)}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  ${bal.usdValue.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 text-sm py-4">
            No balances available
          </div>
        )}
      </div>

      {/* APY Performance Chart - Keep as mock for now */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">APY Performance</span>
          <span className="text-lg font-bold text-purple-600">6.2%</span>
        </div>

        {/* Simple Chart Visualization */}
        <div className="relative h-32 flex items-end justify-between gap-1">
          {[45, 48, 52, 50, 55, 58, 62, 65, 70, 68, 72, 75].map((height, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-purple-400 to-purple-300 rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Chart Labels */}
        <div className="flex justify-between mt-3 text-xs text-gray-500">
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
          <span>Jul</span>
        </div>
      </div>
    </aside>
  );
}
