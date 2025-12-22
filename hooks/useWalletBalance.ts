'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import type { AccountBalance, Balance } from '@/types/wallet';

/**
 * Token addresses - USDC and SIERRA on Ethereum and Avalanche
 */
const TOKEN_ADDRESSES: Record<
  number,
  Array<{ address: string; symbol: string; decimals: number }>
> = {
  // Ethereum Mainnet (1)
  1: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x6bf7788EAA948d9fFBA7E9bb386E2D3c9810e0fc', // SIERRA on Ethereum
      symbol: 'SIERRA',
      decimals: 6,
    },
  ],
  // Avalanche C-Chain (43114)
  43114: [
    {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7', // SIERRA on Avalanche
      symbol: 'SIERRA',
      decimals: 6,
    },
  ],
};

/**
 * Hook to fetch wallet balances for connected wallet
 * Uses Wagmi/Viem to read balances directly from blockchain
 */
export function useWalletBalance(autoRefresh: boolean = false, refreshInterval: number = 30000) {
  const { address, isConnected, chain } = useAccount();
  // Pass chainId to get the correct public client for the connected chain
  const publicClient = usePublicClient({ chainId: chain?.id });

  // Get native token balance for the connected chain
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address,
    chainId: chain?.id,
  });

  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenBalances = useCallback(async () => {
    console.log('[useWalletBalance] fetchTokenBalances called', {
      address,
      isConnected,
      chainId: chain?.id,
      hasPublicClient: !!publicClient,
      timestamp: new Date().toISOString(),
    });

    if (!address || !isConnected) {
      console.warn('[useWalletBalance] Wallet not connected', { address, isConnected });
      setError('Wallet not connected');
      return;
    }

    if (!publicClient) {
      console.error('[useWalletBalance] Public client not available', {
        chainId: chain?.id,
        chainName: chain?.name,
      });
      setError('Network client not available. Please check your connection.');
      return;
    }

    if (!chain?.id) {
      console.error('[useWalletBalance] Chain ID not available');
      setError('Network not detected. Please switch to Ethereum or Avalanche.');
      return;
    }

    // Check if we support this chain
    if (!TOKEN_ADDRESSES[chain.id]) {
      console.error('[useWalletBalance] Unsupported chain', {
        chainId: chain.id,
        chainName: chain.name,
      });
      setError(`Unsupported network. Please switch to Ethereum or Avalanche.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('[useWalletBalance] Starting balance fetch', {
      chain: chain.id,
      chainName: chain.name,
      address,
      tokens: TOKEN_ADDRESSES[chain.id].map((t) => t.symbol),
    });

    try {
      const balances: Balance[] = [];
      let totalEquity = 0;

      // Get token prices - ETH, AVAX, USDC, SIERRA
      const getTokenPrice = (symbol: string): number => {
        switch (symbol) {
          case 'USDC':
            return 1; // Stablecoin
          case 'ETH':
            return 3500; // ETH price (update with real oracle)
          case 'AVAX':
            return 14.59; // AVAX price (update with real oracle)
          case 'SIERRA':
            return 1; // SIERRA price - update with real price feed
          default:
            return 0;
        }
      };

      // Add native token balance
      if (nativeBalance) {
        const tokenValue = parseFloat(nativeBalance.formatted);
        const tokenPrice = getTokenPrice(nativeBalance.symbol);
        const usdValue = tokenValue * tokenPrice;

        balances.push({
          currency: nativeBalance.symbol,
          available: tokenValue,
          frozen: 0,
          usdValue,
        });
        totalEquity += usdValue;
      }

      // Get tokens for current chain
      const chainId = chain?.id || 1; // Default to Ethereum
      const tokensForChain = TOKEN_ADDRESSES[chainId] || [];

      // Fetch ERC20 token balances
      for (const token of tokensForChain) {
        try {
          console.log(`[useWalletBalance] Fetching ${token.symbol} balance...`, {
            tokenAddress: token.address,
            walletAddress: address,
          });

          const tokenBalance = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          });

          const formattedBalance = parseFloat(formatUnits(tokenBalance, token.decimals));
          const tokenPrice = getTokenPrice(token.symbol);
          const usdValue = formattedBalance * tokenPrice;

          console.log(`[useWalletBalance] ${token.symbol} balance fetched`, {
            raw: tokenBalance.toString(),
            formatted: formattedBalance,
            usdValue,
          });

          // Always add token to balances, even if balance is 0
          balances.push({
            currency: token.symbol,
            available: formattedBalance,
            frozen: 0,
            usdValue,
          });

          totalEquity += usdValue;
        } catch (tokenError) {
          console.error(`[useWalletBalance] Failed to fetch ${token.symbol} balance`, {
            tokenAddress: token.address,
            error: tokenError instanceof Error ? tokenError.message : tokenError,
            errorDetails: tokenError,
          });
        }
      }

      console.log('[useWalletBalance] All balances fetched successfully', {
        balanceCount: balances.length,
        totalEquity,
        balances: balances.map((b) => ({
          currency: b.currency,
          available: b.available,
          usdValue: b.usdValue,
        })),
      });

      setBalance({
        balances: balances.sort((a, b) => b.usdValue - a.usdValue),
        totalEquity,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[useWalletBalance] Balance fetch error', {
        error: err instanceof Error ? err.message : err,
        errorDetails: err,
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
      console.log('[useWalletBalance] Fetch completed', { isLoading: false });
    }
  }, [address, isConnected, publicClient, nativeBalance, chain?.id, chain?.name]);

  const refetch = useCallback(async () => {
    await refetchNative();
    await fetchTokenBalances();
  }, [refetchNative, fetchTokenBalances]);

  // Auto-fetch on mount and when dependencies change (including chain switches)
  useEffect(() => {
    console.log('[useWalletBalance] useEffect triggered', {
      isConnected,
      address,
      hasPublicClient: !!publicClient,
      chainId: chain?.id,
      chainName: chain?.name,
    });

    if (isConnected && address && publicClient && chain?.id) {
      console.log('[useWalletBalance] All conditions met, fetching balances...');
      fetchTokenBalances();
    } else {
      console.log('[useWalletBalance] Skipping fetch - missing requirements', {
        hasAddress: !!address,
        isConnected,
        hasPublicClient: !!publicClient,
        hasChainId: !!chain?.id,
      });
    }
  }, [isConnected, address, publicClient, chain?.id, chain?.name, fetchTokenBalances]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isConnected && address) {
      const interval = setInterval(() => {
        refetch();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isConnected, address, refetch]);

  // Listen for transaction-completed events to refresh balance
  useEffect(() => {
    const handleTransactionCompleted = (event: CustomEvent) => {
      console.log('[useWalletBalance] Transaction completed, refreshing balance...', event.detail);
      // Small delay to allow blockchain state to update
      setTimeout(() => {
        refetch();
      }, 2000);
    };

    window.addEventListener('transaction-completed', handleTransactionCompleted as EventListener);

    return () => {
      window.removeEventListener(
        'transaction-completed',
        handleTransactionCompleted as EventListener
      );
    };
  }, [refetch]);

  return {
    balance,
    isLoading,
    error,
    refetch,
    isConnected,
  };
}
