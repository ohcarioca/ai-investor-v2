'use client';

import { useState, useCallback } from 'react';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Token, ApprovalStatus } from '@/types/swap';

export function useTokenApproval() {
  const { address, chain } = useAccount();
  const { sendTransaction, data: txData } = useSendTransaction();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txData,
  });

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(
    null
  );
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
        const amountInBaseUnits = (
          parseFloat(amount) * Math.pow(10, token.decimals)
        ).toFixed(0);

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
        setError(
          err instanceof Error ? err.message : 'Failed to check approval'
        );
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

        // Send approval transaction via wagmi
        sendTransaction({
          to: approvalData.transaction.to as `0x${string}`,
          data: approvalData.transaction.data as `0x${string}`,
          value: BigInt(approvalData.transaction.value),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to approve token'
        );
      }
    },
    [address, checkApproval, sendTransaction]
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
