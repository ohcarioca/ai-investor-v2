/**
 * Balance Service
 * Fetches native and ERC20 token balances for a wallet
 * Can be called directly from tools or via API route
 */

import { createPublicClient, http, formatUnits, erc20Abi, Chain } from 'viem';
import { avalanche, mainnet } from 'viem/chains';

// Chain configurations
const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  43114: avalanche,
};

// Token addresses by chain
const TOKEN_ADDRESSES: Record<
  number,
  Array<{ address: string; symbol: string; decimals: number }>
> = {
  // Ethereum Mainnet
  1: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0x6bf7788EAA948d9fFBA7E9bb386E2D3c9810e0fc', symbol: 'SIERRA', decimals: 6 },
  ],
  // Avalanche C-Chain
  43114: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
    { address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7', symbol: 'SIERRA', decimals: 6 },
  ],
};

// Native token symbol by chain
const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  43114: 'AVAX',
};

// Token prices - placeholder (in production use real price oracle)
const getTokenPrice = (symbol: string): number => {
  switch (symbol) {
    case 'USDC':
      return 1;
    case 'ETH':
      return 3500; // Placeholder ETH price
    case 'AVAX':
      return 14.59;
    case 'SIERRA':
      return 1;
    default:
      return 0;
  }
};

export interface WalletBalanceResult {
  native: {
    symbol: string;
    balance: string;
    balanceUsd: number;
  };
  tokens: Array<{
    symbol: string;
    address: string;
    balance: string;
    balanceUsd: number;
  }>;
  totalUsd: number;
  chainId: number;
  chainName: string;
  lastUpdated: string;
}

export interface BalanceRequest {
  address: string;
  chainId?: number;
}

export async function fetchWalletBalance(request: BalanceRequest): Promise<WalletBalanceResult> {
  const { address, chainId: requestedChainId } = request;
  const chainId = requestedChainId || 1; // Default to Ethereum

  console.log('[BalanceService] Fetching balance:', {
    address: address?.slice(0, 10) + '...',
    chainId,
  });

  const viemChain = VIEM_CHAINS[chainId];

  if (!viemChain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  // Create public client for reading blockchain data
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(),
  });

  const balances: Array<{
    currency: string;
    available: number;
    frozen: number;
    usdValue: number;
  }> = [];
  let totalEquity = 0;

  // Get native token balance (ETH or AVAX)
  const nativeSymbol = NATIVE_SYMBOLS[chainId] || 'ETH';
  try {
    const nativeBalance = await publicClient.getBalance({
      address: address as `0x${string}`,
    });
    const formattedNative = parseFloat(formatUnits(nativeBalance, 18));
    const nativePrice = getTokenPrice(nativeSymbol);
    const nativeUsdValue = formattedNative * nativePrice;

    balances.push({
      currency: nativeSymbol,
      available: formattedNative,
      frozen: 0,
      usdValue: nativeUsdValue,
    });
    totalEquity += nativeUsdValue;
    console.log(`[BalanceService] ${nativeSymbol} balance: ${formattedNative}`);
  } catch (error) {
    console.error(`[BalanceService] Failed to fetch ${nativeSymbol} balance:`, error);
  }

  // Get ERC20 token balances
  const tokensForChain = TOKEN_ADDRESSES[chainId] || [];

  for (const token of tokensForChain) {
    try {
      const tokenBalance = await publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      const formattedBalance = parseFloat(formatUnits(tokenBalance, token.decimals));
      const tokenPrice = getTokenPrice(token.symbol);
      const usdValue = formattedBalance * tokenPrice;

      balances.push({
        currency: token.symbol,
        available: formattedBalance,
        frozen: 0,
        usdValue,
      });

      totalEquity += usdValue;
      console.log(`[BalanceService] ${token.symbol} balance: ${formattedBalance}`);
    } catch (error) {
      console.warn(`[BalanceService] Failed to fetch ${token.symbol} balance:`, error);
    }
  }

  // Separate native token from ERC20 tokens
  const nativeBalance = balances.find(b => b.currency === nativeSymbol);
  const tokenBalances = balances.filter(b => b.currency !== nativeSymbol);

  // Sort tokens by USD value descending
  tokenBalances.sort((a, b) => b.usdValue - a.usdValue);

  const result: WalletBalanceResult = {
    native: nativeBalance ? {
      symbol: nativeBalance.currency,
      balance: nativeBalance.available.toString(),
      balanceUsd: nativeBalance.usdValue,
    } : {
      symbol: nativeSymbol,
      balance: '0',
      balanceUsd: 0,
    },
    tokens: tokenBalances.map(t => ({
      symbol: t.currency,
      address: '',
      balance: t.available.toString(),
      balanceUsd: t.usdValue,
    })),
    totalUsd: totalEquity,
    chainId,
    chainName: chainId === 1 ? 'Ethereum' : 'Avalanche',
    lastUpdated: new Date().toISOString(),
  };

  console.log('[BalanceService] Balance result:', {
    chainId: result.chainId,
    chainName: result.chainName,
    nativeSymbol: result.native.symbol,
    nativeBalance: result.native.balance,
    totalUsd: result.totalUsd,
    tokenCount: result.tokens.length,
  });

  return result;
}
