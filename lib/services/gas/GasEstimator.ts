/**
 * GasEstimator Service
 *
 * Provides dynamic gas margin calculations based on operation type.
 * Reduces wasted gas for simple operations while maintaining safety margins
 * for complex operations.
 */

import type { OperationType, GasMarginConfig, GasEstimatorResult } from '@/types/gas';

// Default gas margins by operation type
const DEFAULT_GAS_MARGINS: GasMarginConfig = {
  approval: 1.15, // 15% margin - simple, predictable operation
  simple_swap: 1.25, // 25% margin - direct ETH <-> token swap
  standard_swap: 1.35, // 35% margin - ERC20 <-> ERC20 swap
  complex_swap: 1.5, // 50% margin - SIERRA or complex routing
};

// Tokens that require higher gas margins due to complexity
const COMPLEX_TOKENS = ['SIERRA'];

// Native token addresses (don't need approval, simpler swaps)
const NATIVE_TOKEN_ADDRESSES = [
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Standard native address
  '0x0000000000000000000000000000000000000000', // Zero address
];

// Default fallback gas limits by operation type
const DEFAULT_GAS_LIMITS: Record<OperationType, bigint> = {
  approval: BigInt(50000),
  simple_swap: BigInt(150000),
  standard_swap: BigInt(250000),
  complex_swap: BigInt(400000),
};

export class GasEstimator {
  private margins: GasMarginConfig;
  private complexTokens: string[];

  constructor(
    margins: GasMarginConfig = DEFAULT_GAS_MARGINS,
    complexTokens: string[] = COMPLEX_TOKENS
  ) {
    this.margins = margins;
    this.complexTokens = complexTokens.map((t) => t.toUpperCase());
  }

  /**
   * Check if a token is considered complex (requires higher gas margin)
   */
  isComplexToken(tokenSymbol: string): boolean {
    return this.complexTokens.includes(tokenSymbol.toUpperCase());
  }

  /**
   * Check if an address is a native token (ETH/AVAX)
   */
  isNativeToken(address: string): boolean {
    return (
      NATIVE_TOKEN_ADDRESSES.includes(address.toLowerCase()) ||
      NATIVE_TOKEN_ADDRESSES.includes(address)
    );
  }

  /**
   * Determine the operation type based on tokens involved
   */
  getOperationType(
    fromTokenSymbol: string,
    toTokenSymbol: string,
    fromTokenAddress?: string,
    toTokenAddress?: string,
    isApproval: boolean = false
  ): OperationType {
    // Approval is always a simple operation
    if (isApproval) {
      return 'approval';
    }

    // Check for complex tokens (SIERRA)
    if (this.isComplexToken(fromTokenSymbol) || this.isComplexToken(toTokenSymbol)) {
      return 'complex_swap';
    }

    // Check if either token is native
    const fromIsNative = fromTokenAddress && this.isNativeToken(fromTokenAddress);
    const toIsNative = toTokenAddress && this.isNativeToken(toTokenAddress);

    // Simple swap: involves native token
    if (fromIsNative || toIsNative) {
      return 'simple_swap';
    }

    // Standard swap: ERC20 <-> ERC20
    return 'standard_swap';
  }

  /**
   * Get the gas margin multiplier for an operation type
   */
  getMargin(operationType: OperationType): number {
    return this.margins[operationType] || DEFAULT_GAS_MARGINS.standard_swap;
  }

  /**
   * Get the gas margin for a specific swap based on tokens
   */
  getMarginForSwap(
    fromTokenSymbol: string,
    toTokenSymbol: string,
    fromTokenAddress?: string,
    toTokenAddress?: string
  ): number {
    const operationType = this.getOperationType(
      fromTokenSymbol,
      toTokenSymbol,
      fromTokenAddress,
      toTokenAddress
    );
    return this.getMargin(operationType);
  }

  /**
   * Calculate gas limit with appropriate margin
   */
  estimateGasWithMargin(
    baseGasLimit: bigint | string | number,
    operationType: OperationType
  ): GasEstimatorResult {
    const baseGas = BigInt(baseGasLimit);
    const margin = this.getMargin(operationType);
    const gasWithMargin = BigInt(Math.floor(Number(baseGas) * margin));

    return {
      gasLimit: gasWithMargin,
      margin,
      operationType,
    };
  }

  /**
   * Estimate gas for a swap transaction
   */
  estimateSwapGas(
    baseGasLimit: bigint | string | number | undefined,
    fromTokenSymbol: string,
    toTokenSymbol: string,
    fromTokenAddress?: string,
    toTokenAddress?: string
  ): GasEstimatorResult {
    const operationType = this.getOperationType(
      fromTokenSymbol,
      toTokenSymbol,
      fromTokenAddress,
      toTokenAddress
    );

    // Use provided gas limit or fallback
    const baseGas = baseGasLimit ? BigInt(baseGasLimit) : DEFAULT_GAS_LIMITS[operationType];

    return this.estimateGasWithMargin(baseGas, operationType);
  }

  /**
   * Estimate gas for an approval transaction
   */
  estimateApprovalGas(baseGasLimit?: bigint | string | number): GasEstimatorResult {
    const baseGas = baseGasLimit ? BigInt(baseGasLimit) : DEFAULT_GAS_LIMITS.approval;

    return this.estimateGasWithMargin(baseGas, 'approval');
  }

  /**
   * Get default fallback gas limit for an operation type
   */
  getDefaultGasLimit(operationType: OperationType): bigint {
    return DEFAULT_GAS_LIMITS[operationType];
  }

  /**
   * Update margins configuration
   */
  updateMargins(newMargins: Partial<GasMarginConfig>): void {
    this.margins = { ...this.margins, ...newMargins };
  }

  /**
   * Add a complex token to the list
   */
  addComplexToken(tokenSymbol: string): void {
    const symbol = tokenSymbol.toUpperCase();
    if (!this.complexTokens.includes(symbol)) {
      this.complexTokens.push(symbol);
    }
  }
}

// Singleton instance for global use
let gasEstimatorInstance: GasEstimator | null = null;

export function getGasEstimator(margins?: GasMarginConfig, complexTokens?: string[]): GasEstimator {
  if (!gasEstimatorInstance) {
    gasEstimatorInstance = new GasEstimator(margins, complexTokens);
  }
  return gasEstimatorInstance;
}

// Export default margins for reference
export { DEFAULT_GAS_MARGINS, COMPLEX_TOKENS, DEFAULT_GAS_LIMITS };
