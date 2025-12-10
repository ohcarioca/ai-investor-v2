import { NextRequest, NextResponse } from 'next/server';
import { getOKXClient, CHAIN_INDEX_MAP } from '@/lib/okx-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, fromToken, toToken, amount, slippage, userAddress } =
      body;

    // Validation
    if (!chainId || !fromToken || !toToken || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const chainIndex = CHAIN_INDEX_MAP[parseInt(chainId)];
    if (!chainIndex) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // Get swap transaction data from OKX SDK
    const client = getOKXClient();
    const swapResult = await client.dex.getSwapData({
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippagePercent: slippage || '0.5',
      userWalletAddress: userAddress,
    });

    // Check if swap data was successfully retrieved
    if (!swapResult.data || swapResult.data.length === 0) {
      return NextResponse.json(
        { error: 'No swap data available for this transaction' },
        { status: 404 }
      );
    }

    const swapData = swapResult.data[0];

    // Transform to our transaction format
    const transaction = {
      to: swapData.tx.to,
      data: swapData.tx.data,
      value: swapData.tx.value || '0',
      gasLimit: swapData.tx.gas,
    };

    // Also return quote for display
    const quote = {
      fromToken: {
        address: fromToken,
        symbol: swapData.fromToken.symbol,
        decimals: parseInt(swapData.fromToken.decimal),
        name: swapData.fromToken.symbol,
      },
      toToken: {
        address: toToken,
        symbol: swapData.toToken.symbol,
        decimals: parseInt(swapData.toToken.decimal),
        name: swapData.toToken.symbol,
      },
      fromAmount: amount,
      toAmount: swapData.toTokenAmount,
      toAmountMin: swapData.minReceiveAmount,
      exchangeRate: swapData.exchangeRate,
      priceImpact: swapData.priceImpact || '0',
      estimatedGas: swapData.estimatedGas,
      route: [],
    };

    return NextResponse.json({
      transaction,
      quote,
    });
  } catch (error) {
    console.error('Build swap error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to build swap transaction',
      },
      { status: 500 }
    );
  }
}
