/**
 * Confirm Invest Tool
 * Executes investment after user confirmation: USDC → SIERRA
 * Builds approval + swap transactions
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

interface ConfirmInvestResult {
  confirmed: boolean;
  swap: SwapConfirmResult;
}

export class ConfirmInvestTool extends BaseTool {
  readonly name = 'confirm_invest';
  readonly description = 'Confirma e executa o investimento (USDC → SIERRA) após o usuário aprovar. Chame esta função APENAS após o usuário confirmar explicitamente (ex: "sim", "yes", "confirmar", "ok", etc.).';
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
            description: 'Quantidade de USDC a investir',
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
  ): Promise<ToolResult<ConfirmInvestResult>> {
    const amount = params.amount as string;
    const fromToken = 'USDC';
    const toToken = 'SIERRA';

    this.log(`Confirming investment: ${amount} ${fromToken} → ${toToken}`);

    try {
      const transactionBuilder = getTransactionBuilder();
      const result = await transactionBuilder.buildSwapTransaction({
        fromToken,
        toToken,
        amount,
        userAddress: context.walletAddress!,
        chainId: context.chainId,
      });

      if (!result.success || !result.swapTransaction) {
        return {
          success: false,
          error: result.error || 'Failed to build investment transaction',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(result.quote!.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Investment confirmed and transactions built', {
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
      this.log('Confirm invest error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm investment',
      };
    }
  }
}
