'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Token, SwapState } from '@/types/swap';

export function useSwapExecution() {
  const { address, chain } = useAccount();
  const { sendTransaction, data: txData, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txData,
  });

  const [swapState, setSwapState] = useState<SwapState>({
    step: 'input',
    error: null,
    txHash: null,
  });

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

        const { transaction } = await response.json();

        console.log('Executing swap transaction:', {
          to: transaction.to,
          value: transaction.value,
          gasLimit: transaction.gasLimit,
        });

        // Add 20% safety margin to gas limit to avoid out of gas errors
        const gasWithMargin = transaction.gasLimit
          ? BigInt(Math.floor(Number(transaction.gasLimit) * 1.2))
          : undefined;

        // Send transaction via wagmi
        sendTransaction({
          to: transaction.to as `0x${string}`,
          data: transaction.data as `0x${string}`,
          value: BigInt(transaction.value),
          gas: gasWithMargin,
        });
      } catch (err) {
        setSwapState({
          step: 'error',
          error:
            err instanceof Error ? err.message : 'Failed to execute swap',
          txHash: null,
        });
      }
    },
    [address, chain, sendTransaction]
  );

  // Update state based on transaction status
  useEffect(() => {
    if (txData) {
      setSwapState((prev) => ({
        ...prev,
        txHash: txData,
      }));
    }

    if (isSuccess) {
      setSwapState({
        step: 'success',
        error: null,
        txHash: txData || null,
      });
    }
  }, [txData, isSuccess]);

  const resetSwap = useCallback(() => {
    reset();
    setSwapState({
      step: 'input',
      error: null,
      txHash: null,
    });
  }, [reset]);

  return {
    swapState,
    isSwapping: isConfirming,
    executeSwap,
    resetSwap,
    txHash: txData,
  };
}
