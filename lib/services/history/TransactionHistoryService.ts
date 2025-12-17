/**
 * Transaction History Service
 *
 * Fetches transaction history for USDC and SIERRA tokens
 * using Viem's getLogs to query ERC20 Transfer events.
 *
 * Works with any RPC provider including QuickNode.
 */

import { createPublicClient, http, parseAbiItem, formatUnits, getAddress } from 'viem';
import { mainnet, avalanche } from 'viem/chains';
import type {
  Transaction,
  TokenTransfer,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  TransactionSummary,
  TransferDirection,
} from '@/types/transaction-history';

// ERC20 Transfer event signature
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

// Token configurations by chain
const TOKEN_CONFIG: Record<number, Record<string, { address: string; decimals: number }>> = {
  // Ethereum Mainnet
  1: {
    USDC: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
    },
    SIERRA: {
      address: '0x6bf7788EAA948d9fFBA7E9bb386E2D3c9810e0fc',
      decimals: 6,
    },
  },
  // Avalanche C-Chain
  43114: {
    USDC: {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      decimals: 6,
    },
    SIERRA: {
      address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
      decimals: 6,
    },
  },
};

// Chain configurations
const CHAIN_CONFIG: Record<number, { chain: typeof mainnet | typeof avalanche; rpcEnvKey: string }> = {
  1: { chain: mainnet, rpcEnvKey: 'QUICKNODE_ETH_RPC_URL' },
  43114: { chain: avalanche, rpcEnvKey: 'QUICKNODE_AVAX_RPC_URL' },
};

// Default block range for queries (to avoid timeout)
const DEFAULT_BLOCK_RANGE = 10000;
const MAX_BLOCK_RANGE = 100000;

export class TransactionHistoryService {
  private chainId: number;
  private publicClient: ReturnType<typeof createPublicClient>;

  constructor(chainId: number, rpcUrl?: string) {
    const chainConfig = CHAIN_CONFIG[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    this.chainId = chainId;

    // Use provided RPC URL or fall back to env variable or default
    const url = rpcUrl || process.env[chainConfig.rpcEnvKey] || undefined;

    this.publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(url),
    });
  }

  /**
   * Get supported tokens for the current chain
   */
  getSupportedTokens(): string[] {
    return Object.keys(TOKEN_CONFIG[this.chainId] || {});
  }

  /**
   * Get token config by symbol
   */
  getTokenConfig(symbol: string): { address: string; decimals: number } | null {
    return TOKEN_CONFIG[this.chainId]?.[symbol] || null;
  }

  /**
   * Fetch transaction history for a wallet
   */
  async getTransactionHistory(
    query: TransactionHistoryQuery
  ): Promise<TransactionHistoryResponse> {
    const {
      address,
      tokens = ['USDC', 'SIERRA'],
      limit = 50,
      offset = 0,
      fromBlock,
      toBlock,
      direction,
    } = query;

    const normalizedAddress = getAddress(address);
    const allTransactions: TokenTransfer[] = [];

    // Get current block number if not specified
    const currentBlock = toBlock || Number(await this.publicClient.getBlockNumber());
    const startBlock = fromBlock || Math.max(0, currentBlock - DEFAULT_BLOCK_RANGE);

    // Fetch transfers for each token
    for (const tokenSymbol of tokens) {
      const tokenConfig = this.getTokenConfig(tokenSymbol);
      if (!tokenConfig) continue;

      try {
        // Fetch incoming transfers (to = wallet)
        if (!direction || direction === 'in') {
          const incomingLogs = await this.publicClient.getLogs({
            address: tokenConfig.address as `0x${string}`,
            event: TRANSFER_EVENT,
            args: {
              to: normalizedAddress,
            },
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(currentBlock),
          });

          const incomingTransfers = await this.processLogs(
            incomingLogs,
            tokenSymbol as 'USDC' | 'SIERRA',
            tokenConfig.decimals,
            normalizedAddress,
            'in'
          );
          allTransactions.push(...incomingTransfers);
        }

        // Fetch outgoing transfers (from = wallet)
        if (!direction || direction === 'out') {
          const outgoingLogs = await this.publicClient.getLogs({
            address: tokenConfig.address as `0x${string}`,
            event: TRANSFER_EVENT,
            args: {
              from: normalizedAddress,
            },
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(currentBlock),
          });

          const outgoingTransfers = await this.processLogs(
            outgoingLogs,
            tokenSymbol as 'USDC' | 'SIERRA',
            tokenConfig.decimals,
            normalizedAddress,
            'out'
          );
          allTransactions.push(...outgoingTransfers);
        }
      } catch (error) {
        console.error(`[TransactionHistory] Error fetching ${tokenSymbol} transfers:`, error);
        // Continue with other tokens
      }
    }

    // Sort by block number (newest first)
    allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);

    // Apply pagination
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    // Fetch timestamps for paginated transactions
    const transactionsWithTimestamps = await this.addTimestamps(paginatedTransactions);

    return {
      transactions: transactionsWithTimestamps,
      total: allTransactions.length,
      limit,
      offset,
      hasMore: offset + limit < allTransactions.length,
      address: normalizedAddress,
      chainId: this.chainId,
      cachedAt: Date.now(),
    };
  }

  /**
   * Process raw logs into TokenTransfer objects
   */
  private async processLogs(
    logs: Array<{
      address: `0x${string}`;
      blockNumber: bigint;
      transactionHash: `0x${string}`;
      args: {
        from?: `0x${string}`;
        to?: `0x${string}`;
        value?: bigint;
      };
    }>,
    tokenSymbol: 'USDC' | 'SIERRA',
    decimals: number,
    _walletAddress: string,
    direction: TransferDirection
  ): Promise<TokenTransfer[]> {
    return logs.map((log) => {
      const value = log.args.value?.toString() || '0';
      const valueFormatted = formatUnits(BigInt(value), decimals);

      return {
        hash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
        timestamp: 0, // Will be filled later
        from: log.args.from || '',
        to: log.args.to || '',
        value,
        valueFormatted,
        tokenAddress: log.address,
        tokenSymbol,
        tokenDecimals: decimals,
        direction,
        status: 'confirmed' as const,
      };
    });
  }

  /**
   * Add timestamps to transactions by fetching block data
   */
  private async addTimestamps(transactions: TokenTransfer[]): Promise<TokenTransfer[]> {
    // Get unique block numbers
    const blockNumbers = [...new Set(transactions.map((t) => t.blockNumber))];

    // Fetch block timestamps (batch to avoid too many requests)
    const blockTimestamps = new Map<number, number>();

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < blockNumbers.length; i += batchSize) {
      const batch = blockNumbers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (blockNumber) => {
          try {
            const block = await this.publicClient.getBlock({
              blockNumber: BigInt(blockNumber),
            });
            blockTimestamps.set(blockNumber, Number(block.timestamp));
          } catch (error) {
            console.error(`[TransactionHistory] Error fetching block ${blockNumber}:`, error);
            blockTimestamps.set(blockNumber, 0);
          }
        })
      );
    }

    // Add timestamps to transactions
    return transactions.map((tx) => ({
      ...tx,
      timestamp: blockTimestamps.get(tx.blockNumber) || 0,
    }));
  }

  /**
   * Get transaction summary statistics
   */
  async getTransactionSummary(
    address: string,
    tokens: ('USDC' | 'SIERRA')[] = ['USDC', 'SIERRA']
  ): Promise<TransactionSummary> {
    const history = await this.getTransactionHistory({
      address,
      chainId: this.chainId,
      tokens,
      limit: 1000, // Get more for summary
    });

    const byToken: TransactionSummary['byToken'] = {};

    for (const tx of history.transactions) {
      if (!('tokenSymbol' in tx)) continue;

      const token = tx.tokenSymbol;
      if (!byToken[token]) {
        byToken[token] = {
          totalIn: '0',
          totalOut: '0',
          netChange: '0',
          transactionCount: 0,
        };
      }

      const stats = byToken[token];
      stats.transactionCount++;

      const value = BigInt(tx.value);
      if (tx.direction === 'in') {
        stats.totalIn = (BigInt(stats.totalIn) + value).toString();
      } else {
        stats.totalOut = (BigInt(stats.totalOut) + value).toString();
      }
      stats.netChange = (BigInt(stats.totalIn) - BigInt(stats.totalOut)).toString();
    }

    // Find first and last transactions
    const timestamps = history.transactions
      .map((tx) => tx.timestamp)
      .filter((t) => t > 0);

    return {
      byToken,
      firstTransaction: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      lastTransaction: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
      totalTransactions: history.transactions.length,
      incomingCount: history.transactions.filter((tx) => tx.direction === 'in').length,
      outgoingCount: history.transactions.filter((tx) => tx.direction === 'out').length,
    };
  }

  /**
   * Get recent transfers for a specific token
   */
  async getRecentTokenTransfers(
    address: string,
    tokenSymbol: 'USDC' | 'SIERRA',
    limit: number = 10
  ): Promise<TokenTransfer[]> {
    const result = await this.getTransactionHistory({
      address,
      chainId: this.chainId,
      tokens: [tokenSymbol],
      limit,
    });

    return result.transactions as TokenTransfer[];
  }
}

// Factory function to create service instance
export function createTransactionHistoryService(
  chainId: number,
  rpcUrl?: string
): TransactionHistoryService {
  return new TransactionHistoryService(chainId, rpcUrl);
}

// Singleton instances by chain ID
const serviceInstances = new Map<number, TransactionHistoryService>();

export function getTransactionHistoryService(
  chainId: number,
  rpcUrl?: string
): TransactionHistoryService {
  const key = chainId;
  if (!serviceInstances.has(key)) {
    serviceInstances.set(key, new TransactionHistoryService(chainId, rpcUrl));
  }
  return serviceInstances.get(key)!;
}
