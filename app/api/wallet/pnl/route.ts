import { NextRequest, NextResponse } from 'next/server';
import { pnlService } from '@/lib/services/pnl';
import { isAddress } from 'viem';

/**
 * GET /api/wallet/pnl
 *
 * Calculates PNL metrics for SIERRA investments
 * Returns cached data if available (5 min TTL)
 *
 * Query Parameters:
 * - address: Wallet address (required)
 * - chainId: Chain ID, 1 or 43114 (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chainIdStr = searchParams.get('chainId');

    // Validate address
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address is required' },
        { status: 400 }
      );
    }

    // Validate chain ID
    const chainId = chainIdStr ? parseInt(chainIdStr) : 1;
    if (![1, 43114].includes(chainId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chain ID. Supported: 1 (Ethereum), 43114 (Avalanche)' },
        { status: 400 }
      );
    }

    console.log('[PNL API] Calculating PNL:', {
      address: `${address.slice(0, 6)}...${address.slice(-4)}`,
      chainId,
    });

    // Calculate PNL
    const pnlResult = await pnlService.calculatePNL({
      walletAddress: address,
      chainId,
    });

    console.log('[PNL API] PNL calculated:', {
      totalPnlUsdc: pnlResult.totalPnlUsdc.toFixed(2),
      totalPnlPercent: pnlResult.totalPnlPercent.toFixed(2),
      investmentCount: pnlResult.investments.length,
      withdrawalCount: pnlResult.withdrawals.length,
    });

    return NextResponse.json({ success: true, data: pnlResult });
  } catch (error) {
    console.error('[PNL API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate PNL',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet/pnl
 *
 * Invalidates cached PNL data for a wallet
 * Call this after transactions complete to force recalculation
 *
 * Body:
 * - address: Wallet address (required)
 * - chainId: Chain ID (optional, invalidates all chains if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainId } = body;

    // Validate address
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address is required' },
        { status: 400 }
      );
    }

    // Validate chain ID if provided
    if (chainId !== undefined && ![1, 43114].includes(chainId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chain ID. Supported: 1 (Ethereum), 43114 (Avalanche)' },
        { status: 400 }
      );
    }

    console.log('[PNL API] Invalidating cache:', {
      address: `${address.slice(0, 6)}...${address.slice(-4)}`,
      chainId: chainId || 'all',
    });

    // Invalidate cache
    pnlService.invalidateCache(address, chainId);

    return NextResponse.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    console.error('[PNL API] Error invalidating cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invalidate cache',
      },
      { status: 500 }
    );
  }
}
