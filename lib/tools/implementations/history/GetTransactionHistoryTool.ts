/**
 * Get Transaction History Tool
 * Fetches USDC and SIERRA token transfer history for the connected wallet
 * Uses the TransactionHistoryService to query Transfer events via getLogs
 */

import { BaseTool } from '../../base/BaseTool';
import { ToolContext, ToolResult, ToolDefinition } from '../../base/types';
import { getTransactionHistoryService } from '@/lib/services/history/TransactionHistoryService';
import type { TransactionHistoryResponse, TransactionSummary } from '@/types/transaction-history';

/**
 * Result type for transaction history
 */
export interface TransactionHistoryResult {
  transactions: TransactionHistoryResponse['transactions'];
  total: number;
  hasMore: boolean;
  summary?: TransactionSummary;
}

export class GetTransactionHistoryTool extends BaseTool {
  readonly name = 'get_transaction_history';
  readonly description =
    'Obtém o histórico de transações de USDC e SIERRA da carteira conectada. Retorna transferências recebidas e enviadas, com valores, datas e direção. Útil para verificar movimentações, conferir recebimentos e analisar atividade da carteira.';
  readonly category = 'history' as const;
  readonly requiresWallet = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          tokens: {
            type: 'string',
            description: 'Tokens para filtrar: "USDC", "SIERRA", ou "all" para ambos (padrão: all)',
            enum: ['USDC', 'SIERRA', 'all'],
            default: 'all',
          },
          direction: {
            type: 'string',
            description:
              'Direção das transferências: "in" (recebidas), "out" (enviadas), ou "all" (todas)',
            enum: ['in', 'out', 'all'],
            default: 'all',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de transações a retornar (padrão: 20, máximo: 100)',
            default: 20,
          },
          includeSummary: {
            type: 'string',
            description: 'Incluir resumo estatístico das transações (padrão: true)',
            enum: ['true', 'false'],
            default: 'true',
          },
        },
        required: [],
      },
    };
  }

  protected async executeImpl(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult<TransactionHistoryResult>> {
    const address = context.walletAddress!;
    const chainId = context.chainId || 1;

    // Parse parameters
    const tokensParam = (params.tokens as string) || 'all';
    const directionParam = (params.direction as string) || 'all';
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const includeSummary = (params.includeSummary as string) !== 'false';

    // Determine tokens to query
    const tokens: ('USDC' | 'SIERRA')[] =
      tokensParam === 'all' ? ['USDC', 'SIERRA'] : [tokensParam as 'USDC' | 'SIERRA'];

    // Determine direction filter
    const direction = directionParam === 'all' ? undefined : (directionParam as 'in' | 'out');

    this.log(`Fetching transaction history for: ${address.slice(0, 6)}...${address.slice(-4)}`, {
      chainId,
      tokens,
      direction,
      limit,
      includeSummary,
    });

    try {
      // Get transaction history service
      const historyService = getTransactionHistoryService(chainId);

      // Fetch transaction history
      const historyResult = await historyService.getTransactionHistory({
        address,
        chainId,
        tokens,
        limit,
        direction,
      });

      this.log('Transaction history fetched', {
        total: historyResult.total,
        returned: historyResult.transactions.length,
        hasMore: historyResult.hasMore,
      });

      // Optionally fetch summary
      let summary: TransactionSummary | undefined;
      if (includeSummary) {
        try {
          summary = await historyService.getTransactionSummary(address, tokens);
          this.log('Summary fetched', {
            totalTransactions: summary.totalTransactions,
            incomingCount: summary.incomingCount,
            outgoingCount: summary.outgoingCount,
          });
        } catch (summaryError) {
          this.log('Warning: Could not fetch summary', summaryError);
          // Continue without summary
        }
      }

      // Format response for the agent
      const result: TransactionHistoryResult = {
        transactions: historyResult.transactions,
        total: historyResult.total,
        hasMore: historyResult.hasMore,
        summary,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.log('Error fetching transaction history', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction history',
      };
    }
  }
}
