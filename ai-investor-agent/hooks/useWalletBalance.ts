'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import type { AccountBalance, Balance } from '@/types/wallet';

/**
 * Token addresses by chain ID
 */
const TOKEN_ADDRESSES: Record<number, Array<{ address: string; symbol: string; decimals: number }>> = {
  // Avalanche C-Chain (43114)
  43114: [
    {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH.e on Avalanche
      symbol: 'WETH.e',
      decimals: 18,
    },
  ],
  // Base (8453)
  8453: [
    {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x4200000000000000000000000000000000000006', // WETH on Base
      symbol: 'WETH',
      decimals: 18,
    },
  ],
  // Ethereum Mainnet (1)
  1: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
      symbol: 'WETH',
      decimals: 18,
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

      // Get token prices based on symbol
      const getTokenPrice = (symbol: string): number => {
        switch (symbol) {
          case 'USDC':
          case 'USDT':
          case 'DAI':
            return 1; // Stablecoins
          case 'AVAX':
            return 14.59; // AVAX price (update with real oracle)
          case 'ETH':
          case 'WETH':
          case 'WETH.e':
            return 3500; // ETH price placeholder
          case 'BTC':
          case 'WBTC':
            return 43000; // BTC price placeholder
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
      const chainId = chain?.id || 43114; // Default to Avalanche
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

          if (formattedBalance > 0) {
            const tokenPrice = getTokenPrice(token.symbol);
            const usdValue = formattedBalance * tokenPrice;

            balances.push({
              currency: token.symbol,
              available: formattedBalance,
              frozen: 0,
              usdValue,
            });
            totalEquity += usdValue;
          }
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
  }, [address, isConnected, publicClient, nativeBalance]);

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
