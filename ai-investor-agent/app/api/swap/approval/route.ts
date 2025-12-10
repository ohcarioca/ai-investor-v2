import { NextRequest, NextResponse } from 'next/server';
import {
  getOKXClient,
  CHAIN_INDEX_MAP,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/okx-server';
import { createPublicClient, http, erc20Abi, getAddress } from 'viem';
import { avalanche } from 'viem/chains';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, tokenAddress, amount, userAddress } = body;

    // CRITICAL: Validate all required parameters
    if (!chainId || !tokenAddress || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters. All approval parameters and wallet address are required.' },
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
        { error: 'Cannot use placeholder or example addresses. Token approval must use your connected wallet.' },
        { status: 400 }
      );
    }

    // Native tokens don't need approval
    if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
      return NextResponse.json({
        status: {
          isApproved: true,
          currentAllowance: '0',
          requiredAllowance: '0',
          spenderAddress: '0x0000000000000000000000000000000000000000',
        },
      });
    }

    // Get OKX router address (spender)
    // OKX DEX Aggregator router address for Avalanche C-Chain
    // This is the standard OKX router that handles token approvals
    const OKX_ROUTER_AVALANCHE = getAddress('0x4a1a4e0a296e391ab60f49e35ee8bc3c16fe67b1');

    const client = getOKXClient();
    const chainIndex = CHAIN_INDEX_MAP[parseInt(chainId)];

    let spenderAddress = OKX_ROUTER_AVALANCHE;

    // Try to get the actual router address from a quote
    try {
      const dummyQuote = await client.dex.getQuote({
        chainId: chainIndex,
        fromTokenAddress: tokenAddress,
        toTokenAddress: NATIVE_TOKEN_ADDRESS,
        amount: '1000000',
        slippage: '0.5',
      });

      console.log('Dummy quote for approval:', JSON.stringify(dummyQuote, null, 2));

      // Extract router address from different possible response formats
      const quoteData = dummyQuote.data;
      if (quoteData && Array.isArray(quoteData) && quoteData.length > 0) {
        const routeInfo = quoteData[0] as unknown as Record<string, unknown>;
        const dataRouter = (routeInfo?.routerAddress as string | undefined) || (routeInfo?.to as string | undefined);
        if (dataRouter) {
          spenderAddress = dataRouter as `0x${string}`;
        }
      }
    } catch (error) {
      console.warn('Could not fetch router from quote, using default:', error);
      // Will use the default OKX_ROUTER_AVALANCHE
    }

    console.log('Using router/spender address:', spenderAddress);

    // Check current allowance using viem
    const publicClient = createPublicClient({
      chain: avalanche,
      transport: http(),
    });

    const currentAllowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [userAddress as `0x${string}`, spenderAddress as `0x${string}`],
    });

    const currentAllowanceString = currentAllowance.toString();
    const isApproved = BigInt(currentAllowanceString) >= BigInt(amount);

    if (isApproved) {
      return NextResponse.json({
        status: {
          isApproved: true,
          currentAllowance: currentAllowanceString,
          requiredAllowance: amount,
          spenderAddress,
        },
      });
    }

    // Build approval transaction
    // ERC20 approve function signature: approve(address spender, uint256 amount)
    // Function selector: 0x095ea7b3
    const spenderPadded = spenderAddress.slice(2).padStart(64, '0');
    const amountHex = BigInt(amount).toString(16).padStart(64, '0');
    const approveData = `0x095ea7b3${spenderPadded}${amountHex}`;

    return NextResponse.json({
      status: {
        isApproved: false,
        currentAllowance: currentAllowanceString,
        requiredAllowance: amount,
        spenderAddress,
      },
      transaction: {
        to: tokenAddress,
        data: approveData,
        value: '0',
      },
    });
  } catch (error) {
    console.error('Approval check error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check approval',
      },
      { status: 500 }
    );
  }
}
