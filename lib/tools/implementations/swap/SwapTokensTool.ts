/**
 * Swap Tokens Tool
 * Generic token swap: USDC ↔ SIERRA ↔ AVAX
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

interface SwapResult {
  requiresConfirmation: boolean;
  swap: SwapQuoteResult;
}

export class SwapTokensTool extends BaseTool {
  readonly name = 'swap_tokens';
  readonly description = 'Troca tokens genérica (use apenas para swaps que NÃO sejam investimento ou saque). Para investir use "invest", para sacar use "withdraw". Esta função é para swaps customizados entre qualquer par de tokens.';
  readonly category = 'swap' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          fromToken: {
            type: 'string',
            description: 'Token symbol to swap from (USDC, SIERRA, or AVAX)',
            enum: ['USDC', 'SIERRA', 'AVAX'],
          },
          toToken: {
            type: 'string',
            description: 'Token symbol to swap to (USDC, SIERRA, or AVAX)',
            enum: ['USDC', 'SIERRA', 'AVAX'],
          },
          amount: {
            type: 'string',
            description: 'Amount to swap in human-readable format (e.g., "10.5" for 10.5 USDC)',
          },
          slippage: {
            type: 'string',
            description: 'Slippage tolerance in percentage (default: 0.5)',
            default: '0.5',
          },
        },
        required: ['fromToken', 'toToken', 'amount'],
      },
    };
  }

  protected validateSpecificParams(
    params: Record<string, unknown>,
    context: ToolContext
  ): ValidationResult {
    // Validate amount
    const amountValidation = this.validateAmount(params.amount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate tokens
    const fromToken = params.fromToken as string;
    const toToken = params.toToken as string;

    if (!fromToken || !TokenRegistry.isSupported(fromToken)) {
      return {
        isValid: false,
        error: `Invalid fromToken: ${fromToken}. Supported: USDC, SIERRA, AVAX`,
        errorCode: 'UNKNOWN_TOKEN',
      };
    }

    if (!toToken || !TokenRegistry.isSupported(toToken)) {
      return {
        isValid: false,
        error: `Invalid toToken: ${toToken}. Supported: USDC, SIERRA, AVAX`,
        errorCode: 'UNKNOWN_TOKEN',
      };
    }

    if (fromToken.toUpperCase() === toToken.toUpperCase()) {
      return {
        isValid: false,
        error: 'Cannot swap token to itself',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    return { isValid: true };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<SwapResult>> {
    const fromToken = (params.fromToken as string).toUpperCase();
    const toToken = (params.toToken as string).toUpperCase();
    const amount = params.amount as string;
    const slippageParam = params.slippage as string | undefined;

    // Determine slippage
    const slippage = slippageParam
      ? parseFloat(slippageParam)
      : TokenRegistry.getRecommendedSlippage(fromToken, toToken);

    this.log(`Preparing swap quote: ${amount} ${fromToken} → ${toToken}`, {
      slippage,
      isLowLiquidity: TokenRegistry.isLowLiquidity(fromToken) || TokenRegistry.isLowLiquidity(toToken),
    });

    try {
      const quoteFetcher = getQuoteFetcher();
      const quoteResult = await quoteFetcher.getQuoteBySymbols({
        fromToken,
        toToken,
        amount,
        slippage,
      });

      if (!quoteResult.success || !quoteResult.quote) {
        return {
          success: false,
          error: quoteResult.error || 'Failed to get quote',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(quoteResult.quote.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Swap quote prepared, awaiting user confirmation', {
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
      this.log('Quote error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote',
      };
    }
  }
}
