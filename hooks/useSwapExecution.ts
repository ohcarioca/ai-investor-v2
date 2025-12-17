'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Token, SwapState, SwapQuote } from '@/types/swap';
import { sendSwapWebhook } from '@/lib/webhook-service';
import { buildWebhookPayload } from '@/lib/webhook-utils';
import { getGasEstimator } from '@/lib/services/gas/GasEstimator';
import { useOptimizedGas } from '@/hooks/useOptimizedGas';

export function useSwapExecution() {
  const { address, chain } = useAccount();
  const { sendTransaction, data: txData, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txData,
  });

  // Get optimized gas prices and estimator
  const { optimizedGas } = useOptimizedGas();
  const gasEstimator = getGasEstimator();

  const [swapState, setSwapState] = useState<SwapState>({
    step: 'input',
    error: null,
    txHash: null,
  });

  const [webhookState, setWebhookState] = useState<{
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;
  }>({
    isLoading: false,
    isError: false,
    errorMessage: null,
  });

  const [lastSwapData, setLastSwapData] = useState<{
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
    toAmount: string;
    slippage: number;
    quote?: SwapQuote;
    chainId: number;
  } | null>(null);

  // Execute swap
  const executeSwap = useCallback(
    async (
      fromToken: Token,
      toToken: Token,
      amount: string,
      slippage: number
    ) => {
      if (!address || !chain) {
        setSwapState({
          step: 'error',
          error: 'Wallet not connected',
          txHash: null,
        });
        return;
      }

      setSwapState({
        step: 'swapping',
        error: null,
        txHash: null,
      });

      try {
        // Convert amount to base units
        const amountInBaseUnits = (
          parseFloat(amount) * Math.pow(10, fromToken.decimals)
        ).toFixed(0);

        // Build swap transaction
        const response = await fetch('/api/swap/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: chain.id,
            fromToken: fromToken.address,
            toToken: toToken.address,
            amount: amountInBaseUnits,
            slippage: slippage.toString(),
            userAddress: address,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to build swap');
        }

        const { transaction, quote } = await response.json();

        // Store swap data for webhook (including chainId)
        setLastSwapData({
          fromToken,
          toToken,
          fromAmount: amountInBaseUnits,
          toAmount: quote.toAmount,
          slippage,
          quote,
          chainId: chain.id,
        });

        console.log('Executing swap transaction:', {
          to: transaction.to,
          value: transaction.value,
          gasLimit: transaction.gasLimit,
        });

        // Use dynamic gas margin based on tokens involved
        // Simple swaps get lower margin, complex swaps (SIERRA) get higher margin
        const { gasLimit: gasWithMargin, margin, operationType } = gasEstimator.estimateSwapGas(
          transaction.gasLimit,
          fromToken.symbol,
          toToken.symbol,
          fromToken.address,
          toToken.address
        );

        console.log('Gas calculation (optimized):', {
          original: transaction.gasLimit,
          withMargin: gasWithMargin.toString(),
          margin: `${((margin - 1) * 100).toFixed(0)}%`,
          operationType,
          networkStatus: optimizedGas?.networkStatus || 'unknown',
        });

        // Build transaction with optimized gas parameters
        const txParams: {
          to: `0x${string}`;
          data: `0x${string}`;
          value: bigint;
          gas: bigint;
          maxFeePerGas?: bigint;
          maxPriorityFeePerGas?: bigint;
        } = {
          to: transaction.to as `0x${string}`,
          data: transaction.data as `0x${string}`,
          value: BigInt(transaction.value),
          gas: gasWithMargin,
        };

        // Add EIP-1559 gas parameters if available (for better gas optimization)
        if (optimizedGas) {
          txParams.maxFeePerGas = optimizedGas.maxFeePerGas;
          txParams.maxPriorityFeePerGas = optimizedGas.maxPriorityFeePerGas;
          console.log('Using optimized EIP-1559 gas:', {
            maxFeePerGas: optimizedGas.totalFeeGwei.toFixed(2) + ' Gwei',
            priorityFee: optimizedGas.priorityFeeGwei.toFixed(2) + ' Gwei',
          });
        }

        // Send transaction via wagmi
        sendTransaction(txParams);
      } catch (err) {
        setSwapState({
          step: 'error',
          error:
            err instanceof Error ? err.message : 'Failed to execute swap',
          txHash: null,
        });
      }
    },
    [address, chain, sendTransaction, gasEstimator, optimizedGas]
  );

  // Send webhook data after successful transaction
  const sendWebhookData = useCallback(async () => {
    if (!address || !txData || !lastSwapData) return;

    setWebhookState({
      isLoading: true,
      isError: false,
      errorMessage: null,
    });

    try {
      const payload = buildWebhookPayload(
        address,
        lastSwapData.fromToken,
        lastSwapData.toToken,
        lastSwapData.fromAmount,
        lastSwapData.toAmount,
        txData,
        lastSwapData.slippage,
        lastSwapData.quote,
        lastSwapData.chainId
      );

      const result = await sendSwapWebhook(payload);

      if (result.success) {
        setWebhookState({
          isLoading: false,
          isError: false,
          errorMessage: null,
        });
        // Clear last swap data
        setLastSwapData(null);
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
  }, [address, txData, lastSwapData]);

  // Update state based on transaction status
  useEffect(() => {
    if (txData) {
      setSwapState((prev) => ({
        ...prev,
        txHash: txData,
      }));
    }

    if (isSuccess && txData && lastSwapData) {
      // Transaction confirmed, now send webhook
      sendWebhookData();
    }
  }, [txData, isSuccess, lastSwapData, sendWebhookData]);

  // Update swap state to success after webhook completes
  useEffect(() => {
    if (isSuccess && !webhookState.isLoading && !webhookState.isError) {
      setSwapState({
        step: 'success',
        error: null,
        txHash: txData || null,
      });
    }
  }, [isSuccess, txData, webhookState.isLoading, webhookState.isError]);

  const resetSwap = useCallback(() => {
    reset();
    setSwapState({
      step: 'input',
      error: null,
      txHash: null,
    });
    setWebhookState({
      isLoading: false,
      isError: false,
      errorMessage: null,
    });
    setLastSwapData(null);
  }, [reset]);

  const retryWebhook = useCallback(() => {
    sendWebhookData();
  }, [sendWebhookData]);

  const continueWithoutWebhook = useCallback(() => {
    setWebhookState({
      isLoading: false,
      isError: false,
      errorMessage: null,
    });
    setSwapState({
      step: 'success',
      error: null,
      txHash: txData || null,
    });
    setLastSwapData(null);
  }, [txData]);

  return {
    swapState,
    isSwapping: isConfirming || webhookState.isLoading,
    executeSwap,
    resetSwap,
    txHash: txData,
    webhookState,
    retryWebhook,
    continueWithoutWebhook,
  };
}
