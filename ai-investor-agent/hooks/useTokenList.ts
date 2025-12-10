'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Token } from '@/types/swap';

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
    address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  {
    address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    symbol: 'WETH.e',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: '0x50b7545627a5162F82A992c33b87aDc75187B218',
    symbol: 'WBTC.e',
    name: 'Wrapped BTC',
    decimals: 8,
  },
  {
    address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
    symbol: 'SIERRA',
    name: 'SIERRA',
    decimals: 18,
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
