/**
 * Confirm Swap Tool
 * Executes swap after user confirmation
 * Builds approval + swap transactions for any token pair
 */

import { formatUnits } from 'viem';
import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  ValidationResult,
  SwapConfirmResult,
} from '../../base/types';
import { getTransactionBuilder } from '../../../services/transaction/TransactionBuilder';
import { TokenRegistry } from '../../../services/token/TokenRegistry';

interface ConfirmSwapResult {
  confirmed: boolean;
  swap: SwapConfirmResult;
}

export class ConfirmSwapTool extends BaseTool {
  readonly name = 'confirm_swap';
  readonly description = 'Confirm and build swap transactions after user approves the quote. Call this only after the user confirms they want to proceed with the swap (e.g., says "yes", "sim", "proceed", etc.).';
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
            description: 'Amount to swap in human-readable format',
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
  ): Promise<ToolResult<ConfirmSwapResult>> {
    const fromToken = (params.fromToken as string).toUpperCase();
    const toToken = (params.toToken as string).toUpperCase();
    const amount = params.amount as string;
    const slippageParam = params.slippage as string | undefined;

    // Determine slippage
    const slippage = slippageParam
      ? parseFloat(slippageParam)
      : TokenRegistry.getRecommendedSlippage(fromToken, toToken);

    this.log(`Confirming swap: ${amount} ${fromToken} → ${toToken}`, {
      slippage,
      isLowLiquidity: TokenRegistry.isLowLiquidity(fromToken) || TokenRegistry.isLowLiquidity(toToken),
    });

    try {
      const transactionBuilder = getTransactionBuilder();
      const result = await transactionBuilder.buildSwapTransaction({
        fromToken,
        toToken,
        amount,
        slippage,
        userAddress: context.walletAddress!,
        chainId: context.chainId,
      });

      if (!result.success || !result.swapTransaction) {
        return {
          success: false,
          error: result.error || 'Failed to build swap transaction',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(result.quote!.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Swap confirmed and transactions built successfully', {
        needsApproval: result.needsApproval,
      });

      return {
        success: true,
        data: {
          confirmed: true,
          swap: {
            fromToken,
            toToken,
            fromAmount: amount,
            toAmount,
            exchangeRate: result.quote!.exchangeRate,
            priceImpact: result.quote!.priceImpact,
            estimatedGas: result.quote!.estimatedGas,
            needsApproval: result.needsApproval,
            approvalTransaction: result.approvalTransaction,
            swapTransaction: result.swapTransaction,
          },
        },
      };
    } catch (error) {
      this.log('Confirm swap error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm swap',
      };
    }
  }
}
