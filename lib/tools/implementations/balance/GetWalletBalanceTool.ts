/**
 * Get Wallet Balance Tool
 * Fetches native ETH/AVAX + ERC20 token balances for connected wallet
 * Directly calls the BalanceService (no HTTP request needed)
 */

import { BaseTool } from '../../base/BaseTool';
import {
  ToolContext,
  ToolResult,
  ToolDefinition,
  WalletBalance,
} from '../../base/types';
import { fetchWalletBalance } from '../../../services/balance';

export class GetWalletBalanceTool extends BaseTool {
  readonly name = 'get_wallet_balance';
  readonly description = 'Obtém o saldo completo da carteira conectada, incluindo tokens nativos (ETH/AVAX) e ERC20 (USDC, SIERRA). Retorna valores em USD e quantidade de cada token. Suporta Ethereum (chainId: 1) e Avalanche (chainId: 43114).';
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
            description: 'ID da chain (1 para Ethereum, 43114 para Avalanche)',
            default: 1,
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
    // ALWAYS use context.chainId (from connected wallet) - this is the source of truth
    const chainId = context.chainId || 1;

    this.log(`Fetching balance for: ${addressToUse.slice(0, 6)}...${addressToUse.slice(-4)} on chain ${chainId}`);

    try {
      // Call the balance service directly (no HTTP request needed)
      const balanceData = await fetchWalletBalance({
        address: addressToUse,
        chainId,
      });

      this.log('Balance fetched successfully', {
        chainId: balanceData.chainId,
        chainName: balanceData.chainName,
        nativeSymbol: balanceData.native?.symbol,
        nativeBalance: balanceData.native?.balance,
        totalUsd: balanceData.totalUsd,
        tokenCount: balanceData.tokens?.length || 0,
      });

      return {
        success: true,
        data: balanceData,
      };
    } catch (error) {
      this.log('Error fetching balance', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch wallet balance',
      };
    }
  }
}
