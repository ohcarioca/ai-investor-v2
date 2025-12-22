'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, TrendingDown } from 'lucide-react';
import type { EVMSwapData, Token } from '@/types/swap';
import { sendSwapWebhook } from '@/lib/webhook-service';
import { buildWebhookPayload } from '@/lib/webhook-utils';
import WebhookLoadingModal from './WebhookLoadingModal';
import { SUPPORTED_CHAIN_IDS, getExplorerTxUrl, getExplorerName } from '@/lib/constants/blockchain';
import { TokenRegistry } from '@/lib/services/token/TokenRegistry';
import { useOptimizedGas } from '@/hooks/useOptimizedGas';
import { getGasEstimator } from '@/lib/services/gas/GasEstimator';

interface SwapApprovalCardProps {
  swapData: EVMSwapData;
  onSwapSuccess?: (txHash: string, toAmount: string) => void;
}

type SwapStatus = 'pending' | 'approving' | 'approved' | 'swapping' | 'confirming' | 'error';

export default function SwapApprovalCard({ swapData, onSwapSuccess }: SwapApprovalCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Debug log to trace needsApproval flow
  console.log('[SwapApprovalCard] Received swapData:', {
    fromToken: swapData.fromToken,
    toToken: swapData.toToken,
    needsApproval: swapData.needsApproval,
    hasApprovalTransaction: !!swapData.approvalTransaction,
    hasSwapTransaction: !!swapData.swapTransaction,
  });

  // CRITICAL: Determine if approval is needed
  // If needsApproval is undefined, we MUST check/require approval to be safe
  // This prevents swaps from executing without proper approval verification
  const requiresApproval = useMemo(() => {
    // If explicitly set to false, no approval needed (native token or already approved)
    if (swapData.needsApproval === false) {
      return false;
    }
    // If true OR undefined (unknown state), require approval to be safe
    // Having an approvalTransaction also indicates approval is needed
    return (
      swapData.needsApproval === true ||
      swapData.needsApproval === undefined ||
      !!swapData.approvalTransaction
    );
  }, [swapData.needsApproval, swapData.approvalTransaction]);

  console.log('[SwapApprovalCard] Approval requirement:', {
    originalNeedsApproval: swapData.needsApproval,
    computedRequiresApproval: requiresApproval,
  });

  const { sendTransaction, data: txData, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txData,
  });

  const [status, setStatus] = useState<SwapStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
  const [hasNotified, setHasNotified] = useState(false);
  const [webhookState, setWebhookState] = useState<{
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;
  }>({
    isLoading: false,
    isError: false,
    errorMessage: null,
  });

  // Check if we're on a supported network (Ethereum or Avalanche)
  const isCorrectNetwork = SUPPORTED_CHAIN_IDS.includes(
    chainId as (typeof SUPPORTED_CHAIN_IDS)[number]
  );

  // Get optimized gas prices and estimator
  const { optimizedGas, formatUsd } = useOptimizedGas();
  const gasEstimator = getGasEstimator();

  // Calculate estimated fee in USD
  const estimatedFeeUsd = useMemo(() => {
    if (!optimizedGas || !swapData.estimatedGas) return null;

    const { gasLimit: swapGasWithMargin } = gasEstimator.estimateSwapGas(
      swapData.estimatedGas,
      swapData.fromToken,
      swapData.toToken
    );

    // If needs approval (use requiresApproval for safety), add approval gas
    let totalGas = swapGasWithMargin;
    if (requiresApproval) {
      const { gasLimit: approvalGas } = gasEstimator.estimateApprovalGas();
      totalGas = totalGas + approvalGas;
    }

    const costWei = optimizedGas.maxFeePerGas * totalGas;
    const costEth = Number(costWei) / 1e18;
    // Use a default price if not available (ETH ~$3500, AVAX ~$35)
    const nativePrice = chainId === 43114 ? 35 : 3500;
    return costEth * nativePrice;
  }, [optimizedGas, swapData, gasEstimator, chainId, requiresApproval]);

  // Helper functions to map token symbols to addresses and decimals using TokenRegistry
  const getTokenAddress = useCallback(
    (symbol: string): string => {
      try {
        return TokenRegistry.getAddress(symbol, chainId);
      } catch {
        return symbol; // Return as-is if not found (might be an address already)
      }
    },
    [chainId]
  );

  const getTokenDecimals = useCallback(
    (symbol: string): number => {
      try {
        return TokenRegistry.getDecimals(symbol, chainId);
      } catch {
        return 18; // Default decimals
      }
    },
    [chainId]
  );

  // Send webhook data after successful swap
  const sendWebhookData = useCallback(
    async (txHash: string) => {
      if (!address) return;

      setWebhookState({
        isLoading: true,
        isError: false,
        errorMessage: null,
      });

      try {
        // Parse token info from swapData
        const fromToken: Token = {
          address: getTokenAddress(swapData.fromToken),
          symbol: swapData.fromToken,
          decimals: getTokenDecimals(swapData.fromToken),
          name: swapData.fromToken,
        };

        const toToken: Token = {
          address: getTokenAddress(swapData.toToken),
          symbol: swapData.toToken,
          decimals: getTokenDecimals(swapData.toToken),
          name: swapData.toToken,
        };

        // Convert fromAmount to base units (swapData.fromAmount is human-readable)
        const fromAmountBase = (
          parseFloat(swapData.fromAmount) * Math.pow(10, fromToken.decimals)
        ).toFixed(0);

        // Convert toAmount to base units (swapData.toAmount is human-readable from formatUnits)
        const toAmountBase = (
          parseFloat(swapData.toAmount) * Math.pow(10, toToken.decimals)
        ).toFixed(0);

        console.log('[SwapApprovalCard] Preparing webhook:', {
          fromToken: swapData.fromToken,
          toToken: swapData.toToken,
          fromAmount_raw: swapData.fromAmount,
          toAmount_raw: swapData.toAmount,
          fromAmount_base: fromAmountBase,
          toAmount_base: toAmountBase,
        });

        const payload = buildWebhookPayload(
          address,
          fromToken,
          toToken,
          fromAmountBase,
          toAmountBase, // Convert to base units
          txHash,
          0.5, // Default slippage for agent flow
          {
            fromToken,
            toToken,
            fromAmount: fromAmountBase,
            toAmount: toAmountBase,
            toAmountMin: '0',
            exchangeRate: swapData.exchangeRate,
            priceImpact: swapData.priceImpact,
            estimatedGas: swapData.estimatedGas,
            route: [],
          },
          chainId // Pass chainId for correct blockchain name in webhook
        );

        const result = await sendSwapWebhook(payload);

        if (result.success) {
          setWebhookState({
            isLoading: false,
            isError: false,
            errorMessage: null,
          });
          // Call original success callback
          if (onSwapSuccess) {
            onSwapSuccess(txHash, swapData.toAmount);
          }
        } else {
          setWebhookState({
            isLoading: false,
            isError: true,
            errorMessage: result.error || 'Failed to save transaction',
          });
        }
      } catch (error) {
        setWebhookState({
          isLoading: false,
          isError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    },
    [address, swapData, onSwapSuccess, chainId, getTokenAddress, getTokenDecimals]
  );

  // Rebuild swap transaction after approval is confirmed
  const rebuildSwapTransaction = useCallback(async () => {
    if (!address || !chainId) return null;

    try {
      const fromTokenAddress = getTokenAddress(swapData.fromToken);
      const toTokenAddress = getTokenAddress(swapData.toToken);
      const fromDecimals = getTokenDecimals(swapData.fromToken);
      const baseAmount = Math.floor(parseFloat(swapData.fromAmount) * Math.pow(10, fromDecimals));

      console.log('[SwapApprovalCard] Rebuilding swap transaction after approval...');

      // OKX SDK expects slippage as decimal (1% = 0.01, 10% = 0.1)
      // Use VERY HIGH slippage for low liquidity tokens like SIERRA
      // SIERRA has very low liquidity and may have transfer fees
      const isLowLiquidityToken = swapData.fromToken === 'SIERRA' || swapData.toToken === 'SIERRA';
      const slippageDecimal = isLowLiquidityToken ? '0.1' : '0.005'; // 10% or 0.5%

      console.log(
        '[SwapApprovalCard] Using slippage:',
        slippageDecimal,
        'for tokens:',
        swapData.fromToken,
        '->',
        swapData.toToken
      );

      // Skip allowance check when rebuilding after approval - we've already approved
      const response = await fetch('/api/swap/build?skipAllowanceCheck=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          fromToken: fromTokenAddress,
          toToken: toTokenAddress,
          amount: baseAmount.toString(),
          slippage: slippageDecimal,
          userAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SwapApprovalCard] Failed to rebuild swap:', errorData);
        return null;
      }

      const { transaction } = await response.json();
      console.log('[SwapApprovalCard] Rebuilt swap transaction:', transaction);
      return transaction;
    } catch (error) {
      console.error('[SwapApprovalCard] Error rebuilding swap:', error);
      return null;
    }
  }, [address, chainId, swapData, getTokenAddress, getTokenDecimals]);

  // Handle approval
  const handleApprove = useCallback(async () => {
    if (!swapData.approvalTransaction || !address) return;

    setStatus('approving');
    setError(null);

    try {
      // Use optimized gas estimation for approval (15% margin - simple operation)
      const { gasLimit: gasWithMargin, margin } = gasEstimator.estimateApprovalGas();

      console.log('[SwapApprovalCard] Executing approval:', {
        gasLimit: gasWithMargin.toString(),
        margin: `${((margin - 1) * 100).toFixed(0)}%`,
      });

      // Build transaction with optimized gas parameters
      const txParams: Parameters<typeof sendTransaction>[0] = {
        to: swapData.approvalTransaction.to as `0x${string}`,
        data: swapData.approvalTransaction.data as `0x${string}`,
        value: BigInt(swapData.approvalTransaction.value),
        gas: gasWithMargin,
      };

      // Add EIP-1559 gas parameters if available
      if (optimizedGas) {
        txParams.maxFeePerGas = optimizedGas.maxFeePerGas;
        txParams.maxPriorityFeePerGas = optimizedGas.maxPriorityFeePerGas;
      }

      sendTransaction(txParams);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to approve token');
    }
  }, [swapData.approvalTransaction, address, sendTransaction, gasEstimator, optimizedGas]);

  // Handle swap
  const handleSwap = useCallback(async () => {
    if (!address) return;

    // CRITICAL SAFETY CHECK: If approval was required but not completed, block the swap
    if (requiresApproval && status !== 'approved') {
      console.error('[SwapApprovalCard] BLOCKED: Attempting swap without approval!', {
        requiresApproval,
        status,
        approvalTxHash,
      });
      setStatus('error');
      setError('Token approval required before swapping. Please approve first.');
      return;
    }

    setStatus('swapping');
    setError(null);

    try {
      // ALWAYS rebuild the swap transaction with fresh data before executing
      // This ensures:
      // 1. Fresh deadline (prevents "dropped" transactions)
      // 2. Current prices (prevents slippage failures)
      // 3. Valid routing data
      console.log('[SwapApprovalCard] Rebuilding swap transaction with fresh data...');

      let swapTransaction = await rebuildSwapTransaction();

      if (!swapTransaction) {
        console.warn('[SwapApprovalCard] Rebuild failed, falling back to original transaction');
        swapTransaction = swapData.swapTransaction;
      } else {
        console.log('[SwapApprovalCard] Using fresh swap transaction');
      }

      if (!swapTransaction) {
        throw new Error('No swap transaction available');
      }

      // Use dynamic gas margin based on tokens involved
      const {
        gasLimit: gasWithMargin,
        margin,
        operationType,
      } = gasEstimator.estimateSwapGas(
        swapTransaction.gasLimit,
        swapData.fromToken,
        swapData.toToken
      );

      console.log('[SwapApprovalCard] Executing swap:', {
        to: swapTransaction.to,
        value: swapTransaction.value,
        gasLimit: swapTransaction.gasLimit,
        gasWithMargin: gasWithMargin.toString(),
        margin: `${((margin - 1) * 100).toFixed(0)}%`,
        operationType,
        dataLength: swapTransaction.data?.length,
        dataPreview: swapTransaction.data?.substring(0, 100),
      });

      // Build transaction with optimized gas parameters
      const txParams: Parameters<typeof sendTransaction>[0] = {
        to: swapTransaction.to as `0x${string}`,
        data: swapTransaction.data as `0x${string}`,
        value: BigInt(swapTransaction.value),
        gas: gasWithMargin,
      };

      // Add EIP-1559 gas parameters if available
      if (optimizedGas) {
        txParams.maxFeePerGas = optimizedGas.maxFeePerGas;
        txParams.maxPriorityFeePerGas = optimizedGas.maxPriorityFeePerGas;
      }

      // Execute the swap transaction
      sendTransaction(txParams, {
        onSuccess: (hash) => {
          console.log('[SwapApprovalCard] Transaction sent successfully:', hash);
        },
        onError: (error) => {
          console.error('[SwapApprovalCard] Transaction failed:', error);
          setStatus('error');
          setError(error.message || 'Transaction failed');
        },
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
    }
  }, [
    swapData.swapTransaction,
    swapData.fromToken,
    swapData.toToken,
    address,
    sendTransaction,
    rebuildSwapTransaction,
    gasEstimator,
    optimizedGas,
    requiresApproval,
    status,
    approvalTxHash,
  ]);

  // Handle transaction status updates
  useEffect(() => {
    if (txData && status === 'approving') {
      setApprovalTxHash(txData);
    } else if (txData && status === 'swapping') {
      setSwapTxHash(txData);
      setStatus('confirming');
    }
  }, [txData, status]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isSuccess && status === 'approving') {
      setStatus('approved');
      reset(); // Reset for next transaction

      // Rebuild swap transaction with fresh data after approval
      console.log('[SwapApprovalCard] Approval confirmed, preparing fresh swap transaction...');
    } else if (isSuccess && status === 'confirming' && swapTxHash && !hasNotified) {
      // Transaction confirmed, send webhook
      sendWebhookData(swapTxHash);
      setHasNotified(true);
      // Hide the confirming loader after success notification
      setStatus('pending');
    }
  }, [isSuccess, status, swapTxHash, hasNotified, reset, sendWebhookData]);

  // Webhook retry handler
  const retryWebhook = useCallback(() => {
    if (swapTxHash) {
      sendWebhookData(swapTxHash);
    }
  }, [swapTxHash, sendWebhookData]);

  // Continue without webhook handler
  const continueWithoutWebhook = useCallback(() => {
    setWebhookState({
      isLoading: false,
      isError: false,
      errorMessage: null,
    });
    // Call success callback even without webhook
    if (onSwapSuccess && swapTxHash) {
      onSwapSuccess(swapTxHash, swapData.toAmount);
    }
  }, [onSwapSuccess, swapTxHash, swapData.toAmount]);

  // Wallet validation
  if (!isConnected || !address) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Please connect your wallet to proceed</span>
        </div>
      </div>
    );
  }

  // Network validation
  if (!isCorrectNetwork) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Please switch to Ethereum or Avalanche network</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💱</span>
        <h3 className="text-lg font-bold text-gray-900">Swap Quote</h3>
      </div>

      {/* Quote Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">From:</span>
          <span className="text-sm font-medium text-gray-900">
            {swapData.fromAmount} {swapData.fromToken}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">To (estimated):</span>
          <span className="text-sm font-medium text-gray-900">
            ~{parseFloat(swapData.toAmount).toFixed(6)} {swapData.toToken}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Exchange Rate:</span>
          <span className="text-sm font-medium text-gray-900">
            1 {swapData.fromToken} ≈ {parseFloat(swapData.exchangeRate).toFixed(6)}{' '}
            {swapData.toToken}
          </span>
        </div>
        {parseFloat(swapData.priceImpact) > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Price Impact:</span>
            <span
              className={`text-sm font-medium flex items-center gap-1 ${
                parseFloat(swapData.priceImpact) > 5 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              {parseFloat(swapData.priceImpact).toFixed(2)}%
            </span>
          </div>
        )}

        {/* Estimated Fee */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            Est. Network Fee:
            {requiresApproval && (
              <span className="text-xs text-gray-400 ml-1">(incl. approval)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {estimatedFeeUsd !== null ? (
              <span className="text-sm font-medium text-gray-900">
                {formatUsd(estimatedFeeUsd)}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Calculating...</span>
            )}
            {optimizedGas && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  optimizedGas.networkStatus === 'low'
                    ? 'bg-green-100 text-green-700'
                    : optimizedGas.networkStatus === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {optimizedGas.networkStatus === 'low'
                  ? 'Low fees'
                  : optimizedGas.networkStatus === 'high'
                    ? 'High fees'
                    : 'Normal'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Transaction Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Status */}
      {status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              {swapData.fromToken} Approved
            </span>
          </div>
        </div>
      )}

      {/* Confirming Status */}
      {status === 'confirming' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">Waiting for confirmation...</span>
          </div>
          {swapTxHash && (
            <a
              href={getExplorerTxUrl(chainId, swapTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              View on {getExplorerName(chainId)}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* CRITICAL: Use requiresApproval instead of swapData.needsApproval
            This ensures approval is ALWAYS requested when needsApproval is undefined */}
        {requiresApproval && (status === 'pending' || status === 'approving') && (
          <button
            onClick={handleApprove}
            disabled={isConfirming || status === 'approving' || !swapData.approvalTransaction}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {status === 'approving' && isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Approving...
              </>
            ) : !swapData.approvalTransaction ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading approval...
              </>
            ) : (
              `Approve ${swapData.fromToken}`
            )}
          </button>
        )}

        {/* Only show Swap button when approval is explicitly NOT required OR already approved */}
        {(!requiresApproval || status === 'approved') &&
          status !== 'confirming' &&
          !hasNotified && (
            <button
              onClick={handleSwap}
              disabled={isConfirming || status === 'swapping'}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'swapping' && isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Swapping...
                </>
              ) : (
                'Swap Tokens'
              )}
            </button>
          )}

        {status === 'error' && (
          <button
            onClick={() => {
              setStatus(requiresApproval && !approvalTxHash ? 'pending' : 'approved');
              setError(null);
            }}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Transaction Links */}
      {approvalTxHash && status !== 'approving' && (
        <div className="mt-3">
          <a
            href={getExplorerTxUrl(chainId, approvalTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View approval transaction on {getExplorerName(chainId)}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Webhook Loading Modal */}
      <WebhookLoadingModal
        isOpen={webhookState.isLoading || webhookState.isError}
        isError={webhookState.isError}
        errorMessage={webhookState.errorMessage || undefined}
        onRetry={retryWebhook}
        onContinue={continueWithoutWebhook}
      />
    </div>
  );
}
