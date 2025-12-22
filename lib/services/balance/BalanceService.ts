/**
 * Balance Service
 * Fetches native and ERC20 token balances for a wallet
 * Can be called directly from tools or via API route
 */

import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { VIEM_CHAINS, NATIVE_SYMBOLS, getChainName } from '@/lib/constants/blockchain';
import { TokenRegistry } from '@/lib/services/token/TokenRegistry';

// SIERRA rate from environment (1 SIERRA = X USDC)
const SIERRA_USDC_RATE = parseFloat(process.env.NEXT_PUBLIC_SIERRA_USDC_RATE || '1.005814');

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
      return SIERRA_USDC_RATE; // Use rate from .env
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

  // Get ERC20 token balances using TokenRegistry
  const tokensForChain = TokenRegistry.getAllTokens(chainId).filter((t) => !t.isNative);

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
  const nativeBalance = balances.find((b) => b.currency === nativeSymbol);
  const tokenBalances = balances.filter((b) => b.currency !== nativeSymbol);

  // Sort tokens by USD value descending
  tokenBalances.sort((a, b) => b.usdValue - a.usdValue);

  const result: WalletBalanceResult = {
    native: nativeBalance
      ? {
          symbol: nativeBalance.currency,
          balance: nativeBalance.available.toString(),
          balanceUsd: nativeBalance.usdValue,
        }
      : {
          symbol: nativeSymbol,
          balance: '0',
          balanceUsd: 0,
        },
    tokens: tokenBalances.map((t) => ({
      symbol: t.currency,
      address: '',
      balance: t.available.toString(),
      balanceUsd: t.usdValue,
    })),
    totalUsd: totalEquity,
    chainId,
    chainName: getChainName(chainId),
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
