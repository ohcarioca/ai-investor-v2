'use client';

import { Copy, RefreshCw, Wallet, GripVertical } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useSolanaBalance } from '@/hooks/useSolanaBalance';
import { useInvestmentData } from '@/hooks/useInvestmentData';
import { usePNLData } from '@/hooks/usePNLData';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { useSelectedNetwork } from '@/contexts/NetworkContext';
import APYPerformanceChart from '@/components/charts/APYPerformanceChart';
import PNLCard from '@/components/PNLCard';

interface PortfolioOverviewProps {
  width?: number;
  onWidthChange?: (width: number) => void;
  onSendMessage?: (message: string) => void;
}

export default function PortfolioOverview({
  width: externalWidth,
  onWidthChange: _onWidthChange,
  onSendMessage,
}: PortfolioOverviewProps) {
  const { isSolana } = useSelectedNetwork();

  // EVM balance (ETH/AVAX)
  const {
    balance: evmBalance,
    isLoading: isEvmLoading,
    error: evmError,
    refetch: refetchEvm,
    isConnected: isEvmConnected,
  } = useWalletBalance(true, 90000);

  // Solana balance
  const {
    balance: solanaBalance,
    isLoading: isSolanaLoading,
    error: solanaError,
    refetch: refetchSolana,
    isConnected: isSolanaConnected,
  } = useSolanaBalance(true, 90000);

  // Use appropriate balance based on network
  const balance = isSolana ? solanaBalance : evmBalance;
  const isLoading = isSolana ? isSolanaLoading : isEvmLoading;
  const error = isSolana ? solanaError : evmError;
  const refetch = isSolana ? refetchSolana : refetchEvm;
  const isConnected = isSolana ? isSolanaConnected : isEvmConnected;

  const { investmentData, isLoading: isLoadingInvestment } = useInvestmentData(true, 90000);

  const {
    pnlData,
    isLoading: isLoadingPNL,
    refetch: refetchPNL,
  } = usePNLData();
  const {
    width: internalWidth,
    isResizing,
    handleMouseDown,
  } = useSidebarResize({
    minWidth: 280,
    maxWidthPercent: 50, // Max 50% of screen
    defaultWidth: 384,
    storageKey: 'portfolio-sidebar-width',
  });

  // Use AppKit for unified wallet state
  const { isConnected: _isAppKitConnected } = useAppKitAccount();
  useAccount();

  // Use external width if provided (for syncing with parent), otherwise use internal
  const width = externalWidth ?? internalWidth;

  // Calculate USDC balance only for Total Balance display
  const usdcBalance = balance?.balances.find((b) => b.currency === 'USDC');
  const totalUSDC = usdcBalance?.usdValue || 0;

  // Calculate SIERRA value in USD (get from balance data)
  const sierraBalance = balance?.balances.find((b) => b.currency === 'SIERRA');
  const totalSierraUSD = sierraBalance?.usdValue || 0;

  // Get investment data (APY already comes as percentage from hook)
  const totalInvestedUSDC = investmentData
    ? parseFloat(investmentData.total_invested_usdc)
    : totalSierraUSD;
  const currentAPY = investmentData ? parseFloat(investmentData.apy) : 5.85;

  // Combined refresh function
  const handleRefresh = () => {
    refetch();
    if (!isSolana) {
      refetchPNL();
    }
  };

  return (
    <aside
      className={`hidden lg:block fixed top-[73px] right-0 h-[calc(100vh-73px)] bg-white border-l border-gray-200 overflow-y-auto ${isResizing ? 'select-none' : ''}`}
      style={{ width }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <div
          className={`w-1 h-full transition-colors ${isResizing ? 'bg-purple-500' : 'group-hover:bg-purple-400'}`}
        />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isLoadingInvestment}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh balance"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${isLoading || isLoadingInvestment ? 'animate-spin' : ''}`}
            />
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

        {/* Balance Cards - Only show when wallet is connected */}
        {isConnected && (
          <>
            {/* Total Available for Investment Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">
                  Total Available for Investment (USDC)
                </span>
                <button
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  aria-label="Copy balance"
                >
                  <Copy className="w-4 h-4 text-purple-600" />
                </button>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 h-8 w-32 rounded" />
                ) : (
                  `$${totalUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </div>
              {balance && (
                <div className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(balance.lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* PNL Card - Hide for Solana */}
            {!isSolana && <PNLCard pnlData={pnlData} isLoading={isLoadingPNL} />}

            {/* APY Performance Chart - Hide for Solana */}
            {!isSolana && (
              <APYPerformanceChart currentAPY={currentAPY} isLoading={isLoadingInvestment} />
            )}

            {/* Solana Info Card */}
            {isSolana && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-purple-800 font-medium mb-2">Solana Wallet</p>
                <p className="text-xs text-purple-600">
                  To invest, you will need to create an ETH or AVAX wallet. Talk to Kira to start
                  the investment process.
                </p>
              </div>
            )}
          </>
        )}

        {/* Generate Graphs & Reports Card - Only show when wallet is connected and NOT Solana */}
        {isConnected && onSendMessage && !isSolana && (
          <button
            onClick={() =>
              onSendMessage('Show me the available charts and reports for my portfolio')
            }
            className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 transition-all duration-200 text-left"
          >
            <h3 className="text-sm font-medium text-gray-600">Generate Graphs & Reports</h3>
            <p className="text-xs text-gray-500 mt-1">Analyze your portfolio performance</p>
          </button>
        )}
      </div>
    </aside>
  );
}
