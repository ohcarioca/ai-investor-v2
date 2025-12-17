import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi, getAddress } from 'viem';
import {
  VIEM_CHAINS,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/constants/blockchain';
import { validateApprovalRequest } from '@/lib/middleware/wallet-validation';
import { getErrorMessage } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, tokenAddress, amount, userAddress } = body;

    // Validate request using centralized middleware
    const validation = validateApprovalRequest({ userAddress, chainId, tokenAddress, amount });
    if (!validation.valid && validation.response) {
      return validation.response;
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

    // Get chain configuration (already validated by middleware)
    const chainIdNum = parseInt(chainId);
    const chain = VIEM_CHAINS[chainIdNum];

    // FIXED: Always use our fixed router address for all chains
    const FIXED_ROUTER = '0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f';
    const spenderAddress = getAddress(FIXED_ROUTER);
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
      { error: getErrorMessage(error, 'Failed to check approval') },
      { status: 500 }
    );
  }
}
