import { NextRequest, NextResponse } from 'next/server';
import { ChartDataService } from '@/lib/services/charts/ChartDataService';
import type { DynamicChartType } from '@/lib/tools/base/types';

/**
 * GET /api/charts/historical
 *
 * Generates chart configurations with real on-chain data from the connected wallet.
 *
 * Query Parameters:
 * - wallet_address: Required. The wallet address to fetch data for.
 * - type: Required. The chart type to generate.
 * - period: Optional. Time period (7d, 1m, 3m, 6m, 1y). Default: 1m
 * - chain_id: Optional. Blockchain chain ID. Default: 1 (Ethereum)
 * - tokens: Optional. Comma-separated token symbols for filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract parameters
    const walletAddress = searchParams.get('wallet_address');
    const chartType = searchParams.get('type') as DynamicChartType;
    const period = (searchParams.get('period') || '1m') as '7d' | '1m' | '3m' | '6m' | '1y';
    const chainId = parseInt(searchParams.get('chain_id') || '1', 10);
    const tokensParam = searchParams.get('tokens');
    const tokens = tokensParam ? tokensParam.split(',').map((t) => t.trim()) : undefined;
    const additionalInvestment = parseFloat(searchParams.get('additional_investment') || '0');

    // Validate required parameters
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!chartType) {
      return NextResponse.json(
        { success: false, error: 'Chart type is required' },
        { status: 400 }
      );
    }

    // Validate chart type
    const validChartTypes: DynamicChartType[] = [
      'portfolio_value',
      'token_distribution',
      'transaction_volume',
      'balance_history',
      'profit_loss',
      'apy_performance',
      'token_comparison',
      'future_projection',
    ];

    if (!validChartTypes.includes(chartType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chart type. Valid types: ${validChartTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ['7d', '1m', '3m', '6m', '1y'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid period. Valid periods: ${validPeriods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate chain ID
    const supportedChains = [1, 43114]; // Ethereum and Avalanche
    if (!supportedChains.includes(chainId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported chain ID. Supported chains: ${supportedChains.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log('[Charts API] Generating chart:', {
      chartType,
      walletAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      period,
      chainId,
      tokens,
    });

    // Generate chart using ChartDataService
    const chartService = new ChartDataService();
    const chartConfig = await chartService.generateChart({
      chartType,
      walletAddress,
      chainId,
      period,
      tokens,
      additionalInvestment: additionalInvestment > 0 ? additionalInvestment : undefined,
    });

    console.log('[Charts API] Chart generated successfully:', {
      title: chartConfig.title,
      type: chartConfig.type,
      dataPoints: chartConfig.data.length,
    });

    return NextResponse.json({
      success: true,
      chartConfig,
    });
  } catch (error) {
    console.error('[Charts API] Error generating chart:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart',
      },
      { status: 500 }
    );
  }
}
