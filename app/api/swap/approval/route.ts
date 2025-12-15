import { NextRequest, NextResponse } from 'next/server';
import { NATIVE_TOKEN_ADDRESS } from '@/lib/okx-server';
import { createPublicClient, http, erc20Abi, getAddress, Chain } from 'viem';
import { avalanche, mainnet } from 'viem/chains';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';

// Chain configurations
const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  43114: avalanche,
};

// OKX DEX router addresses per chain
// Note: For Ethereum, we'll extract the router from the swap transaction response
// as OKX may use different routers. Using a known aggregator router as fallback.
const OKX_ROUTERS: Record<number, string> = {
  1: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch v5 router (common aggregator)
  43114: '0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f', // OKX DEX router on Avalanche
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, tokenAddress, amount, userAddress } = body;

    // CRITICAL: Validate all required parameters
    if (!chainId || !tokenAddress || !amount || !userAddress) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters. All approval parameters and wallet address are required.',
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
            'Cannot use placeholder or example addresses. Token approval must use your connected wallet.',
        },
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

    // Get chain configuration
    const chainIdNum = parseInt(chainId);
    const chain = VIEM_CHAINS[chainIdNum];
    if (!chain) {
      return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    // Get router address for the chain
    const routerAddress = OKX_ROUTERS[chainIdNum];
    if (!routerAddress) {
      return NextResponse.json(
        { error: `No router configured for chain: ${chainId}` },
        { status: 400 }
      );
    }

    const spenderAddress = getAddress(routerAddress);
    console.log(`[Approval] Using router for chain ${chainIdNum}:`, spenderAddress);

    // Check current allowance using viem
    const publicClient = createPublicClient({
      chain,
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

    console.log('[Approval] Allowance check result:', {
      chain: chainIdNum,
      token: tokenAddress,
      spender: spenderAddress,
      currentAllowance: currentAllowanceString,
      requiredAllowance: amount,
      isApproved,
    });

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

    // Build approval transaction with MAX_UINT256 (unlimited approval)
    // This avoids needing to re-approve for each swap
    // ERC20 approve function signature: approve(address spender, uint256 amount)
    // Function selector: 0x095ea7b3
    const MAX_UINT256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const spenderPadded = spenderAddress.slice(2).padStart(64, '0');
    const approveData = `0x095ea7b3${spenderPadded}${MAX_UINT256}`;

    console.log('[Approval] Building unlimited approval transaction for:', {
      chain: chainIdNum,
      token: tokenAddress,
      spender: spenderAddress,
      currentAllowance: currentAllowanceString,
      requiredAllowance: amount,
    });

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
        error: error instanceof Error ? error.message : 'Failed to check approval',
      },
      { status: 500 }
    );
  }
}
