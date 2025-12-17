import { NextRequest, NextResponse } from 'next/server';
import { getSwapDataDirect } from '@/lib/okx-server';
import { createPublicClient, http, erc20Abi, getAddress } from 'viem';
import {
  VIEM_CHAINS,
  CHAIN_INDEX_MAP,
  isNativeToken,
} from '@/lib/constants/blockchain';
import { validateSwapRequest } from '@/lib/middleware/wallet-validation';
import { extractSwapTokenData } from '@/lib/utils/token-utils';
import { getErrorMessage } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Check for skipAllowanceCheck query param (used when approval is pending)
    const { searchParams } = new URL(request.url);
    const skipAllowanceCheck = searchParams.get('skipAllowanceCheck') === 'true';

    const body = await request.json();
    const { chainId, fromToken, toToken, amount, slippage, userAddress } = body;

    // Validate request using centralized middleware
    const validation = validateSwapRequest({ userAddress, chainId, fromToken, toToken, amount });
    if (!validation.valid && validation.response) {
      return validation.response;
    }

    const chainIdNum = parseInt(chainId);
    const chainIndex = CHAIN_INDEX_MAP[chainIdNum];
    const viemChain = VIEM_CHAINS[chainIdNum];

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
    if (!isNativeToken(fromToken)) {
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

    // Debug: Log all keys in swapData to find transaction field
    const swapDataKeys = Object.keys(swapData as object);
    console.log('[Swap Build] SwapData keys:', swapDataKeys);

    // Extract transaction data with flexible field access
    // OKX v6 API may use different field names
    const swapDataObj = swapData as unknown as Record<string, unknown>;
    const txData = (swapDataObj.tx ||
      swapDataObj.transaction ||
      swapDataObj.txData ||
      swapDataObj.routerResult ||
      {}) as Record<string, unknown>;

    console.log('[Swap Build] txData extracted:', {
      hasTx: !!swapDataObj.tx,
      hasTransaction: !!swapDataObj.transaction,
      hasTxData: !!swapDataObj.txData,
      hasRouterResult: !!swapDataObj.routerResult,
      txDataKeys: Object.keys(txData),
    });

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
    if (!skipAllowanceCheck && !isNativeToken(fromToken) && txData.to) {
      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(),
      });

      try {
        // FIXED: Always use our spender address for approval
        const actualRouter = getAddress('0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f');
        console.log('[Swap Build] FIXED_ROUTER:', actualRouter);
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

          // Build approval transaction with exact amount + 20% margin
          // More secure than unlimited approval (doesn't expose entire balance)
          const APPROVAL_MARGIN_PERCENT = 20;
          const requiredAmount = BigInt(amount);
          const approvalAmount = requiredAmount + (requiredAmount * BigInt(APPROVAL_MARGIN_PERCENT) / BigInt(100));
          const approvalAmountHex = approvalAmount.toString(16).padStart(64, '0');
          const routerPadded = actualRouter.slice(2).toLowerCase().padStart(64, '0');
          const approveData = `0x095ea7b3${routerPadded}${approvalAmountHex}`;

          // Continue building the swap transaction but include approval info
          // The frontend will execute approval first, then swap
          const transaction = {
            to: txData.to as string,
            data: txData.data as string,
            value: (txData.value as string) || '0',
            gasLimit: (txData.gas as string) || (txData.gasLimit as string),
          };

          // Extract token data using centralized utility
          const tokenData = extractSwapTokenData(swapData, amount);

          const quote = {
            fromToken: {
              address: fromToken,
              symbol: tokenData.fromSymbol,
              decimals: tokenData.fromDecimals,
            },
            toToken: {
              address: toToken,
              symbol: tokenData.toSymbol,
              decimals: tokenData.toDecimals,
            },
            fromAmount: amount,
            toAmount: tokenData.toAmount,
            exchangeRate: tokenData.exchangeRate,
            priceImpact: tokenData.priceImpact,
            estimatedGas: tokenData.estimatedGas,
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

    // Extract token data using centralized utility
    const tokenData = extractSwapTokenData(swapData, amount);

    // Also return quote for display
    const quote = {
      fromToken: {
        address: fromToken,
        symbol: tokenData.fromSymbol,
        decimals: tokenData.fromDecimals,
        name: tokenData.fromSymbol || 'Unknown Token',
      },
      toToken: {
        address: toToken,
        symbol: tokenData.toSymbol,
        decimals: tokenData.toDecimals,
        name: tokenData.toSymbol || 'Unknown Token',
      },
      fromAmount: amount,
      toAmount: tokenData.toAmount,
      toAmountMin: '0', // Calculate min amount based on slippage
      exchangeRate: tokenData.exchangeRate,
      priceImpact: tokenData.priceImpact,
      estimatedGas: tokenData.estimatedGas,
      route: [],
    };

    return NextResponse.json({
      transaction,
      quote,
    });
  } catch (error) {
    console.error('Build swap error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to build swap transaction') },
      { status: 500 }
    );
  }
}
