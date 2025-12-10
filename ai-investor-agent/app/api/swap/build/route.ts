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

    console.log('Building swap with params:', {
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage || '0.5',
      userWalletAddress: userAddress,
    });

    const swapResult = await client.dex.getSwapData({
      chainId: chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage || '0.5',
      userWalletAddress: userAddress,
    });

    console.log('OKX Swap Result:', JSON.stringify(swapResult, null, 2));

    // Check if swap data was successfully retrieved - OKX returns data in different formats
    if (!swapResult || !swapResult.data) {
      return NextResponse.json(
        { error: 'No swap data available for this transaction' },
        { status: 404 }
      );
    }

    // OKX SDK returns data in data array
    const swapData = Array.isArray(swapResult.data) ? swapResult.data[0] : swapResult.data;

    if (!swapData) {
      console.error('No swap data found in response:', swapResult);
      return NextResponse.json(
        { error: 'No swap data available' },
        { status: 404 }
      );
    }

    console.log('Swap Data:', JSON.stringify(swapData, null, 2));

    // Extract transaction data with flexible field access
    const txData = swapData.tx || (swapData as any).transaction || {};

    // Transform to our transaction format
    const transaction = {
      to: txData.to,
      data: txData.data,
      value: txData.value || '0',
      gasLimit: txData.gas || txData.gasLimit,
    };

    // Extract token data with flexible field names
    const swapDataAny = swapData as any;
    const fromTokenData = swapDataAny.fromToken || swapDataAny.fromTokenInfo || {};
    const toTokenData = swapDataAny.toToken || swapDataAny.toTokenInfo || {};

    const fromDecimals = parseInt(fromTokenData.decimal || fromTokenData.decimals || '18');
    const toDecimals = parseInt(toTokenData.decimal || toTokenData.decimals || '18');
    const toAmount = swapDataAny.toTokenAmount || swapDataAny.toAmount || '0';

    // Calculate exchange rate if not provided
    let exchangeRate = swapDataAny.exchangeRate || swapDataAny.price || '0';
    if (exchangeRate === '0' && parseFloat(amount) > 0 && parseFloat(toAmount) > 0) {
      // Exchange rate = toAmount / fromAmount (both in human-readable units)
      const fromAmountFloat = parseFloat(amount) / Math.pow(10, fromDecimals);
      const toAmountFloat = parseFloat(toAmount) / Math.pow(10, toDecimals);
      exchangeRate = (toAmountFloat / fromAmountFloat).toString();
    }

    // Also return quote for display
    const quote = {
      fromToken: {
        address: fromToken,
        symbol: fromTokenData.symbol || fromTokenData.tokenSymbol || 'UNKNOWN',
        decimals: fromDecimals,
        name: fromTokenData.name || fromTokenData.symbol || fromTokenData.tokenSymbol || 'Unknown Token',
      },
      toToken: {
        address: toToken,
        symbol: toTokenData.symbol || toTokenData.tokenSymbol || 'UNKNOWN',
        decimals: toDecimals,
        name: toTokenData.name || toTokenData.symbol || toTokenData.tokenSymbol || 'Unknown Token',
      },
      fromAmount: amount,
      toAmount,
      toAmountMin: swapDataAny.minReceiveAmount || swapDataAny.toAmountMin || '0',
      exchangeRate,
      priceImpact: swapDataAny.priceImpact || swapDataAny.priceImpactPercentage || '0',
      estimatedGas: swapDataAny.estimatedGas || swapDataAny.gasEstimate || '0',
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
