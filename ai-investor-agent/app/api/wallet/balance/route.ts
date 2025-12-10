import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { avalanche } from 'viem/chains';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';

// Token addresses - Limited to USDC and SIERRA on Avalanche only
const TOKEN_ADDRESSES: Record<number, Array<{ address: string; symbol: string; decimals: number }>> = {
  43114: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
    { address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7', symbol: 'SIERRA', decimals: 18 },
  ],
};

// Token prices - Limited to USDC, SIERRA, AVAX only (placeholder - in production use real price oracle)
const getTokenPrice = (symbol: string): number => {
  switch (symbol) {
    case 'USDC':
      return 1;
    case 'AVAX':
      return 14.59;
    case 'SIERRA':
      return 1;
    default:
      return 0;
  }
};

export async function POST(req: NextRequest) {
  try {
    const { address, chainId } = await req.json();

    // CRITICAL: Validate wallet address (must be from connected wallet)
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required. Please connect your wallet.' },
        { status: 400 }
      );
    }

    // Validate address format using wallet validation utility
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please check your wallet connection.' },
        { status: 400 }
      );
    }

    // Validate not a placeholder or example address
    if (!isRealAddress(address)) {
      return NextResponse.json(
        { error: 'Cannot use placeholder or example addresses. Please connect your real wallet.' },
        { status: 400 }
      );
    }

    const chain = chainId || 43114; // Default to Avalanche

    // Create public client for reading blockchain data
    const publicClient = createPublicClient({
      chain: avalanche,
      transport: http(),
    });

    const balances: Array<{
      currency: string;
      available: number;
      frozen: number;
      usdValue: number;
    }> = [];
    let totalEquity = 0;

    // Get native AVAX balance
    try {
      const nativeBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      const formattedNative = parseFloat(formatUnits(nativeBalance, 18));
      const nativePrice = getTokenPrice('AVAX');
      const nativeUsdValue = formattedNative * nativePrice;

      balances.push({
        currency: 'AVAX',
        available: formattedNative,
        frozen: 0,
        usdValue: nativeUsdValue,
      });
      totalEquity += nativeUsdValue;
    } catch (error) {
      console.error('Failed to fetch native balance:', error);
    }

    // Get ERC20 token balances
    const tokensForChain = TOKEN_ADDRESSES[chain] || [];

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
      } catch (error) {
        console.warn(`Failed to fetch ${token.symbol} balance:`, error);
      }
    }

    // Sort by USD value descending
    balances.sort((a, b) => b.usdValue - a.usdValue);

    return NextResponse.json({
      balances,
      totalEquity,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
