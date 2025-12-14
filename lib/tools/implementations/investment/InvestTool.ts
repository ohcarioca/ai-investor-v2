/**
 * Invest Tool
 * Preview investment: USDC → SIERRA
 * Returns quote and requires user confirmation before execution
 */

import { formatUnits } from 'viem';
import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  SwapQuoteResult,
} from '../../base/types';
import { getQuoteFetcher } from '../../../services/transaction/QuoteFetcher';
import { TokenRegistry } from '../../../services/token/TokenRegistry';

interface InvestResult {
  requiresConfirmation: boolean;
  swap: SwapQuoteResult;
}

export class InvestTool extends BaseTool {
  readonly name = 'invest';
  readonly description = 'Investe USDC no fundo SIERRA. Use quando o usuário falar: "quero investir", "investir X USDC", "aportar", "aplicar dinheiro", etc. Sempre converte USDC → SIERRA.';
  readonly category = 'investment' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'string',
            description: 'Quantidade de USDC a investir (ex: "100" para 100 USDC)',
          },
        },
        required: ['amount'],
      },
    };
  }

  protected validateSpecificParams(
    params: Record<string, unknown>,
    context: ToolContext
  ): ValidationResult {
    return this.validateAmount(params.amount);
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<InvestResult>> {
    const amount = params.amount as string;
    const fromToken = 'USDC';
    const toToken = 'SIERRA';

    this.log(`Preparing investment quote: ${amount} ${fromToken} → ${toToken}`);

    try {
      const quoteFetcher = getQuoteFetcher();
      const quoteResult = await quoteFetcher.getQuoteBySymbols({
        fromToken,
        toToken,
        amount,
        slippage: TokenRegistry.getRecommendedSlippage(fromToken, toToken),
      });

      if (!quoteResult.success || !quoteResult.quote) {
        return {
          success: false,
          error: quoteResult.error || 'Failed to get quote for investment',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(quoteResult.quote.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Investment quote prepared', {
        fromAmount: amount,
        toAmount,
        exchangeRate: quoteResult.quote.exchangeRate,
      });

      return {
        success: true,
        data: {
          requiresConfirmation: true,
          swap: {
            fromToken,
            toToken,
            fromAmount: amount,
            toAmount,
            exchangeRate: quoteResult.quote.exchangeRate,
            priceImpact: quoteResult.quote.priceImpact,
            estimatedGas: quoteResult.quote.estimatedGas,
          },
        },
      };
    } catch (error) {
      this.log('Invest error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare investment',
      };
    }
  }
}
