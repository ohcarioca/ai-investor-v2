import { NextRequest, NextResponse } from 'next/server';
import {
  getOKXClient,
  CHAIN_INDEX_MAP,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/okx-server';
import { createPublicClient, http, erc20Abi } from 'viem';
import { avalanche } from 'viem/chains';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, tokenAddress, amount, userAddress } = body;

    // Validation
    if (!chainId || !tokenAddress || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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
    const client = getOKXClient();
    const chainIndex = CHAIN_INDEX_MAP[parseInt(chainId)];

    // Fetch a dummy quote to get router address
    const dummyQuote = await client.dex.getQuote({
      chainIndex,
      fromTokenAddress: tokenAddress,
      toTokenAddress: NATIVE_TOKEN_ADDRESS,
      amount: '1000000',
      slippagePercent: '0.5',
    });

    if (!dummyQuote.data || dummyQuote.data.length === 0) {
      return NextResponse.json(
        { error: 'Unable to determine router address' },
        { status: 500 }
      );
    }

    const spenderAddress = dummyQuote.data[0].routerAddress;

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
