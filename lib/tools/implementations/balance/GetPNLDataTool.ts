/**
 * Get PNL Data Tool
 *
 * Calculates profit and loss metrics for SIERRA investments using
 * weighted average price calculation from on-chain transaction history.
 */

import { BaseTool } from '../../base/BaseTool';
import { ToolContext, ToolResult, ToolDefinition } from '../../base/types';
import type { PNLResult } from '@/types/pnl';

export class GetPNLDataTool extends BaseTool {
  readonly name = 'get_pnl_data';
  readonly description = `Calcula o PNL (Profit & Loss / Lucro e Prejuízo) dos investimentos em SIERRA do usuário.

MÉTRICAS RETORNADAS:
- Total PNL (USD): Lucro/prejuízo total em dólares
- Total PNL (%): Retorno percentual total
- Preço médio de entrada: Preço médio ponderado de compra
- Preço atual: Preço atual do SIERRA no mercado (OKX DEX)
- Valor atual: Valor atual do investimento
- PNL não realizado: Ganhos/perdas da posição atual
- PNL realizado: Ganhos/perdas de vendas anteriores
- Yield acumulado: Rendimento estimado do APY
- APY atual: Taxa de rendimento anual
- Projeção anual: Rendimento projetado para 1 ano

QUANDO USAR:
- Usuário pergunta sobre PNL, lucro, prejuízo, retorno
- Usuário quer saber quanto ganhou ou perdeu
- Usuário pergunta sobre rendimento, performance, rentabilidade
- Usuário quer ver análise de investimento completa
- Usuário pergunta "quanto estou ganhando", "qual meu lucro", "meu retorno"
- Usuário pergunta sobre preço médio de compra`;

  readonly category = 'balance' as const;
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
        },
        required: ['wallet_address'],
      },
    };
  }

  protected async executeImpl(
    _params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<PNLResult>> {
    const addressToUse = context.walletAddress!;
    const chainId = context.chainId || 1;

    this.log(`Calculating PNL for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`);

    try {
      // Call API endpoint
      const url = new URL(`${this.getBaseUrl()}/api/wallet/pnl`);
      url.searchParams.set('address', addressToUse);
      url.searchParams.set('chainId', chainId.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || 'Failed to calculate PNL',
        };
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        return {
          success: false,
          error: data.error || 'Invalid PNL response',
        };
      }

      const pnlData = data.data as PNLResult;

      this.log('PNL calculated successfully', {
        totalPnlUsdc: pnlData.totalPnlUsdc.toFixed(2),
        totalPnlPercent: pnlData.totalPnlPercent.toFixed(2),
        averageEntryPrice: pnlData.averageEntryPrice.toFixed(4),
        currentPrice: pnlData.currentPricePerSierra.toFixed(4),
        investmentCount: pnlData.investments.length,
      });

      return {
        success: true,
        data: pnlData,
      };
    } catch (error) {
      this.log('Error calculating PNL', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate PNL',
      };
    }
  }
}
