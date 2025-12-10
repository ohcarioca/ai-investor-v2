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

    console.log('Fetching quote with params:', {
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage,
    });

    const quoteResult = await client.dex.getQuote({
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage,
    });

    console.log('OKX Quote Result:', JSON.stringify(quoteResult, null, 2));

    // Check if quote was successful - OKX returns data in different formats
    if (!quoteResult || (!quoteResult.data && !quoteResult.routerResult)) {
      return NextResponse.json(
        { error: 'No quote available for this token pair' },
        { status: 404 }
      );
    }

    // OKX SDK can return data in routerResult or data array
    const quoteData = quoteResult.routerResult || (quoteResult.data && quoteResult.data[0]);

    if (!quoteData) {
      console.error('No quote data found in response:', quoteResult);
      return NextResponse.json(
        { error: 'No quote data available' },
        { status: 404 }
      );
    }

    console.log('Quote Data:', JSON.stringify(quoteData, null, 2));

    // Transform OKX response to our format
    // OKX SDK may use different field names
    const fromTokenData = quoteData.fromToken || quoteData.fromTokenInfo || {};
    const toTokenData = quoteData.toToken || quoteData.toTokenInfo || {};

    const quote = {
      fromToken: {
        address: fromToken,
        symbol: fromTokenData.symbol || fromTokenData.tokenSymbol || 'UNKNOWN',
        decimals: parseInt(fromTokenData.decimal || fromTokenData.decimals || '18'),
        name: fromTokenData.name || fromTokenData.symbol || fromTokenData.tokenSymbol || 'Unknown Token',
        isNative: fromToken === NATIVE_TOKEN_ADDRESS,
      },
      toToken: {
        address: toToken,
        symbol: toTokenData.symbol || toTokenData.tokenSymbol || 'UNKNOWN',
        decimals: parseInt(toTokenData.decimal || toTokenData.decimals || '18'),
        name: toTokenData.name || toTokenData.symbol || toTokenData.tokenSymbol || 'Unknown Token',
        isNative: toToken === NATIVE_TOKEN_ADDRESS,
      },
      fromAmount: amount,
      toAmount: quoteData.toTokenAmount || quoteData.toAmount || '0',
      toAmountMin: quoteData.minReceiveAmount || quoteData.toAmountMin || '0',
      exchangeRate: quoteData.exchangeRate || quoteData.price || '0',
      priceImpact: quoteData.priceImpact || quoteData.priceImpactPercentage || '0',
      estimatedGas: quoteData.estimatedGas || quoteData.gasEstimate || '0',
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
