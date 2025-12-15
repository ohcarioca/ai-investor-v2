import { NextRequest, NextResponse } from 'next/server';
import { isValidAddress, isRealAddress } from '@/lib/wallet-validation';
import { fetchWalletBalance } from '@/lib/services/balance';

export async function POST(req: NextRequest) {
  try {
    const { address, chainId } = await req.json();

    // Log received parameters for debugging
    console.log('[Balance API] Request received:', {
      address: address?.slice(0, 10) + '...',
      chainId,
      chainIdType: typeof chainId,
    });

    // CRITICAL: Validate wallet address (must be from connected wallet)
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required. Please connect your wallet.' },
        { status: 400 }
      );
    }

    // Validate address format using wallet validation utility
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Please check your wallet connection.' },
        { status: 400 }
      );
    }

    // Validate not a placeholder or example address
    if (!isRealAddress(address)) {
      return NextResponse.json(
        { error: 'Cannot use placeholder or example addresses. Please connect your real wallet.' },
        { status: 400 }
      );
    }

    // Use the shared balance service
    const balanceData = await fetchWalletBalance({
      address,
      chainId: chainId || 1,
    });

    console.log('[Balance API] Response:', {
      chainId: balanceData.chainId,
      chainName: balanceData.chainName,
      nativeSymbol: balanceData.native.symbol,
    });

    return NextResponse.json(balanceData);
  } catch (error) {
    console.error('[Balance API] Error fetching wallet balance:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet balance' }, { status: 500 });
  }
}
