'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import type { Token, ApprovalStatus } from '@/types/swap';
import { getGasEstimator } from '@/lib/services/gas/GasEstimator';
import { useOptimizedGas } from '@/hooks/useOptimizedGas';

export function useTokenApproval() {
  const { address, chain } = useAccount();
  const { sendTransaction, data: txData } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txData,
  });

  // Dispatch event when approval transaction is confirmed
  useEffect(() => {
    if (isSuccess && txData) {
      window.dispatchEvent(
        new CustomEvent('transaction-completed', {
          detail: { txHash: txData, type: 'approval' },
        })
      );
      console.log('[useTokenApproval] Approval transaction completed event dispatched');
    }
  }, [isSuccess, txData]);

  // Get optimized gas prices and estimator
  const { optimizedGas } = useOptimizedGas();
  const gasEstimator = getGasEstimator();

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if approval is needed
  const checkApproval = useCallback(
    async (token: Token, amount: string) => {
      if (!address || !chain) {
        setError('Wallet not connected');
        return null;
      }

      setIsChecking(true);
      setError(null);

      try {
        // Convert amount to base units
        const amountInBaseUnits = (parseFloat(amount) * Math.pow(10, token.decimals)).toFixed(0);

        const response = await fetch('/api/swap/approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: chain.id,
            tokenAddress: token.address,
            amount: amountInBaseUnits,
            userAddress: address,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check approval');
        }

        const data = await response.json();
        setApprovalStatus(data.status);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check approval');
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [address, chain]
  );

  // Execute approval transaction
  const approve = useCallback(
    async (token: Token, amount: string) => {
      if (!address) {
        setError('Wallet not connected');
        return;
      }

      setError(null);

      try {
        // First check approval to get transaction data
        const approvalData = await checkApproval(token, amount);

        if (!approvalData || approvalData.status.isApproved) {
          return; // Already approved
        }

        if (!approvalData.transaction) {
          throw new Error('No approval transaction data');
        }

        // Use optimized gas estimation for approval (15% margin - simple operation)
        const { gasLimit: gasWithMargin, margin } = gasEstimator.estimateApprovalGas();

        console.log('Executing approval transaction:', {
          to: approvalData.transaction.to,
          value: approvalData.transaction.value,
          gasLimit: gasWithMargin.toString(),
          margin: `${((margin - 1) * 100).toFixed(0)}%`,
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
          to: approvalData.transaction.to as `0x${string}`,
          data: approvalData.transaction.data as `0x${string}`,
          value: BigInt(approvalData.transaction.value),
          gas: gasWithMargin,
        };

        // Add EIP-1559 gas parameters if available (for better gas optimization)
        if (optimizedGas) {
          txParams.maxFeePerGas = optimizedGas.maxFeePerGas;
          txParams.maxPriorityFeePerGas = optimizedGas.maxPriorityFeePerGas;
          console.log('Using optimized EIP-1559 gas for approval:', {
            maxFeePerGas: optimizedGas.totalFeeGwei.toFixed(2) + ' Gwei',
            priorityFee: optimizedGas.priorityFeeGwei.toFixed(2) + ' Gwei',
          });
        }

        // Send approval transaction via wagmi
        sendTransaction(txParams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve token');
      }
    },
    [address, checkApproval, sendTransaction, gasEstimator, optimizedGas]
  );

  return {
    approvalStatus,
    isChecking,
    isApproving: isConfirming,
    error,
    checkApproval,
    approve,
    txHash: txData,
  };
}
