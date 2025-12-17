/**
 * Gas optimization types for transaction fee management
 */

// Network congestion status
export type NetworkStatus = 'low' | 'normal' | 'high';

// Operation types for dynamic gas margins
export type OperationType = 'approval' | 'simple_swap' | 'standard_swap' | 'complex_swap';

// Gas price data from the network
export interface GasPriceData {
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  baseFeePerGas: bigint;
}

// Optimized gas recommendation
export interface OptimizedGas {
  // EIP-1559 gas parameters
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;

  // Legacy gas price (fallback)
  gasPrice: bigint;

  // Display values
  baseFeeGwei: number;
  priorityFeeGwei: number;
  totalFeeGwei: number;

  // Cost estimation
  estimatedCostWei: bigint;
  estimatedCostUsd: number;

  // Network info
  networkStatus: NetworkStatus;
  lastUpdated: number;
}

// Gas estimation result for a specific transaction
export interface GasEstimate {
  gasLimit: bigint;
  gasLimitWithMargin: bigint;
  margin: number;
  operationType: OperationType;

  // Cost in native currency
  estimatedCostWei: bigint;
  estimatedCostUsd: number;
}

// Gas margins configuration
export interface GasMarginConfig {
  approval: number;
  simple_swap: number;
  standard_swap: number;
  complex_swap: number;
}

// Full gas configuration
export interface GasConfig {
  optimization_enabled: boolean;
  margin_by_operation: GasMarginConfig;
  complex_tokens: string[];
  max_gas_price_gwei: Record<string, number>;
  approval_strategy: 'exact_with_margin' | 'unlimited';
  approval_margin_percent: number;
  show_fee_estimate: boolean;
  cache_duration_ms: number;
}

// Native currency price for USD conversion
export interface NativeCurrencyPrice {
  symbol: string;
  priceUsd: number;
  lastUpdated: number;
}

// Hook return type
export interface UseOptimizedGasReturn {
  // Gas data
  optimizedGas: OptimizedGas | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Methods
  refreshGasPrice: () => Promise<void>;
  estimateTransactionCost: (gasLimit: bigint) => GasEstimate | null;

  // Helpers
  formatGwei: (wei: bigint) => string;
  formatUsd: (amount: number) => string;
}

// Gas estimator return type
export interface GasEstimatorResult {
  gasLimit: bigint;
  margin: number;
  operationType: OperationType;
}
