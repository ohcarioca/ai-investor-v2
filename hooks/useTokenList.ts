'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Token } from '@/types/swap';
import { CHAIN_IDS } from '@/contexts/NetworkContext';

// Token list for Ethereum Mainnet
const ETHEREUM_TOKENS: Token[] = [
  {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    address: '0x6bf7788EAA948d9fFBA7E9bb386E2D3c9810e0fc',
    symbol: 'SIERRA',
    name: 'SIERRA',
    decimals: 6,
  },
];

// Token list for Avalanche C-Chain
const AVALANCHE_TOKENS: Token[] = [
  {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    isNative: true,
  },
  {
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
    symbol: 'SIERRA',
    name: 'SIERRA',
    decimals: 6,
  },
];

// Map of chain ID to token list
const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  [CHAIN_IDS.ETHEREUM]: ETHEREUM_TOKENS,
  [CHAIN_IDS.AVALANCHE]: AVALANCHE_TOKENS,
};

export function useTokenList() {
  const { chain } = useAccount();

  const tokens = useMemo(() => {
    const chainId = chain?.id;
    if (chainId && TOKENS_BY_CHAIN[chainId]) {
      return TOKENS_BY_CHAIN[chainId];
    }
    // Default to Ethereum if no chain detected
    return ETHEREUM_TOKENS;
  }, [chain]);

  return { tokens };
}
