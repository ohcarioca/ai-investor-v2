import { NextRequest, NextResponse } from 'next/server';
import { getSwapDataDirect, CHAIN_INDEX_MAP } from '@/lib/okx-server';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';
import { createPublicClient, http, erc20Abi, getAddress, Chain } from 'viem';
import { avalanche, mainnet } from 'viem/chains';

// Chain configurations
const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  43114: avalanche,
};

// Native token address
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export async function POST(request: NextRequest) {
  try {
    // Check for skipAllowanceCheck query param (used when approval is pending)
    const { searchParams } = new URL(request.url);
    const skipAllowanceCheck = searchParams.get('skipAllowanceCheck') === 'true';

    const body = await request.json();
    const { chainId, fromToken, toToken, amount, slippage, userAddress } = body;

    // CRITICAL: Validate all required parameters
    if (!chainId || !fromToken || !toToken || !amount || !userAddress) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters. All swap parameters and wallet address are required.',
        },
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
        {
          error:
            'Cannot use placeholder or example addresses. This transaction must use your connected wallet.',
        },
        { status: 400 }
      );
    }

    const chainIdNum = parseInt(chainId);
    const chainIndex = CHAIN_INDEX_MAP[chainIdNum];
    if (!chainIndex) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    // Get viem chain for RPC calls
    const viemChain = VIEM_CHAINS[chainIdNum];
    if (!viemChain) {
      return NextResponse.json({ error: `Unsupported chain for RPC: ${chainId}` }, { status: 400 });
    }

    // OKX REST API expects slippage as decimal string (e.g., "0.01" for 1%, "0.1" for 10%)
    // The slippage coming from chat/route.ts is already in decimal format (0.1 for 10%)
    // Just ensure it's a valid decimal
    const slippageValue = parseFloat(slippage || '0.01');
    // If value > 1, assume it's percentage and convert to decimal
    const effectiveSlippage =
      slippageValue > 1 ? (slippageValue / 100).toString() : slippage || '0.01';

    console.log('[Swap Build] Slippage conversion:', {
      input: slippage,
      parsed: slippageValue,
      isPercentage: slippageValue > 1,
      effective: effectiveSlippage,
    });

    console.log('[Swap Build] Building swap with params:', {
      chainId: chainIdNum,
      chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      amountType: typeof amount,
      slippage: effectiveSlippage,
      userWalletAddress: userAddress,
    });

    // Check if fromToken is not native, verify balance
    if (fromToken.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase()) {
      const publicClient = createPublicClient({
        chain: viemChain,
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
          chain: chainIdNum,
          token: fromToken,
          balance: balance.toString(),
          required: amount,
          sufficient: BigInt(balance) >= BigInt(amount),
        });

        if (BigInt(balance) < BigInt(amount)) {
          return NextResponse.json(
            {
              error: `Insufficient token balance. You have ${balance.toString()} but need ${amount}`,
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.warn('[Swap Build] Could not verify balance:', error);
        // Continue anyway - let the transaction fail if balance is insufficient
      }
    }

    // Use direct REST API call (same as OKX Web) instead of SDK
    // The SDK uses smartSwapByOrderId which doesn't work well with some tokens
    const swapResult = await getSwapDataDirect({
      chainId: chainIndex,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: effectiveSlippage,
      userWalletAddress: userAddress,
    });

    console.log('[Swap Build] ===== OKX DIRECT API RESULT START =====');
    console.log('[Swap Build] Full response:', JSON.stringify(swapResult, null, 2));
    console.log('[Swap Build] Response code:', swapResult?.code);
    console.log('[Swap Build] Response msg:', swapResult?.msg);
    console.log('[Swap Build] ===== OKX DIRECT API RESULT END =====');

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
      return NextResponse.json({ error: 'No swap data available' }, { status: 404 });
    }

    console.log('[Swap Build] Swap Data:', JSON.stringify(swapData, null, 2));

    // Extract transaction data with flexible field access
    const txData = (swapData.tx ||
      (swapData as unknown as Record<string, unknown>).transaction ||
      {}) as Record<string, unknown>;

    console.log('[Swap Build] ===== TRANSACTION DETAILS =====');
    console.log('[Swap Build] Target contract (to):', txData.to);
    console.log('[Swap Build] Value (ETH/AVAX):', txData.value);
    console.log('[Swap Build] Gas estimate:', txData.gas || txData.gasLimit);
    console.log('[Swap Build] Data length:', (txData.data as string)?.length || 0, 'chars');
    console.log('[Swap Build] First 200 chars of data:', (txData.data as string)?.substring(0, 200));
    console.log('[Swap Build] ===== TRANSACTION DETAILS END =====');

    // CRITICAL: Verify allowance against the ACTUAL router that will be used
    // This is the most accurate check because we use the router from the swap transaction
    // Skip this check if approval is pending (skipAllowanceCheck=true)
    if (
      !skipAllowanceCheck &&
      fromToken.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase() &&
      txData.to
    ) {
      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(),
      });

      try {
        const actualRouter = getAddress(txData.to as string);
        const allowance = await publicClient.readContract({
          address: fromToken as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, actualRouter],
        });

        console.log('[Swap Build] ===== ALLOWANCE CHECK =====');
        console.log('[Swap Build] Chain:', chainIdNum);
        console.log('[Swap Build] Token:', fromToken);
        console.log('[Swap Build] Router (from tx.to):', actualRouter);
        console.log('[Swap Build] Current allowance:', allowance.toString());
        console.log('[Swap Build] Required amount:', amount);
        console.log('[Swap Build] Allowance sufficient:', BigInt(allowance) >= BigInt(amount));
        console.log('[Swap Build] ===== ALLOWANCE CHECK END =====');

        if (BigInt(allowance) < BigInt(amount)) {
          console.log('[Swap Build] Allowance insufficient - building approval transaction');

          // Build approval transaction with MAX_UINT256 (unlimited approval)
          const MAX_UINT256 =
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
          const routerPadded = actualRouter.slice(2).toLowerCase().padStart(64, '0');
          const approveData = `0x095ea7b3${routerPadded}${MAX_UINT256}`;

          // Continue building the swap transaction but include approval info
          // The frontend will execute approval first, then swap
          const transaction = {
            to: txData.to as string,
            data: txData.data as string,
            value: (txData.value as string) || '0',
            gasLimit: (txData.gas as string) || (txData.gasLimit as string),
          };

          // Extract token data
          const swapDataRecord = swapData as unknown as Record<string, unknown>;
          const fromTokenData = (swapDataRecord.fromToken ||
            swapDataRecord.fromTokenInfo ||
            {}) as Record<string, unknown>;
          const toTokenData = (swapDataRecord.toToken ||
            swapDataRecord.toTokenInfo ||
            {}) as Record<string, unknown>;
          const fromDecimals = parseInt((fromTokenData.decimal as string) || '18');
          const toDecimals = parseInt((toTokenData.decimal as string) || '18');
          const toAmount = (swapDataRecord.toTokenAmount ||
            swapDataRecord.toAmount ||
            '0') as string;

          let exchangeRate = (swapDataRecord.exchangeRate ||
            swapDataRecord.price ||
            '0') as string;
          if (exchangeRate === '0' && parseFloat(amount) > 0 && parseFloat(toAmount) > 0) {
            const fromAmountFloat = parseFloat(amount) / Math.pow(10, fromDecimals);
            const toAmountFloat = parseFloat(toAmount) / Math.pow(10, toDecimals);
            exchangeRate = (toAmountFloat / fromAmountFloat).toString();
          }

          const quote = {
            fromToken: {
              address: fromToken,
              symbol: (fromTokenData.tokenSymbol as string) || 'UNKNOWN',
              decimals: fromDecimals,
            },
            toToken: {
              address: toToken,
              symbol: (toTokenData.tokenSymbol as string) || 'UNKNOWN',
              decimals: toDecimals,
            },
            fromAmount: amount,
            toAmount,
            exchangeRate,
            priceImpact: (swapDataRecord.priceImpactPercentage as string) || '0',
            estimatedGas: (swapDataRecord.estimateGasFee as string) || '0',
          };

          return NextResponse.json({
            transaction,
            quote,
            needsApproval: true,
            approvalTransaction: {
              to: fromToken,
              data: approveData,
              value: '0',
            },
            approvalDetails: {
              currentAllowance: allowance.toString(),
              requiredAmount: amount,
              router: actualRouter,
            },
          });
        }
      } catch (error) {
        console.warn('[Swap Build] Could not verify allowance:', error);
        // Continue anyway - approval route should have handled this
      }
    } else if (skipAllowanceCheck) {
      console.log('[Swap Build] Skipping allowance check - approval is pending');
    }

    // Transform to our transaction format
    const transaction = {
      to: txData.to as string,
      data: txData.data as string,
      value: (txData.value as string) || '0',
      gasLimit: (txData.gas as string) || (txData.gasLimit as string),
    };

    // Extract token data with flexible field names
    const swapDataRecord = swapData as unknown as Record<string, unknown>;
    const fromTokenData = (swapDataRecord.fromToken ||
      swapDataRecord.fromTokenInfo ||
      {}) as Record<string, unknown>;
    const toTokenData = (swapDataRecord.toToken ||
      swapDataRecord.toTokenInfo ||
      {}) as Record<string, unknown>;

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
        error: error instanceof Error ? error.message : 'Failed to build swap transaction',
      },
      { status: 500 }
    );
  }
}
