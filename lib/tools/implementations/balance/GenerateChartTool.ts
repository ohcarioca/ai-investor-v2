/**
 * Generate Chart Tool
 * Creates visual charts for portfolio performance
 */

import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ChartResult,
  ChartConfig,
} from '../../base/types';

type ChartType = 'portfolio' | 'growth' | 'profit';
type ChartPeriod = '7d' | '1m' | '3m' | '6m' | '1y';

export class GenerateChartTool extends BaseTool {
  readonly name = 'generate_chart';
  readonly description = 'Gera um gráfico visual dos dados de investimento. Use quando o usuário pedir: "mostre um gráfico", "crie um gráfico", "quero ver graficamente", "visualizar", "mostrar performance", etc. Tipos disponíveis: portfolio (desempenho geral), growth (crescimento comparativo), profit (lucro ao longo do tempo).';
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
            description: 'Endereço da carteira conectada (formato 0x...)',
          },
          chart_type: {
            type: 'string',
            description: 'Tipo de gráfico: "portfolio" (desempenho do portfólio), "growth" (crescimento investido vs valor atual), "profit" (lucro ao longo do tempo)',
            enum: ['portfolio', 'growth', 'profit'],
            default: 'portfolio',
          },
          period: {
            type: 'string',
            description: 'Período de tempo: "7d" (7 dias), "1m" (1 mês), "3m" (3 meses), "6m" (6 meses), "1y" (1 ano)',
            enum: ['7d', '1m', '3m', '6m', '1y'],
            default: '1m',
          },
        },
        required: ['wallet_address'],
      },
    };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<{ chartConfig: ChartConfig }>> {
    // Always use connected wallet address
    const addressToUse = context.walletAddress!;
    const chartType = (params.chart_type as ChartType) || 'portfolio';
    const period = (params.period as ChartPeriod) || '1m';

    this.log(`Generating chart for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`, {
      chartType,
      period,
    });

    try {
      const url = `${this.getBaseUrl()}/api/charts/historical?wallet_address=${addressToUse}&type=${chartType}&period=${period}`;
      const response = await fetch(url);

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to generate chart',
        };
      }

      const data = await response.json();

      this.log('Chart generated successfully', {
        dataPoints: data.chartConfig?.data?.length || 0,
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
