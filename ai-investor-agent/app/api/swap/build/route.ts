import { NextRequest, NextResponse } from 'next/server';
import { getOKXClient, CHAIN_INDEX_MAP } from '@/lib/okx-server';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, fromToken, toToken, amount, slippage, userAddress } =
      body;

    // CRITICAL: Validate all required parameters
    if (!chainId || !fromToken || !toToken || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters. All swap parameters and wallet address are required.' },
        { status: 400 }
      );
    }

    // CRITICAL: Validate user wallet address (must be from connected wallet)
    if (!isValidAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please check your wallet connection.' },
        { status: 400 }
      );
    }

    // Validate not a placeholder or example address
    if (!isRealAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Cannot use placeholder or example addresses. This transaction must use your connected wallet.' },
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
    const txData = (swapData.tx || (swapData as unknown as Record<string, unknown>).transaction || {}) as Record<string, unknown>;

    // Transform to our transaction format
    const transaction = {
      to: txData.to as string,
      data: txData.data as string,
      value: (txData.value as string) || '0',
      gasLimit: (txData.gas as string) || (txData.gasLimit as string),
    };

    // Extract token data with flexible field names
    const swapDataRecord = swapData as unknown as Record<string, unknown>;
    const fromTokenData = (swapDataRecord.fromToken || swapDataRecord.fromTokenInfo || {}) as Record<string, unknown>;
    const toTokenData = (swapDataRecord.toToken || swapDataRecord.toTokenInfo || {}) as Record<string, unknown>;

    const fromDecimals = parseInt((fromTokenData.decimal as string) || '18');
    const toDecimals = parseInt((toTokenData.decimal as string) || '18');
    const toAmount = (swapDataRecord.toTokenAmount || swapDataRecord.toAmount || '0') as string;

    // Calculate exchange rate if not provided
    let exchangeRate = (swapDataRecord.exchangeRate || swapDataRecord.price || '0') as string;
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
        symbol: (fromTokenData.tokenSymbol as string) || 'UNKNOWN',
        decimals: fromDecimals,
        name: (fromTokenData.tokenSymbol as string) || 'Unknown Token',
      },
      toToken: {
        address: toToken,
        symbol: (toTokenData.tokenSymbol as string) || 'UNKNOWN',
        decimals: toDecimals,
        name: (toTokenData.tokenSymbol as string) || 'Unknown Token',
      },
      fromAmount: amount,
      toAmount,
      toAmountMin: '0', // Calculate min amount based on slippage
      exchangeRate,
      priceImpact: (swapDataRecord.priceImpactPercentage as string) || '0',
      estimatedGas: (swapDataRecord.estimateGasFee as string) || '0',
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
