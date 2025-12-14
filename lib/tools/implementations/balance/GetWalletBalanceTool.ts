/**
 * Get Wallet Balance Tool
 * Fetches native AVAX + ERC20 token balances for connected wallet
 */

import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  WalletBalance,
} from '../../base/types';

export class GetWalletBalanceTool extends BaseTool {
  readonly name = 'get_wallet_balance';
  readonly description = 'Obtém o saldo completo da carteira conectada, incluindo tokens nativos (AVAX) e ERC20 (USDC, SIERRA). Retorna valores em USD e quantidade de cada token.';
  readonly category = 'balance' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Endereço da carteira (formato 0x...)',
          },
          chainId: {
            type: 'number',
            description: 'ID da chain (43114 para Avalanche)',
            default: 43114,
          },
        },
        required: ['address'],
      },
    };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<WalletBalance>> {
    // Always use connected wallet address (override any provided address)
    const addressToUse = context.walletAddress!;
    const chainId = (params.chainId as number) || context.chainId || 43114;

    this.log(`Fetching balance for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)}`);

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/wallet/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToUse, chainId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || 'Failed to fetch wallet balance',
        };
      }

      const balanceData = await response.json();

      this.log('Balance fetched successfully', {
        totalUsd: balanceData.totalUsd,
        tokenCount: balanceData.tokens?.length || 0,
      });

      return {
        success: true,
        data: balanceData,
      };
    } catch (error) {
      this.log('Error fetching balance', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch wallet balance',
      };
    }
  }
}
