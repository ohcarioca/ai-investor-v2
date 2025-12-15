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
  readonly description =
    'Confirm and build swap transactions after user approves the quote. Call this only after the user confirms they want to proceed with the swap (e.g., says "yes", "sim", "proceed", etc.). Supports Ethereum and Avalanche.';
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
            description:
              'Token symbol to swap from (USDC, SIERRA, AVAX on Avalanche or ETH on Ethereum)',
            enum: ['USDC', 'SIERRA', 'AVAX', 'ETH'],
          },
          toToken: {
            type: 'string',
            description:
              'Token symbol to swap to (USDC, SIERRA, AVAX on Avalanche or ETH on Ethereum)',
            enum: ['USDC', 'SIERRA', 'AVAX', 'ETH'],
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

    // Validate tokens on the connected chain
    const fromToken = params.fromToken as string;
    const toToken = params.toToken as string;
    const chainId = context.chainId;

    if (!fromToken || !TokenRegistry.isSupported(fromToken, chainId)) {
      const supportedTokens = TokenRegistry.getSupportedSymbols(chainId).join(', ');
      return {
        isValid: false,
        error: `Invalid fromToken: ${fromToken}. Supported on chain ${chainId}: ${supportedTokens}`,
        errorCode: 'UNKNOWN_TOKEN',
      };
    }

    if (!toToken || !TokenRegistry.isSupported(toToken, chainId)) {
      const supportedTokens = TokenRegistry.getSupportedSymbols(chainId).join(', ');
      return {
        isValid: false,
        error: `Invalid toToken: ${toToken}. Supported on chain ${chainId}: ${supportedTokens}`,
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
    const chainId = context.chainId;

    // Determine slippage
    const slippage = slippageParam
      ? parseFloat(slippageParam)
      : TokenRegistry.getRecommendedSlippage(fromToken, toToken);

    this.log(`Confirming swap: ${amount} ${fromToken} → ${toToken}`, {
      chainId,
      slippage,
      isLowLiquidity:
        TokenRegistry.isLowLiquidity(fromToken) || TokenRegistry.isLowLiquidity(toToken),
    });

    try {
      const transactionBuilder = getTransactionBuilder();
      const result = await transactionBuilder.buildSwapTransaction({
        fromToken,
        toToken,
        amount,
        slippage,
        userAddress: context.walletAddress!,
        chainId,
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
        TokenRegistry.getDecimals(toToken, chainId)
      );

      this.log('Swap confirmed and transactions built successfully', {
        chainId,
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
