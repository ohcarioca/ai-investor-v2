import { NextRequest, NextResponse } from 'next/server';
import {
  getOKXClient,
  CHAIN_INDEX_MAP,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/okx-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate parameters
    const chainId = searchParams.get('chainId');
    const fromToken = searchParams.get('fromToken');
    const toToken = searchParams.get('toToken');
    const amount = searchParams.get('amount');
    const slippage = searchParams.get('slippage') || '0.5';

    // Validation
    if (!chainId || !fromToken || !toToken || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get chain index
    const chainIndex = CHAIN_INDEX_MAP[parseInt(chainId)];
    if (!chainIndex) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // Call OKX SDK
    const client = getOKXClient();
    const quoteResult = await client.dex.getQuote({
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippagePercent: slippage,
    });

    // Check if quote was successful
    if (!quoteResult.data || quoteResult.data.length === 0) {
      return NextResponse.json(
        { error: 'No quote available for this token pair' },
        { status: 404 }
      );
    }

    const quoteData = quoteResult.data[0];

    // Transform OKX response to our format
    const quote = {
      fromToken: {
        address: fromToken,
        symbol: quoteData.fromToken.symbol,
        decimals: parseInt(quoteData.fromToken.decimal),
        name: quoteData.fromToken.symbol,
        isNative: fromToken === NATIVE_TOKEN_ADDRESS,
      },
      toToken: {
        address: toToken,
        symbol: quoteData.toToken.symbol,
        decimals: parseInt(quoteData.toToken.decimal),
        name: quoteData.toToken.symbol,
        isNative: toToken === NATIVE_TOKEN_ADDRESS,
      },
      fromAmount: amount,
      toAmount: quoteData.toTokenAmount,
      toAmountMin: quoteData.minReceiveAmount,
      exchangeRate: quoteData.exchangeRate,
      priceImpact: quoteData.priceImpact || '0',
      estimatedGas: quoteData.estimatedGas,
      route: [], // OKX doesn't expose route details easily
    };

    return NextResponse.json({
      quote,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch quote',
      },
      { status: 500 }
    );
  }
}
