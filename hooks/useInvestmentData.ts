'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface InvestmentData {
  total_invested_usdc: string;
  apy: string;
}

interface UseInvestmentDataResult {
  investmentData: InvestmentData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInvestmentData(autoRefresh = false, refreshInterval = 30000): UseInvestmentDataResult {
  const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();

  const fetchInvestmentData = useCallback(async () => {
    if (!address || !isConnected) {
      setInvestmentData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://n8n.balampay.com/webhook/calc_swaps?wallet_address=${address}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch investment data');
      }

      const data: InvestmentData = await response.json();
      setInvestmentData(data);
    } catch (err) {
      console.error('Error fetching investment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch investment data');
      setInvestmentData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Initial fetch
  useEffect(() => {
    if (isConnected && address) {
      fetchInvestmentData();
    }
  }, [isConnected, address, fetchInvestmentData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected || !address) return;

    const interval = setInterval(() => {
      fetchInvestmentData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, address, fetchInvestmentData]);

  return {
    investmentData,
    isLoading,
    error,
    refetch: fetchInvestmentData,
  };
}
