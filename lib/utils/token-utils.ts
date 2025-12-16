/**
 * Token Utilities
 * Centralized functions for extracting and processing token data
 */

/**
 * Extracted token data from OKX API response
 */
export interface ExtractedTokenData {
  fromDecimals: number;
  toDecimals: number;
  fromSymbol: string;
  toSymbol: string;
  toAmount: string;
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
}

/**
 * Extract token data from OKX swap response
 * Handles different field name formats from OKX API v5 and v6
 */
export function extractSwapTokenData(
  swapData: unknown,
  fromAmount: string
): ExtractedTokenData {
  const record = swapData as Record<string, unknown>;

  // Handle different field names for token info
  const fromTokenData = (record.fromToken ||
    record.fromTokenInfo ||
    {}) as Record<string, unknown>;
  const toTokenData = (record.toToken ||
    record.toTokenInfo ||
    {}) as Record<string, unknown>;

  // Extract decimals
  const fromDecimals = parseInt((fromTokenData.decimal as string) || '18');
  const toDecimals = parseInt((toTokenData.decimal as string) || '18');

  // Extract symbols
  const fromSymbol = (fromTokenData.tokenSymbol as string) || 'UNKNOWN';
  const toSymbol = (toTokenData.tokenSymbol as string) || 'UNKNOWN';

  // Extract amounts
  const toAmount = (record.toTokenAmount || record.toAmount || '0') as string;

  // Calculate or extract exchange rate
  let exchangeRate = (record.exchangeRate || record.price || '0') as string;
  if (exchangeRate === '0' && parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0) {
    const fromAmountFloat = parseFloat(fromAmount) / Math.pow(10, fromDecimals);
    const toAmountFloat = parseFloat(toAmount) / Math.pow(10, toDecimals);
    exchangeRate = (toAmountFloat / fromAmountFloat).toString();
  }

  // Extract other fields
  const priceImpact = (record.priceImpactPercentage as string) || '0';
  const estimatedGas = (record.estimateGasFee as string) || '0';

  return {
    fromDecimals,
    toDecimals,
    fromSymbol,
    toSymbol,
    toAmount,
    exchangeRate,
    priceImpact,
    estimatedGas,
  };
}

/**
 * Extract transaction data from OKX swap response
 * Handles different field name formats
 */
export function extractTransactionData(swapData: unknown): {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
} | null {
  const record = swapData as Record<string, unknown>;

  // Try different field names for transaction data
  const txData = (record.tx ||
    record.transaction ||
    record.txData ||
    record.routerResult ||
    null) as Record<string, unknown> | null;

  if (!txData) {
    return null;
  }

  return {
    to: (txData.to as string) || '',
    data: (txData.data as string) || '',
    value: (txData.value as string) || '0',
    gasLimit: (txData.gas as string) || (txData.gasLimit as string) || '',
  };
}

/**
 * Convert human-readable amount to base units
 * @param amount - Human-readable amount (e.g., "10.5")
 * @param decimals - Token decimals
 * @returns Amount in base units as string
 */
export function toBaseUnits(amount: string | number, decimals: number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(numAmount * Math.pow(10, decimals)).toString();
}

/**
 * Convert base units to human-readable amount
 * @param amount - Amount in base units
 * @param decimals - Token decimals
 * @returns Human-readable amount as string
 */
export function fromBaseUnits(amount: string | bigint, decimals: number): string {
  const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const intPart = bigAmount / divisor;
  const fracPart = bigAmount % divisor;

  // Format with proper decimal places
  const fracStr = fracPart.toString().padStart(decimals, '0');
  return `${intPart}.${fracStr}`.replace(/\.?0+$/, '') || '0';
}

/**
 * Format token amount for display
 * @param amount - Amount in base units
 * @param decimals - Token decimals
 * @param maxDecimals - Maximum decimal places to show (default: 6)
 */
export function formatTokenAmount(
  amount: string | bigint,
  decimals: number,
  maxDecimals: number = 6
): string {
  const readable = fromBaseUnits(amount, decimals);
  const num = parseFloat(readable);
  return num.toFixed(Math.min(decimals, maxDecimals));
}
