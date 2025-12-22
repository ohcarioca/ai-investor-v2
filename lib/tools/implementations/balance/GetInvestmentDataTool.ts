/**
 * Get Investment Data Tool
 * Calculates investment metrics based on SIERRA balance
 *
 * Total Invested (USDC) = SIERRA Balance × Current SIERRA Price (from OKX DEX)
 * APY = SIERRA_APY from environment
 */

import { BaseTool } from '../../base/BaseTool';
import { ToolContext, ToolResult, ToolDefinition, InvestmentData } from '../../base/types';
import { fetchWalletBalance } from '@/lib/services/balance';
import { getSierraPrice } from '@/lib/services/pnl/PriceService';

// APY is stored as decimal (0.0585 = 5.85%)
const SIERRA_APY_DECIMAL = parseFloat(process.env.NEXT_PUBLIC_SIERRA_APY || '0.0585');

export class GetInvestmentDataTool extends BaseTool {
  readonly name = 'get_investment_data';
  readonly description =
    'Obtém dados de investimento do usuário, incluindo total investido em USDC (baseado no saldo de SIERRA) e APY atual. Use esta função quando o usuário perguntar sobre: quanto tem investido, qual o APY, rentabilidade, retorno do investimento, ou dados de investimento.';
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
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<InvestmentData>> {
    // Always use connected wallet address
    const addressToUse = context.walletAddress!;
    const chainId = context.chainId || 1;

    // Convert decimal APY to percentage (0.0585 → 5.85)
    const apyPercent = SIERRA_APY_DECIMAL * 100;

    this.log(
      `Fetching investment data for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`
    );

    try {
      // Fetch wallet balance and current SIERRA price in parallel
      const [balanceData, sierraRate] = await Promise.all([
        fetchWalletBalance({
          address: addressToUse,
          chainId,
        }),
        getSierraPrice(chainId),
      ]);

      this.log(`Using SIERRA rate: ${sierraRate.toFixed(4)}, APY: ${apyPercent.toFixed(2)}%`);

      // Find SIERRA token balance
      const sierraToken = balanceData.tokens.find(
        (token) => token.symbol.toUpperCase() === 'SIERRA'
      );

      const sierraBalance = sierraToken ? parseFloat(sierraToken.balance) : 0;

      // Calculate total invested in USDC using dynamic price
      const totalInvestedUsdc = sierraBalance * sierraRate;

      const investmentData: InvestmentData = {
        success: true,
        total_invested_usdc: parseFloat(totalInvestedUsdc.toFixed(2)),
        apy: parseFloat(apyPercent.toFixed(2)),
        raw_apy: SIERRA_APY_DECIMAL, // Decimal format for calculations
      };

      this.log('Investment data calculated', {
        sierraBalance,
        sierraRate,
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
