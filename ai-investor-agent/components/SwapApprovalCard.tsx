'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, TrendingDown } from 'lucide-react';
import type { SwapData, Token } from '@/types/swap';
import { sendSwapWebhook } from '@/lib/webhook-service';
import { buildWebhookPayload } from '@/lib/webhook-utils';
import WebhookLoadingModal from './WebhookLoadingModal';

interface SwapApprovalCardProps {
  swapData: SwapData;
  onSwapSuccess?: (txHash: string, toAmount: string) => void;
}

type SwapStatus = 'pending' | 'approving' | 'approved' | 'swapping' | 'confirming' | 'error';

export default function SwapApprovalCard({ swapData, onSwapSuccess }: SwapApprovalCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
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

  // Check if we're on the correct network
  const isCorrectNetwork = chainId === 43114;

  // Helper functions to map token symbols to addresses and decimals
  const getTokenAddress = (symbol: string): string => {
    const tokenMap: Record<string, string> = {
      AVAX: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      SIERRA: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
    };
    return tokenMap[symbol] || symbol;
  };

  const getTokenDecimals = (symbol: string): number => {
    const decimalsMap: Record<string, number> = {
      AVAX: 18,
      USDC: 6,
      SIERRA: 6,
    };
    return decimalsMap[symbol] || 18;
  };

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

        // Convert fromAmount to base units
        const fromAmountBase = (
          parseFloat(swapData.fromAmount) * Math.pow(10, fromToken.decimals)
        ).toFixed(0);

        const payload = buildWebhookPayload(
          address,
          fromToken,
          toToken,
          fromAmountBase,
          swapData.toAmount, // Already in base units from quote
          txHash,
          0.5, // Default slippage for agent flow
          {
            fromToken,
            toToken,
            fromAmount: fromAmountBase,
            toAmount: swapData.toAmount,
            toAmountMin: '0',
            exchangeRate: swapData.exchangeRate,
            priceImpact: swapData.priceImpact,
            estimatedGas: swapData.estimatedGas,
            route: [],
          }
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
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    },
    [address, swapData, onSwapSuccess]
  );

  // Handle approval
  const handleApprove = useCallback(async () => {
    if (!swapData.approvalTransaction || !address) return;

    setStatus('approving');
    setError(null);

    try {
      sendTransaction({
        to: swapData.approvalTransaction.to as `0x${string}`,
        data: swapData.approvalTransaction.data as `0x${string}`,
        value: BigInt(swapData.approvalTransaction.value),
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to approve token');
    }
  }, [swapData.approvalTransaction, address, sendTransaction]);

  // Handle swap
  const handleSwap = useCallback(async () => {
    if (!swapData.swapTransaction || !address) return;

    setStatus('swapping');
    setError(null);

    try {
      // Add 20% gas safety margin
      const gasWithMargin = swapData.swapTransaction.gasLimit
        ? BigInt(Math.floor(Number(swapData.swapTransaction.gasLimit) * 1.2))
        : undefined;

      sendTransaction({
        to: swapData.swapTransaction.to as `0x${string}`,
        data: swapData.swapTransaction.data as `0x${string}`,
        value: BigInt(swapData.swapTransaction.value),
        gas: gasWithMargin,
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
    }
  }, [swapData.swapTransaction, address, sendTransaction]);

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
          <span className="font-medium">Please switch to Avalanche C-Chain network</span>
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
            1 {swapData.fromToken} ≈ {parseFloat(swapData.exchangeRate).toFixed(6)} {swapData.toToken}
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
            <span className="text-sm font-medium text-blue-900">
              Waiting for confirmation...
            </span>
          </div>
          {swapTxHash && (
            <a
              href={`https://snowtrace.io/tx/${swapTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              View on Snowtrace
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {swapData.needsApproval && (status === 'pending' || status === 'approving') && (
          <button
            onClick={handleApprove}
            disabled={isConfirming || status === 'approving'}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {status === 'approving' && isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Approving...
              </>
            ) : (
              `Approve ${swapData.fromToken}`
            )}
          </button>
        )}

        {(!swapData.needsApproval || status === 'approved') && status !== 'confirming' && !hasNotified && (
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
              setStatus(swapData.needsApproval && !approvalTxHash ? 'pending' : 'approved');
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
            href={`https://snowtrace.io/tx/${approvalTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View approval transaction
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
