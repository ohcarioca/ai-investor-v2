/**
 * Confirm Withdraw Tool
 * Executes withdrawal after user confirmation: SIERRA → USDC
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

interface ConfirmWithdrawResult {
  confirmed: boolean;
  swap: SwapConfirmResult;
}

export class ConfirmWithdrawTool extends BaseTool {
  readonly name = 'confirm_withdraw';
  readonly description = 'Confirma e executa o saque (SIERRA → USDC) após o usuário aprovar. Chame esta função APENAS após o usuário confirmar explicitamente (ex: "sim", "yes", "confirmar", "ok", etc.).';
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
            description: 'Quantidade de SIERRA a sacar',
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
  ): Promise<ToolResult<ConfirmWithdrawResult>> {
    const amount = params.amount as string;
    const fromToken = 'SIERRA';
    const toToken = 'USDC';

    this.log(`Confirming withdrawal: ${amount} ${fromToken} → ${toToken}`);

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
          error: result.error || 'Failed to build withdrawal transaction',
        };
      }

      // Format the output amount
      const toAmount = formatUnits(
        BigInt(result.quote!.toAmount),
        TokenRegistry.getDecimals(toToken)
      );

      this.log('Withdrawal confirmed and transactions built', {
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
      this.log('Confirm withdraw error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm withdrawal',
      };
    }
  }
}
