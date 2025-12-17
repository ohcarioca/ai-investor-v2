import { NextRequest, NextResponse } from 'next/server';
import { getTransactionHistoryService } from '@/lib/services/history/TransactionHistoryService';
import { isAddress } from 'viem';

/**
 * POST /api/wallet/history
 *
 * Fetches transaction history for USDC and SIERRA tokens.
 *
 * Body parameters:
 * - address: string (required) - Wallet address
 * - chainId: number (required) - Chain ID (1 for Ethereum, 43114 for Avalanche)
 * - tokens: string[] (optional) - Token symbols to filter ['USDC', 'SIERRA']
 * - limit: number (optional) - Max results (default: 50)
 * - offset: number (optional) - Pagination offset (default: 0)
 * - direction: 'in' | 'out' (optional) - Filter by direction
 * - fromBlock: number (optional) - Start block number
 * - toBlock: number (optional) - End block number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      address,
      chainId,
      tokens,
      limit = 50,
      offset = 0,
      direction,
      fromBlock,
      toBlock,
    } = body;

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (!chainId || ![1, 43114].includes(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chain ID. Supported: 1 (Ethereum), 43114 (Avalanche)' },
        { status: 400 }
      );
    }

    // Validate optional parameters
    if (tokens && !Array.isArray(tokens)) {
      return NextResponse.json(
        { error: 'tokens must be an array' },
        { status: 400 }
      );
    }

    if (tokens) {
      const validTokens = ['USDC', 'SIERRA'];
      const invalidTokens = tokens.filter((t: string) => !validTokens.includes(t));
      if (invalidTokens.length > 0) {
        return NextResponse.json(
          { error: `Invalid tokens: ${invalidTokens.join(', ')}. Supported: ${validTokens.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (direction && !['in', 'out'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction must be "in" or "out"' },
        { status: 400 }
      );
    }

    // Get RPC URL from environment based on chain
    const rpcUrl = chainId === 1
      ? process.env.QUICKNODE_ETH_RPC_URL
      : process.env.QUICKNODE_AVAX_RPC_URL;

    console.log('[Wallet History] Fetching transaction history:', {
      address,
      chainId,
      tokens: tokens || ['USDC', 'SIERRA'],
      limit,
      offset,
      direction,
      hasRpcUrl: !!rpcUrl,
    });

    // Create service and fetch history
    const historyService = getTransactionHistoryService(chainId, rpcUrl);

    const result = await historyService.getTransactionHistory({
      address,
      chainId,
      tokens: tokens || ['USDC', 'SIERRA'],
      limit,
      offset,
      direction,
      fromBlock,
      toBlock,
    });

    console.log('[Wallet History] Found transactions:', {
      total: result.total,
      returned: result.transactions.length,
      hasMore: result.hasMore,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Wallet History] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch transaction history',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/history/summary
 *
 * Get transaction summary statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chainIdStr = searchParams.get('chainId');
    const tokensStr = searchParams.get('tokens');

    // Validate
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Valid wallet address is required' },
        { status: 400 }
      );
    }

    const chainId = chainIdStr ? parseInt(chainIdStr) : 1;
    if (![1, 43114].includes(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chain ID' },
        { status: 400 }
      );
    }

    const tokens = tokensStr
      ? (tokensStr.split(',') as ('USDC' | 'SIERRA')[])
      : ['USDC', 'SIERRA'] as ('USDC' | 'SIERRA')[];

    // Get RPC URL
    const rpcUrl = chainId === 1
      ? process.env.QUICKNODE_ETH_RPC_URL
      : process.env.QUICKNODE_AVAX_RPC_URL;

    const historyService = getTransactionHistoryService(chainId, rpcUrl);
    const summary = await historyService.getTransactionSummary(address, tokens);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Wallet History] Summary error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch transaction summary' },
      { status: 500 }
    );
  }
}
