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

    console.log('[Swap Build] Building swap with params:', {
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      amountType: typeof amount,
      slippage: slippage || '0.5',
      userWalletAddress: userAddress,
    });

    // Check if fromToken is not native, verify balance and allowance
    const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const OKX_ROUTER = '0x2E84246828ddae1850Bc0CF23d8d8a8d1Aa5f1f'; // OKX DEX Router on Avalanche

    if (fromToken.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase()) {
      const { createPublicClient, http, erc20Abi } = await import('viem');
      const { avalanche } = await import('viem/chains');

      const publicClient = createPublicClient({
        chain: avalanche,
        transport: http(),
      });

      try {
        // Check balance
        const balance = await publicClient.readContract({
          address: fromToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        });

        console.log('[Swap Build] Token balance check:', {
          token: fromToken,
          balance: balance.toString(),
          required: amount,
          sufficient: BigInt(balance) >= BigInt(amount),
        });

        if (BigInt(balance) < BigInt(amount)) {
          return NextResponse.json(
            { error: `Insufficient token balance. You have ${balance.toString()} but need ${amount}` },
            { status: 400 }
          );
        }

        // Check allowance for OKX router
        const allowance = await publicClient.readContract({
          address: fromToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, OKX_ROUTER as `0x${string}`],
        });

        console.log('[Swap Build] Token allowance check:', {
          token: fromToken,
          spender: OKX_ROUTER,
          allowance: allowance.toString(),
          required: amount,
          sufficient: BigInt(allowance) >= BigInt(amount),
        });

        if (BigInt(allowance) < BigInt(amount)) {
          console.warn('[Swap Build] WARNING: Insufficient allowance! This may cause transaction to fail.');
          console.warn('[Swap Build] User should approve token spending first.');
        }
      } catch (error) {
        console.warn('[Swap Build] Could not verify balance/allowance:', error);
        // Continue anyway - let the transaction fail if balance is insufficient
      }
    }

    const swapResult = await client.dex.getSwapData({
      chainId: chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage || '0.5',
      userWalletAddress: userAddress,
    });

    console.log('[Swap Build] ===== OKX SWAP RESULT START =====');
    console.log('[Swap Build] Full response:', JSON.stringify(swapResult, null, 2));
    console.log('[Swap Build] Response code:', swapResult?.code);
    console.log('[Swap Build] Response msg:', swapResult?.msg);
    console.log('[Swap Build] ===== OKX SWAP RESULT END =====');

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

    console.log('[Swap Build] Swap Data:', JSON.stringify(swapData, null, 2));

    // Extract transaction data with flexible field access
    const txData = (swapData.tx || (swapData as unknown as Record<string, unknown>).transaction || {}) as Record<string, unknown>;

    console.log('[Swap Build] ===== TRANSACTION DETAILS =====');
    console.log('[Swap Build] Target contract (to):', txData.to);
    console.log('[Swap Build] Value (ETH/AVAX):', txData.value);
    console.log('[Swap Build] Gas estimate:', txData.gas || txData.gasLimit);
    console.log('[Swap Build] Data length:', (txData.data as string)?.length || 0, 'chars');
    console.log('[Swap Build] First 200 chars of data:', (txData.data as string)?.substring(0, 200));
    console.log('[Swap Build] ===== TRANSACTION DETAILS END =====');

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
