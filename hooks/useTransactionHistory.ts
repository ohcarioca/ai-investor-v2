'use client';

/**
 * useTransactionHistory Hook
 *
 * Fetches and manages transaction history for USDC and SIERRA tokens.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import type {
  Transaction,
  TransactionSummary,
  TransferDirection,
  UseTransactionHistoryReturn,
} from '@/types/transaction-history';

interface UseTransactionHistoryOptions {
  // Initial token filter
  tokens?: ('USDC' | 'SIERRA')[];

  // Initial limit
  limit?: number;

  // Auto-fetch on mount
  autoFetch?: boolean;

  // Direction filter
  direction?: TransferDirection;
}

export function useTransactionHistory(
  options: UseTransactionHistoryOptions = {}
): UseTransactionHistoryReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const {
    tokens: initialTokens = ['USDC', 'SIERRA'],
    limit: initialLimit = 20,
    autoFetch = true,
    direction: initialDirection,
  } = options;

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);

  // Filters
  const [tokenFilter, setTokenFilter] = useState<('USDC' | 'SIERRA')[]>(initialTokens);
  const [directionFilter, setDirectionFilter] = useState<TransferDirection | null>(
    initialDirection || null
  );

  /**
   * Fetch transactions from API
   */
  const fetchTransactions = useCallback(
    async (reset: boolean = false) => {
      if (!isConnected || !address) {
        setError('Wallet not connected');
        return;
      }

      // Validate chain
      if (![1, 43114].includes(chainId)) {
        setError('Unsupported chain. Please switch to Ethereum or Avalanche.');
        return;
      }

      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;

      try {
        const response = await fetch('/api/wallet/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            chainId,
            tokens: tokenFilter,
            limit: initialLimit,
            offset: currentOffset,
            direction: directionFilter,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch transaction history');
        }

        const data = await response.json();

        if (reset) {
          setTransactions(data.transactions);
          setOffset(initialLimit);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
          setOffset((prev) => prev + initialLimit);
        }

        setHasMore(data.hasMore);
      } catch (err) {
        console.error('[useTransactionHistory] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [address, chainId, isConnected, tokenFilter, directionFilter, offset, initialLimit]
  );

  /**
   * Fetch transaction summary
   */
  const fetchSummary = useCallback(async () => {
    if (!isConnected || !address) return;

    try {
      const params = new URLSearchParams({
        address,
        chainId: chainId.toString(),
        tokens: tokenFilter.join(','),
      });

      const response = await fetch(`/api/wallet/history?${params}`);

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('[useTransactionHistory] Summary error:', err);
    }
  }, [address, chainId, isConnected, tokenFilter]);

  /**
   * Load more transactions
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchTransactions(false);
  }, [hasMore, isLoading, fetchTransactions]);

  /**
   * Refresh transactions (reset pagination)
   */
  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchTransactions(true);
    await fetchSummary();
  }, [fetchTransactions, fetchSummary]);

  /**
   * Set token filter
   */
  const setTokenFilterHandler = useCallback((tokens: ('USDC' | 'SIERRA')[]) => {
    setTokenFilter(tokens);
    setTransactions([]);
    setOffset(0);
    setHasMore(false);
  }, []);

  /**
   * Set direction filter
   */
  const setDirectionFilterHandler = useCallback((direction: TransferDirection | null) => {
    setDirectionFilter(direction);
    setTransactions([]);
    setOffset(0);
    setHasMore(false);
  }, []);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch && isConnected && address) {
      fetchTransactions(true);
    }
  }, [autoFetch, isConnected, address, chainId, tokenFilter, directionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    transactions,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    summary,
    setTokenFilter: setTokenFilterHandler,
    setDirectionFilter: setDirectionFilterHandler,
  };
}

/**
 * Format a transaction for display
 */
export function formatTransaction(tx: Transaction): {
  type: string;
  amount: string;
  symbol: string;
  direction: string;
  date: string;
  hash: string;
  shortHash: string;
  counterparty: string;
  shortCounterparty: string;
} {
  const isTokenTransfer = 'tokenSymbol' in tx;
  const symbol = isTokenTransfer ? tx.tokenSymbol : tx.symbol;

  return {
    type: isTokenTransfer ? 'Token Transfer' : 'Native Transfer',
    amount: tx.valueFormatted,
    symbol,
    direction: tx.direction === 'in' ? 'Received' : 'Sent',
    date: tx.timestamp > 0 ? new Date(tx.timestamp * 1000).toLocaleString() : 'Pending',
    hash: tx.hash,
    shortHash: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
    counterparty: tx.direction === 'in' ? tx.from : tx.to,
    shortCounterparty:
      tx.direction === 'in'
        ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
        : `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`,
  };
}
