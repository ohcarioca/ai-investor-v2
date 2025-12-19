/**
 * Core types and interfaces for the modular tool system
 */

// ============================================================================
// Tool Context
// ============================================================================

/**
 * Context passed to every tool execution
 */
export interface ToolContext {
  /** Connected wallet address (if any) */
  walletAddress?: string;
  /** Blockchain chain ID (1 for Ethereum, 43114 for Avalanche) */
  chainId: number;
  /** Whether a wallet is connected */
  isConnected: boolean;
}

// ============================================================================
// Tool Results
// ============================================================================

/**
 * Base result returned by all tools
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: ToolErrorCode;
}

/**
 * Result for swap/quote operations
 */
export interface SwapQuoteResult {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
}

/**
 * Result for confirmed swap with transactions
 */
export interface SwapConfirmResult extends SwapQuoteResult {
  needsApproval: boolean;
  approvalTransaction?: TransactionData;
  swapTransaction: TransactionData;
}

/**
 * Raw transaction data for wallet signing
 */
export interface TransactionData {
  to: string;
  data: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}

/**
 * Result requiring user confirmation
 */
export interface ConfirmationResult extends ToolResult {
  requiresConfirmation: boolean;
  swap?: SwapQuoteResult;
}

/**
 * Result with chart data
 */
export interface ChartResult extends ToolResult {
  chartConfig?: ChartConfig;
}

/**
 * Chart types supported by the system
 */
export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'composed';

/**
 * Dynamic chart types that can be requested by users
 */
export type DynamicChartType =
  | 'portfolio_value'
  | 'token_distribution'
  | 'transaction_volume'
  | 'balance_history'
  | 'profit_loss'
  | 'apy_performance'
  | 'token_comparison'
  | 'future_projection';

/**
 * Chart configuration for rendering elegant, dynamic charts
 */
export interface ChartConfig {
  /** Chart title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Visual chart type */
  type: ChartType;
  /** Chart data points */
  data: ChartDataPoint[];
  /** Data key mappings for x and y axes */
  dataKeys: {
    x: string;
    y: string[];
  };

  // Styling options
  /** Color palette for chart elements */
  colors?: string[];
  /** Enable gradient fill for area/bar charts */
  gradient?: boolean;
  /** Show data point dots on lines (default: false for elegant look) */
  showDots?: boolean;
  /** Curve interpolation type */
  curveType?: 'monotone' | 'linear' | 'natural';

  // Layout options
  /** Show Y axis (default: true) */
  showYAxis?: boolean;
  /** Show X axis (default: true) */
  showXAxis?: boolean;
  /** Show grid lines (default: false for minimalist look) */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'right' | 'left';

  // KPI highlight (displayed in header like the reference design)
  highlightValue?: {
    /** Main value to display (e.g., "6.2%", "$1,234") */
    value: string;
    /** Optional label for the value */
    label?: string;
    /** Trend direction */
    trend?: 'up' | 'down' | 'neutral';
    /** Trend percentage (e.g., "+5.2%") */
    trendPercent?: string;
  };

  // Axis labels
  /** Y axis label */
  yAxisLabel?: string;
  /** X axis label */
  xAxisLabel?: string;

  // Footer stats
  /** Show footer statistics */
  showFooterStats?: boolean;
  /** Custom footer stats */
  footerStats?: Array<{
    label: string;
    value: string;
    color?: string;
  }>;
}

/**
 * Individual data point in a chart
 */
export interface ChartDataPoint {
  /** Display name/label for the data point */
  name: string;
  /** Primary value */
  value: number;
  /** Additional dynamic properties for multi-series charts */
  [key: string]: string | number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of parameter validation
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: ToolErrorCode;
}

/**
 * Standard error codes for tools
 */
export type ToolErrorCode =
  | 'WALLET_NOT_CONNECTED'
  | 'INVALID_ADDRESS'
  | 'PLACEHOLDER_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'INSUFFICIENT_BALANCE'
  | 'QUOTE_FAILED'
  | 'BUILD_FAILED'
  | 'APPROVAL_FAILED'
  | 'UNKNOWN_TOKEN'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_TOOL'
  | 'TOOL_EXECUTION_ERROR';

// ============================================================================
// Tool Interface
// ============================================================================

/**
 * OpenAI function parameter schema
 * Uses index signature for compatibility with OpenAI SDK
 */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    default?: unknown;
  }>;
  required: string[];
  [key: string]: unknown; // Index signature for OpenAI FunctionParameters compatibility
}

/**
 * OpenAI function definition format
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/**
 * Tool category for organization
 */
export type ToolCategory = 'balance' | 'investment' | 'swap' | 'chart' | 'history' | 'solana';

/**
 * Main interface that all tools must implement
 */
export interface ITool {
  /** Unique tool name (used by OpenAI) */
  readonly name: string;
  /** Portuguese description for OpenAI */
  readonly description: string;
  /** Tool category */
  readonly category: ToolCategory;
  /** Whether this tool requires wallet connection */
  readonly requiresWallet: boolean;

  /**
   * Returns the OpenAI function definition for this tool
   */
  getDefinition(): ToolDefinition;

  /**
   * Validates parameters before execution
   */
  validateParams(
    params: Record<string, unknown>,
    context: ToolContext
  ): ValidationResult;

  /**
   * Executes the tool with given parameters
   */
  execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult>;
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Quote request parameters
 */
export interface QuoteRequest {
  chainId: string;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: string;
}

/**
 * Quote response from API
 */
export interface QuoteResponse {
  success: boolean;
  quote?: {
    fromAmount: string;
    toAmount: string;
    exchangeRate: string;
    priceImpact: string;
    estimatedGas: string;
  };
  error?: string;
}

/**
 * Build swap request parameters
 */
export interface BuildSwapRequest {
  chainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: string;
  userAddress: string;
}

/**
 * Build swap response
 */
export interface BuildSwapResponse {
  success: boolean;
  transaction?: TransactionData;
  needsApproval?: boolean;
  approvalTransaction?: TransactionData;
  approvalDetails?: {
    currentAllowance: string;
    requiredAmount: string;
    router: string;
  };
  error?: string;
}

/**
 * Approval check request
 */
export interface ApprovalRequest {
  chainId: number;
  tokenAddress: string;
  amount: string;
  userAddress: string;
}

/**
 * Approval check response
 */
export interface ApprovalResponse {
  status: {
    isApproved: boolean;
    currentAllowance: string;
    requiredAllowance: string;
    spenderAddress: string;
  };
  transaction?: TransactionData;
}

// ============================================================================
// Investment Data Types
// ============================================================================

/**
 * Investment data from webhook
 */
export interface InvestmentData {
  success: boolean;
  total_invested_usdc?: number;
  apy?: number;
  raw_apy?: number;
  error?: string;
}

/**
 * Wallet balance data
 */
export interface WalletBalance {
  native: {
    symbol: string;
    balance: string;
    balanceUsd: number;
  };
  tokens: Array<{
    symbol: string;
    address: string;
    balance: string;
    balanceUsd: number;
  }>;
  totalUsd: number;
}

// ============================================================================
// Solana Types
// ============================================================================

/**
 * Solana investment result (preview before confirmation)
 */
export interface SolanaInvestResult {
  requiresConfirmation: boolean;
  amount: string;
  targetWallet: string;
  targetNetwork: 'ETH' | 'AVAX';
  depositWallet: string;
  estimatedFee: string;
}

/**
 * Solana investment confirmation result
 */
export interface SolanaInvestConfirmResult {
  success: boolean;
  txHash: string;
  amount: string;
  targetWallet: string;
  targetNetwork: 'ETH' | 'AVAX';
  webhookSent: boolean;
}

/**
 * Webhook payload for Solana investment notifications
 */
export interface SolanaWebhookPayload {
  wallet_solana: string;
  wallet_target: string;
  network_target: 'ETH' | 'AVAX';
  amount_usdc: number;
  tx_hash: string;
  timestamp: string;
}

/**
 * Solana balance data
 */
export interface SolanaBalanceData {
  address: string;
  usdcBalance: number;
  solBalance: number;
  lastUpdated: Date;
}
