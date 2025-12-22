/**
 * Generate Chart Tool
 *
 * Creates dynamic visual charts with real on-chain data from the connected wallet.
 * Supports multiple chart types for different visualization needs.
 */

import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ChartConfig,
  DynamicChartType,
} from '../../base/types';

type ChartPeriod = '7d' | '1m' | '3m' | '6m' | '1y';

export class GenerateChartTool extends BaseTool {
  readonly name = 'generate_chart';

  readonly description = `Generates dynamic visual charts with REAL on-chain data from the connected wallet.

AVAILABLE CHART TYPES:
- portfolio_value: Portfolio value over time (area chart) - Shows total portfolio performance
- token_distribution: Token allocation (donut chart) - Shows current holdings distribution
- transaction_volume: Transaction activity (bar chart) - Shows transaction frequency over time
- balance_history: Token balance history (line chart) - Tracks specific token balance over time
- profit_loss: Profit & loss analysis (area chart) - Shows investment returns
- apy_performance: APY/yield tracking (area chart) - Shows yield accumulation over time
- token_comparison: Compare token performances (multi-line chart) - Compares multiple tokens
- future_projection: Future earnings projection (area chart) - Shows projected gains based on APY, supports additional investment simulation

WHEN TO USE:
- User asks to "show", "display", "visualize", or "graph" any financial data
- User wants to "see" their portfolio, transactions, or balances
- User asks "what does my portfolio look like" or similar questions
- User requests analysis that benefits from visual representation
- User asks about distribution, performance, history, or trends
- User asks "how much will I earn", "future gains", "if I invest more", "projection", "simulate investment"

ALWAYS select the most appropriate chart_type based on user intent.
Charts display REAL data from the connected wallet.`;

  readonly category = 'chart' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          wallet_address: {
            type: 'string',
            description: 'Connected wallet address (0x format)',
          },
          chart_type: {
            type: 'string',
            description: `Type of chart to generate based on user request:
- portfolio_value: Total portfolio value over time
- token_distribution: Current token allocation (pie/donut)
- transaction_volume: Transaction activity frequency
- balance_history: Specific token balance history
- profit_loss: Investment profit/loss analysis
- apy_performance: Yield/APY performance tracking
- token_comparison: Compare multiple token performances
- future_projection: Future earnings projection with optional additional investment`,
            enum: [
              'portfolio_value',
              'token_distribution',
              'transaction_volume',
              'balance_history',
              'profit_loss',
              'apy_performance',
              'token_comparison',
              'future_projection',
            ],
          },
          period: {
            type: 'string',
            description:
              'Time period for historical data: "7d" (7 days), "1m" (1 month), "3m" (3 months), "6m" (6 months), "1y" (1 year)',
            enum: ['7d', '1m', '3m', '6m', '1y'],
            default: '1m',
          },
          tokens: {
            type: 'string',
            description:
              'Comma-separated token symbols for filtering (e.g., "USDC,SIERRA"). Used for balance_history and token_comparison.',
          },
          additional_investment: {
            type: 'number',
            description:
              'Additional investment amount in USD for future_projection chart. Use when user asks "if I invest X more" or "what if I add X".',
          },
        },
        required: ['chart_type'],
      },
    };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<{ chartConfig: ChartConfig }>> {
    // Get parameters with defaults
    const addressToUse = context.walletAddress!;
    const chartType = params.chart_type as DynamicChartType;
    const period = (params.period as ChartPeriod) || '1m';
    const tokens = params.tokens as string | undefined;
    const additionalInvestment = params.additional_investment as number | undefined;

    this.log(
      `Generating ${chartType} chart for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`,
      {
        chartType,
        period,
        tokens,
        additionalInvestment,
        chainId: context.chainId,
      }
    );

    try {
      // Build API URL with all parameters
      const url = new URL(`${this.getBaseUrl()}/api/charts/historical`);
      url.searchParams.set('wallet_address', addressToUse);
      url.searchParams.set('type', chartType);
      url.searchParams.set('period', period);
      url.searchParams.set('chain_id', context.chainId.toString());

      if (tokens) {
        url.searchParams.set('tokens', tokens);
      }

      if (additionalInvestment && additionalInvestment > 0) {
        url.searchParams.set('additional_investment', additionalInvestment.toString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || 'Failed to generate chart',
        };
      }

      const data = await response.json();

      if (!data.success || !data.chartConfig) {
        return {
          success: false,
          error: data.error || 'Invalid chart response',
        };
      }

      this.log('Chart generated successfully', {
        title: data.chartConfig.title,
        type: data.chartConfig.type,
        dataPoints: data.chartConfig.data?.length || 0,
      });

      return {
        success: true,
        data: {
          chartConfig: data.chartConfig,
        },
      };
    } catch (error) {
      this.log('Error generating chart', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart',
      };
    }
  }
}
