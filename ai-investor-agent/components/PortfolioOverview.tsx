'use client';

import { Copy, RefreshCw, Wallet, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { useBalance, useAccount } from 'wagmi';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import SwapModal from './swap/SwapModal';

export default function PortfolioOverview() {
  const { balance, isLoading, error, refetch, isConnected } = useWalletBalance(true, 30000); // Auto-refresh every 30s
  const [showSwapModal, setShowSwapModal] = useState(false);
  const { address } = useAccount();

  // Calculate USDC balance only for Total Balance display
  const usdcBalance = balance?.balances.find(b => b.currency === 'USDC');
  const totalUSDC = usdcBalance?.usdValue || 0;

  // Get SIERRA balance directly using Wagmi's useBalance (same as modal)
  const { data: sierraBalanceData } = useBalance({
    address,
    token: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7' as `0x${string}`, // SIERRA token address
    enabled: !!address && isConnected,
  });

  const sierraAmount = sierraBalanceData
    ? parseFloat(sierraBalanceData.formatted)
    : 0;

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
            `$${totalUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </div>
        {balance && (
          <div className="text-xs text-gray-500">
            Last updated: {new Date(balance.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Total Invested Card */}
      <div className="bg-purple-50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-purple-700 font-medium">Total Invested</span>
        </div>
        <div className="text-2xl font-bold text-purple-900">
          {isLoading ? (
            <div className="animate-pulse bg-purple-300 h-8 w-32 rounded" />
          ) : (
            `${sierraAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SIERRA`
          )}
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={() => setShowSwapModal(true)}
        disabled={!isConnected}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <ArrowLeftRight className="w-5 h-5" />
        Swap Tokens
      </button>

      {/* Swap Modal */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
      />
    </aside>
  );
}
