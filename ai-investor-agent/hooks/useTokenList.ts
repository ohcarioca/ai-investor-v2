'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Token } from '@/types/swap';

// Token list for Avalanche C-Chain - Limited to USDC, SIERRA, AVAX only
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

export function useTokenList() {
  const { chain } = useAccount();

  const tokens = useMemo(() => {
    // For now, only support Avalanche
    // Can expand to support multiple chains
    if (chain?.id === 43114) {
      return AVALANCHE_TOKENS;
    }
    return AVALANCHE_TOKENS; // Default to Avalanche
  }, [chain]);

  return { tokens };
}
