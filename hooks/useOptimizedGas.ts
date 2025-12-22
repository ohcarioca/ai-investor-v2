'use client';

/**
 * useOptimizedGas Hook
 *
 * Automatically fetches and optimizes gas prices for transactions.
 * Provides cost estimates in USD and network congestion status.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import type {
  OptimizedGas,
  NetworkStatus,
  GasEstimate,
  UseOptimizedGasReturn,
  OperationType,
} from '@/types/gas';
import { getGasEstimator } from '@/lib/services/gas/GasEstimator';

// Cache duration in milliseconds
const CACHE_DURATION_MS = 15000;

// Network congestion thresholds (in Gwei)
const CONGESTION_THRESHOLDS = {
  ethereum: {
    low: 20, // Below 20 Gwei is low
    high: 80, // Above 80 Gwei is high
  },
  avalanche: {
    low: 25, // Below 25 nAVAX is low
    high: 100, // Above 100 nAVAX is high
  },
};

// Approximate ETH/AVAX prices (fallback, updated from API)
const DEFAULT_NATIVE_PRICES: Record<number, number> = {
  1: 3500, // ETH price in USD
  43114: 35, // AVAX price in USD
};

// Priority fee optimization (in Gwei)
const PRIORITY_FEE_CONFIG = {
  low: 0.5, // Minimum priority fee when network is quiet
  normal: 1.5, // Standard priority fee
  high: 3, // Higher priority fee for congested network
};

export function useOptimizedGas(): UseOptimizedGasReturn {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [optimizedGas, setOptimizedGas] = useState<OptimizedGas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativePrice, setNativePrice] = useState<number>(DEFAULT_NATIVE_PRICES[chainId] || 3500);

  const lastFetchRef = useRef<number>(0);
  const gasEstimator = getGasEstimator();

  /**
   * Determine network status based on base fee
   */
  const getNetworkStatus = useCallback(
    (baseFeeGwei: number): NetworkStatus => {
      const thresholds =
        chainId === 43114 ? CONGESTION_THRESHOLDS.avalanche : CONGESTION_THRESHOLDS.ethereum;

      if (baseFeeGwei < thresholds.low) return 'low';
      if (baseFeeGwei > thresholds.high) return 'high';
      return 'normal';
    },
    [chainId]
  );

  /**
   * Calculate optimized priority fee based on network status
   */
  const getOptimizedPriorityFee = useCallback((networkStatus: NetworkStatus): bigint => {
    const feeGwei = PRIORITY_FEE_CONFIG[networkStatus];
    return BigInt(Math.floor(feeGwei * 1e9)); // Convert to Wei
  }, []);

  /**
   * Fetch native currency price (ETH/AVAX)
   */
  const fetchNativePrice = useCallback(async () => {
    try {
      // Use CoinGecko API for price
      const coinId = chainId === 43114 ? 'avalanche-2' : 'ethereum';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { next: { revalidate: 60 } } // Cache for 60 seconds
      );

      if (response.ok) {
        const data = await response.json();
        const price = data[coinId]?.usd;
        if (price) {
          setNativePrice(price);
          return price;
        }
      }
    } catch (err) {
      console.warn('[useOptimizedGas] Failed to fetch native price:', err);
    }

    // Return cached or default price
    return nativePrice;
  }, [chainId, nativePrice]);

  /**
   * Refresh gas price from the network
   */
  const refreshGasPrice = useCallback(async () => {
    if (!publicClient) {
      setError('No public client available');
      return;
    }

    // Check cache
    const now = Date.now();
    if (now - lastFetchRef.current < CACHE_DURATION_MS && optimizedGas) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch fee data from network
      const feeData = await publicClient.estimateFeesPerGas();

      // Get base fee and format to Gwei
      const baseFeePerGas = feeData.maxFeePerGas || BigInt(0);
      const baseFeeGwei = Number(baseFeePerGas) / 1e9;

      // Determine network status
      const networkStatus = getNetworkStatus(baseFeeGwei);

      // Calculate optimized priority fee
      const optimizedPriorityFee = getOptimizedPriorityFee(networkStatus);
      const priorityFeeGwei = Number(optimizedPriorityFee) / 1e9;

      // Calculate max fee (base + priority)
      const maxFeePerGas = baseFeePerGas + optimizedPriorityFee;
      const totalFeeGwei = baseFeeGwei + priorityFeeGwei;

      // Legacy gas price (for non-EIP-1559 transactions)
      const gasPrice = feeData.gasPrice || maxFeePerGas;

      // Fetch current native price for USD estimation
      const currentPrice = await fetchNativePrice();

      // Estimate cost for a typical swap (250k gas)
      const typicalGasLimit = BigInt(250000);
      const estimatedCostWei = maxFeePerGas * typicalGasLimit;
      const estimatedCostEth = Number(estimatedCostWei) / 1e18;
      const estimatedCostUsd = estimatedCostEth * currentPrice;

      const newOptimizedGas: OptimizedGas = {
        maxFeePerGas,
        maxPriorityFeePerGas: optimizedPriorityFee,
        gasPrice,
        baseFeeGwei,
        priorityFeeGwei,
        totalFeeGwei,
        estimatedCostWei,
        estimatedCostUsd,
        networkStatus,
        lastUpdated: now,
      };

      setOptimizedGas(newOptimizedGas);
      lastFetchRef.current = now;

      console.log('[useOptimizedGas] Gas price optimized:', {
        chainId,
        baseFeeGwei: baseFeeGwei.toFixed(2),
        priorityFeeGwei: priorityFeeGwei.toFixed(2),
        totalFeeGwei: totalFeeGwei.toFixed(2),
        networkStatus,
        estimatedCostUsd: estimatedCostUsd.toFixed(4),
      });
    } catch (err) {
      console.error('[useOptimizedGas] Error fetching gas price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch gas price');
    } finally {
      setIsLoading(false);
    }
  }, [
    publicClient,
    optimizedGas,
    getNetworkStatus,
    getOptimizedPriorityFee,
    fetchNativePrice,
    chainId,
  ]);

  /**
   * Estimate transaction cost for a specific gas limit
   */
  const estimateTransactionCost = useCallback(
    (gasLimit: bigint, operationType: OperationType = 'standard_swap'): GasEstimate | null => {
      if (!optimizedGas) return null;

      // Apply margin based on operation type
      const { gasLimit: gasWithMargin, margin } = gasEstimator.estimateGasWithMargin(
        gasLimit,
        operationType
      );

      // Calculate cost
      const estimatedCostWei = optimizedGas.maxFeePerGas * gasWithMargin;
      const estimatedCostEth = Number(estimatedCostWei) / 1e18;
      const estimatedCostUsd = estimatedCostEth * nativePrice;

      return {
        gasLimit,
        gasLimitWithMargin: gasWithMargin,
        margin,
        operationType,
        estimatedCostWei,
        estimatedCostUsd,
      };
    },
    [optimizedGas, nativePrice, gasEstimator]
  );

  /**
   * Format Wei to Gwei string
   */
  const formatGwei = useCallback((wei: bigint): string => {
    const gwei = Number(wei) / 1e9;
    return gwei.toFixed(2);
  }, []);

  /**
   * Format USD amount
   */
  const formatUsd = useCallback((amount: number): string => {
    if (amount < 0.01) return '<$0.01';
    if (amount < 1) return `$${amount.toFixed(3)}`;
    return `$${amount.toFixed(2)}`;
  }, []);

  // Auto-refresh gas price on mount and chain change
  useEffect(() => {
    refreshGasPrice();
  }, [chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGasPrice();
    }, CACHE_DURATION_MS);

    return () => clearInterval(interval);
  }, [refreshGasPrice]);

  return {
    optimizedGas,
    isLoading,
    error,
    refreshGasPrice,
    estimateTransactionCost,
    formatGwei,
    formatUsd,
  };
}
