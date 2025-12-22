'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSelectedNetwork } from '@/contexts/NetworkContext';
import type { PNLResult } from '@/types/pnl';

interface UsePNLDataResult {
  pnlData: PNLResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching PNL data with smart caching
 *
 * PNL is only recalculated at key moments:
 * - Initial wallet connection
 * - Network switch (ETH/AVAX)
 * - After transaction completes (via event)
 * - Manual refresh (refetch)
 *
 * No auto-refresh - uses server-side cache (5 min TTL)
 */
export function usePNLData(): UsePNLDataResult {
  const [pnlData, setPnlData] = useState<PNLResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { selectedChainId, isSolana } = useSelectedNetwork();

  // Only calculate PNL for EVM chains (ETH and AVAX)
  const chainId = isSolana ? null : selectedChainId;

  // Fetch PNL data (uses server-side cache)
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

  // Invalidate cache and refetch - used for manual refresh and after transactions
  const invalidateAndRefetch = useCallback(async () => {
    if (!address || chainId === null) return;

    console.log(`[usePNLData] Invalidating cache and refetching for ${address} on chain ${chainId}`);

    try {
      // Invalidate server-side cache first
      await fetch('/api/wallet/pnl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chainId }),
      });
    } catch (err) {
      console.error('[usePNLData] Error invalidating cache:', err);
    }

    // Then fetch fresh data
    await fetchPNLData();
  }, [address, chainId, fetchPNLData]);

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

  // Listen for transaction completed events - invalidate cache then refetch
  useEffect(() => {
    const handleTransactionCompleted = () => {
      console.log('[usePNLData] Transaction completed, invalidating cache...');
      // Delay to allow blockchain to update
      setTimeout(() => {
        invalidateAndRefetch();
      }, 3000);
    };

    window.addEventListener('transaction-completed', handleTransactionCompleted);
    return () => window.removeEventListener('transaction-completed', handleTransactionCompleted);
  }, [invalidateAndRefetch]);

  return {
    pnlData,
    isLoading,
    error,
    refetch: invalidateAndRefetch, // Manual refresh invalidates cache
  };
}
