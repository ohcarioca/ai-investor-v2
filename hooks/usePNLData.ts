'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSelectedNetwork, CHAIN_IDS } from '@/contexts/NetworkContext';
import type { PNLResult } from '@/types/pnl';

interface UsePNLDataResult {
  pnlData: PNLResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePNLData(autoRefresh = false, refreshInterval = 90000): UsePNLDataResult {
  const [pnlData, setPnlData] = useState<PNLResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { selectedChainId, isSolana } = useSelectedNetwork();

  // Only calculate PNL for EVM chains (ETH and AVAX)
  const chainId = isSolana ? null : selectedChainId;

  const fetchPNLData = useCallback(async () => {
    // Skip for Solana or when not connected
    if (!address || !isConnected || chainId === null) {
      setPnlData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/wallet/pnl', window.location.origin);
      url.searchParams.set('address', address);
      url.searchParams.set('chainId', chainId.toString());

      console.log(`[usePNLData] Fetching PNL for ${address} on chain ${chainId}`);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch PNL data');
      }

      setPnlData(data.data);
    } catch (err) {
      console.error('[usePNLData] Error fetching PNL data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PNL data');
      setPnlData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, chainId]);

  // Track last fetched chainId to refetch when network changes
  const lastFetchedChainId = useRef<number | null>(null);

  // Initial fetch and refetch when chain changes
  useEffect(() => {
    // Reset when disconnected
    if (!isConnected) {
      lastFetchedChainId.current = null;
      setPnlData(null);
      return;
    }

    // Skip for Solana
    if (chainId === null) {
      setPnlData(null);
      return;
    }

    // Fetch if connected and chain changed (or first fetch)
    if (isConnected && address && chainId !== lastFetchedChainId.current) {
      lastFetchedChainId.current = chainId;
      fetchPNLData();
    }
  }, [isConnected, address, chainId, fetchPNLData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected || !address || chainId === null) return;

    const interval = setInterval(() => {
      fetchPNLData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, address, chainId, fetchPNLData]);

  // Listen for transaction completed events to refresh PNL
  useEffect(() => {
    const handleTransactionCompleted = () => {
      // Delay refresh to allow blockchain to update
      setTimeout(() => {
        fetchPNLData();
      }, 3000);
    };

    window.addEventListener('transaction-completed', handleTransactionCompleted);
    return () => window.removeEventListener('transaction-completed', handleTransactionCompleted);
  }, [fetchPNLData]);

  return {
    pnlData,
    isLoading,
    error,
    refetch: fetchPNLData,
  };
}
