'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useWalletBalance } from './useWalletBalance';

// SIERRA configuration from environment (with defaults)
// Note: For client-side, we need NEXT_PUBLIC_ prefix
const SIERRA_USDC_RATE = parseFloat(process.env.NEXT_PUBLIC_SIERRA_USDC_RATE || '1.005814');
// APY is stored as decimal (0.0585 = 5.85%)
const SIERRA_APY_DECIMAL = parseFloat(process.env.NEXT_PUBLIC_SIERRA_APY || '0.0585');

interface InvestmentData {
  total_invested_usdc: string;
  apy: string;
  sierra_balance: string;
  sierra_rate: string;
}

interface UseInvestmentDataResult {
  investmentData: InvestmentData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInvestmentData(autoRefresh = false, refreshInterval = 30000): UseInvestmentDataResult {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Use wallet balance hook to get SIERRA balance
  const { balance, isLoading, refetch: refetchBalance } = useWalletBalance();

  // Calculate investment data from SIERRA balance
  const investmentData = useMemo<InvestmentData | null>(() => {
    if (!balance || !isConnected) {
      return null;
    }

    // Find SIERRA token in balances array (uses 'currency' field, not 'symbol')
    const sierraToken = balance.balances?.find(
      (token) => token.currency.toUpperCase() === 'SIERRA'
    );

    const sierraBalance = sierraToken ? sierraToken.available : 0;

    // Calculate total invested in USDC
    const totalInvestedUsdc = sierraBalance * SIERRA_USDC_RATE;

    // Convert decimal APY to percentage (0.0585 → 5.85)
    const apyPercent = SIERRA_APY_DECIMAL * 100;

    return {
      total_invested_usdc: totalInvestedUsdc.toFixed(2),
      apy: apyPercent.toFixed(2),
      sierra_balance: sierraBalance.toFixed(2),
      sierra_rate: SIERRA_USDC_RATE.toFixed(2),
    };
  }, [balance, isConnected]);

  const fetchInvestmentData = useCallback(async () => {
    if (!address || !isConnected) {
      setError(null);
      return;
    }

    setError(null);

    try {
      await refetchBalance();
    } catch (err) {
      console.error('Error fetching investment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch investment data');
    }
  }, [address, isConnected, refetchBalance]);

  // Initial fetch - use ref to track if already fetched
  const hasInitialFetch = useRef(false);
  useEffect(() => {
    if (isConnected && address && !hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchInvestmentData();
    }
    // Reset when disconnected
    if (!isConnected) {
      hasInitialFetch.current = false;
    }
  }, [isConnected, address, chainId, fetchInvestmentData]);

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
