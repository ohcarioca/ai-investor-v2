/**
 * Transaction History Types
 *
 * Types for tracking wallet transaction history,
 * specifically for USDC and SIERRA token transfers.
 */

// Direction of the transfer relative to the wallet
export type TransferDirection = 'in' | 'out';

// Transaction status
export type TransactionStatus = 'confirmed' | 'pending' | 'failed';

// Token transfer event
export interface TokenTransfer {
  // Transaction details
  hash: string;
  blockNumber: number;
  timestamp: number; // Unix timestamp in seconds

  // Transfer details
  from: string;
  to: string;
  value: string; // Raw value in base units
  valueFormatted: string; // Human-readable value

  // Token info
  tokenAddress: string;
  tokenSymbol: 'USDC' | 'SIERRA';
  tokenDecimals: number;

  // Direction relative to queried wallet
  direction: TransferDirection;

  // Additional info
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;

  // USD value at time of transaction (if available)
  valueUsd?: number;
}

// Native token transfer (ETH/AVAX)
export interface NativeTransfer {
  hash: string;
  blockNumber: number;
  timestamp: number;

  from: string;
  to: string;
  value: string;
  valueFormatted: string;

  // Native currency
  symbol: 'ETH' | 'AVAX';
  decimals: 18;

  direction: TransferDirection;
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;

  valueUsd?: number;
}

// Combined transaction (can be token or native)
export type Transaction = TokenTransfer | NativeTransfer;

// Query parameters for fetching history
export interface TransactionHistoryQuery {
  address: string;
  chainId: number;

  // Filter by tokens (empty = all supported tokens)
  tokens?: ('USDC' | 'SIERRA')[];

  // Include native transfers (ETH/AVAX)
  includeNative?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Time range (unix timestamps)
  fromTimestamp?: number;
  toTimestamp?: number;

  // Block range
  fromBlock?: number;
  toBlock?: number;

  // Direction filter
  direction?: TransferDirection;
}

// Paginated response
export interface TransactionHistoryResponse {
  transactions: Transaction[];

  // Pagination info
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  // Query context
  address: string;
  chainId: number;

  // Cache info
  cachedAt?: number;
}

// Summary statistics
export interface TransactionSummary {
  // Totals by token
  byToken: {
    [tokenSymbol: string]: {
      totalIn: string;
      totalOut: string;
      netChange: string;
      transactionCount: number;
    };
  };

  // Time-based stats
  firstTransaction?: number; // Timestamp
  lastTransaction?: number;

  // Overall counts
  totalTransactions: number;
  incomingCount: number;
  outgoingCount: number;
}

// QuickNode specific types
export interface QuickNodeTransferLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
}

export interface QuickNodeTransferResponse {
  jsonrpc: string;
  id: number;
  result: QuickNodeTransferLog[];
}

// Hook return type
export interface UseTransactionHistoryReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  hasMore: boolean;
  loadMore: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;

  // Summary
  summary: TransactionSummary | null;

  // Filters
  setTokenFilter: (tokens: ('USDC' | 'SIERRA')[]) => void;
  setDirectionFilter: (direction: TransferDirection | null) => void;
}
