'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import type { AccountBalance, Balance } from '@/types/wallet';

/**
 * Token addresses - USDC and SIERRA on Ethereum and Avalanche
 */
const TOKEN_ADDRESSES: Record<number, Array<{ address: string; symbol: string; decimals: number }>> = {
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
  const publicClient = usePublicClient();

  // Get native token balance
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address,
  });

  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenBalances = useCallback(async () => {
    if (!address || !isConnected || !publicClient) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

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
          const tokenBalance = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          });

          const formattedBalance = parseFloat(formatUnits(tokenBalance, token.decimals));
          const tokenPrice = getTokenPrice(token.symbol);
          const usdValue = formattedBalance * tokenPrice;

          // Always add token to balances, even if balance is 0
          balances.push({
            currency: token.symbol,
            available: formattedBalance,
            frozen: 0,
            usdValue,
          });

          totalEquity += usdValue;
        } catch (tokenError) {
          console.warn(`Failed to fetch ${token.symbol} balance:`, tokenError);
        }
      }

      setBalance({
        balances: balances.sort((a, b) => b.usdValue - a.usdValue),
        totalEquity,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, publicClient, nativeBalance, chain?.id]);

  const refetch = useCallback(async () => {
    await refetchNative();
    await fetchTokenBalances();
  }, [refetchNative, fetchTokenBalances]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (isConnected && address) {
      fetchTokenBalances();
    }
  }, [isConnected, address, fetchTokenBalances]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isConnected && address) {
      const interval = setInterval(() => {
        refetch();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isConnected, address, refetch]);

  return {
    balance,
    isLoading,
    error,
    refetch,
    isConnected,
  };
}
