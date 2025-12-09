'use client';

import { TrendingUp, Copy, ExternalLink } from 'lucide-react';

export default function PortfolioOverview() {
  return (
    <aside className="fixed top-20 right-0 w-96 h-[calc(100vh-5rem)] bg-white border-l border-gray-200 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Overview</h2>

      {/* Total Balance Card */}
      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Total Balance</span>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Copy className="w-4 h-4 text-purple-600" />
          </button>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">$24,563.00</div>
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span className="font-medium">+12.5%</span>
          <span className="text-gray-500">vs last month</span>
        </div>
      </div>

      {/* USDC Balance Card */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">USDC Balance</span>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <ExternalLink className="w-4 h-4 text-purple-600" />
          </button>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">$8,450.00</div>
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span className="font-medium">+3.2%</span>
          <span className="text-gray-500">vs last month</span>
        </div>
      </div>

      {/* APY Performance Chart */}
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
