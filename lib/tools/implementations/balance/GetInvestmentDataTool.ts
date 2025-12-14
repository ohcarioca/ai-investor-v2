/**
 * Get Investment Data Tool
 * Fetches investment metrics (total invested, APY) from webhook
 */

import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  InvestmentData,
} from '../../base/types';

export class GetInvestmentDataTool extends BaseTool {
  readonly name = 'get_investment_data';
  readonly description = 'Obtém dados de investimento do usuário, incluindo total investido em USDC e APY atual. Use esta função quando o usuário perguntar sobre: quanto tem investido, qual o APY, rentabilidade, retorno do investimento, ou dados de investimento.';
  readonly category = 'balance' as const;
  readonly requiresWallet = true;

  private readonly webhookUrl = 'https://n8n.balampay.com/webhook/calc_swaps';

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
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<InvestmentData>> {
    // Always use connected wallet address
    const addressToUse = context.walletAddress!;

    this.log(`Fetching investment data for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`);

    try {
      const response = await fetch(`${this.webhookUrl}?wallet_address=${addressToUse}`);

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to fetch investment data',
        };
      }

      const data = await response.json();

      const investmentData: InvestmentData = {
        success: true,
        total_invested_usdc: parseFloat(data.total_invested_usdc),
        apy: parseFloat(data.apy) * 100, // Convert to percentage
        raw_apy: parseFloat(data.apy), // Keep raw value for reference
      };

      this.log('Investment data fetched successfully', {
        total_invested_usdc: investmentData.total_invested_usdc,
        apy: investmentData.apy,
      });

      return {
        success: true,
        data: investmentData,
      };
    } catch (error) {
      this.log('Error fetching investment data', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch investment data',
      };
    }
  }
}
