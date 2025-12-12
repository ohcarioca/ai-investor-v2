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
    // OKX SDK expects slippage as decimal (0.5% = 0.005)
    // If the caller sends percentage (e.g., "0.5"), convert it
    const rawSlippage = searchParams.get('slippage') || '0.5';
    const slippageValue = parseFloat(rawSlippage);
    // If value > 1, assume it's a percentage and convert to decimal
    const slippage = slippageValue > 1 ? (slippageValue / 100).toString() : rawSlippage;

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
      chainId: chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage,
    });

    console.log('OKX Quote Result:', JSON.stringify(quoteResult, null, 2));

    // Check if quote was successful - OKX returns data in different formats
    if (!quoteResult || !quoteResult.data) {
      return NextResponse.json(
        { error: 'No quote available for this token pair' },
        { status: 404 }
      );
    }

    // OKX SDK returns data in data array
    const quoteData = Array.isArray(quoteResult.data) ? quoteResult.data[0] : quoteResult.data;

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
    const quoteDataRecord = quoteData as unknown as Record<string, unknown>;
    const fromTokenData = (quoteData.fromToken || quoteDataRecord.fromTokenInfo || {}) as unknown as Record<string, unknown>;
    const toTokenData = (quoteData.toToken || quoteDataRecord.toTokenInfo || {}) as unknown as Record<string, unknown>;

    const fromDecimals = parseInt((fromTokenData.decimal as string) || '18');
    const toDecimals = parseInt((toTokenData.decimal as string) || '18');
    const toAmount = (quoteData.toTokenAmount || quoteDataRecord.toAmount || '0') as string;

    // Calculate exchange rate if not provided
    let exchangeRate = (quoteDataRecord.exchangeRate || quoteDataRecord.price || '0') as string;
    if (exchangeRate === '0' && parseFloat(amount) > 0 && parseFloat(toAmount as string) > 0) {
      // Exchange rate = toAmount / fromAmount (both in human-readable units)
      const fromAmountFloat = parseFloat(amount) / Math.pow(10, fromDecimals);
      const toAmountFloat = parseFloat(toAmount as string) / Math.pow(10, toDecimals);
      exchangeRate = (toAmountFloat / fromAmountFloat).toString();
    }

    const quote = {
      fromToken: {
        address: fromToken,
        symbol: (fromTokenData.tokenSymbol as string) || 'UNKNOWN',
        decimals: fromDecimals,
        name: (fromTokenData.tokenSymbol as string) || 'Unknown Token',
        isNative: fromToken === NATIVE_TOKEN_ADDRESS,
      },
      toToken: {
        address: toToken,
        symbol: (toTokenData.tokenSymbol as string) || 'UNKNOWN',
        decimals: toDecimals,
        name: (toTokenData.tokenSymbol as string) || 'Unknown Token',
        isNative: toToken === NATIVE_TOKEN_ADDRESS,
      },
      fromAmount: amount,
      toAmount,
      toAmountMin: '0', // Calculate min amount based on slippage
      exchangeRate,
      priceImpact: quoteData.priceImpactPercentage || '0',
      estimatedGas: quoteData.estimateGasFee || '0',
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
