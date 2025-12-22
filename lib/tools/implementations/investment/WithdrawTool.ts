/**
 * Withdraw Tool
 * Preview withdrawal: SIERRA → USDC
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

interface WithdrawResult {
  requiresConfirmation: boolean;
  swap: SwapQuoteResult;
}

export class WithdrawTool extends BaseTool {
  readonly name = 'withdraw';
  readonly description =
    'Saca/resgata investimento convertendo SIERRA de volta para USDC. Use quando o usuário falar: "quero sacar", "resgatar", "withdraw", "converter para USDC", "tirar do fundo", etc. Sempre converte SIERRA → USDC.';
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
            description: 'Quantidade de SIERRA a sacar (ex: "50" para 50 SIERRA)',
          },
        },
        required: ['amount'],
      },
    };
  }

  protected validateSpecificParams(
    params: Record<string, unknown>,
    _context: ToolContext
  ): ValidationResult {
    return this.validateAmount(params.amount);
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    _context: ToolContext
  ): Promise<ToolResult<WithdrawResult>> {
    const amount = params.amount as string;
    const fromToken = 'SIERRA';
    const toToken = 'USDC';

    this.log(`Preparing withdrawal quote: ${amount} ${fromToken} → ${toToken}`);

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
          error: quoteResult.error || 'Failed to get quote for withdrawal',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(quoteResult.quote.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Withdrawal quote prepared', {
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
      this.log('Withdraw error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare withdrawal',
      };
    }
  }
}
