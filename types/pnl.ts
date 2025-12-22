/**
 * PNL (Profit & Loss) Types
 * Types for tracking investment performance using weighted average price
 */

/**
 * Individual investment transaction (USDC → SIERRA swap)
 */
export interface Investment {
  hash: string;
  timestamp: number; // Unix timestamp in seconds
  usdcAmount: number; // USDC invested
  sierraReceived: number; // SIERRA tokens received
  pricePerSierra: number; // Price at time of investment (USDC/SIERRA)
  blockNumber: number;
}

/**
 * Individual withdrawal transaction (SIERRA → USDC swap)
 */
export interface Withdrawal {
  hash: string;
  timestamp: number; // Unix timestamp in seconds
  sierraAmount: number; // SIERRA withdrawn
  usdcReceived: number; // USDC received
  pricePerSierra: number; // Price at time of withdrawal (USDC/SIERRA)
  blockNumber: number;
}

/**
 * Complete PNL calculation result
 */
export interface PNLResult {
  // Investment totals
  totalInvestedUsdc: number; // Sum of all USDC invested
  totalWithdrawnUsdc: number; // Sum of all USDC withdrawn
  netInvestedUsdc: number; // totalInvested - totalWithdrawn

  // Weighted average calculations
  averageEntryPrice: number; // Weighted average price per SIERRA
  totalSierraPurchased: number; // Total SIERRA ever bought
  totalSierraSold: number; // Total SIERRA ever sold

  // Current position
  currentSierraBalance: number; // Current SIERRA holdings
  currentPricePerSierra: number; // Current market price (from OKX DEX)
  currentValueUsdc: number; // Current value at market price
  costBasisUsdc: number; // Cost basis of current holdings

  // PNL metrics
  unrealizedPnlUsdc: number; // Current value - cost basis
  unrealizedPnlPercent: number; // (unrealized / costBasis) * 100
  realizedPnlUsdc: number; // Gains/losses from withdrawals
  realizedPnlPercent: number; // % return on realized

  // Yield calculations
  accumulatedYieldUsdc: number; // Yield from APY (SIERRA appreciation)
  accumulatedYieldPercent: number; // APY % earned
  holdingPeriodDays: number; // Days since first investment

  // Total returns
  totalPnlUsdc: number; // unrealized + realized
  totalPnlPercent: number; // Total % return

  // APY metrics
  currentApy: number; // Current APY rate (as percentage, e.g., 5.85)
  projectedAnnualYieldUsdc: number; // Projected 1-year yield

  // Transaction details
  investments: Investment[];
  withdrawals: Withdrawal[];

  // Metadata
  firstInvestmentDate: number | null; // Unix timestamp
  lastTransactionDate: number | null; // Unix timestamp
  chainId: number;
  walletAddress: string;
  calculatedAt: number; // Unix timestamp when calculated
}

/**
 * Request parameters for PNL calculation
 */
export interface PNLRequest {
  walletAddress: string;
  chainId: number;
}

/**
 * API response format
 */
export interface PNLApiResponse {
  success: boolean;
  data?: PNLResult;
  error?: string;
}
