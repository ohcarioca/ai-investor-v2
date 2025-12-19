/**
 * Bridge Types
 * Types for Solana-to-EVM USDC bridge operations
 */

/**
 * Result of Solana transaction verification
 */
export interface SolanaVerificationResult {
  isValid: boolean;
  error?: string;
  details?: {
    signature: string;
    slot: number;
    blockTime: number;
    from: string;
    to: string;
    amount: number; // USDC amount (human-readable, 6 decimals already applied)
    tokenMint: string;
    confirmationStatus: 'confirmed' | 'finalized';
  };
}

/**
 * Parameters for EVM USDC transfer
 */
export interface EVMTransferParams {
  /** Target wallet address (0x...) */
  targetWallet: string;
  /** Target network */
  networkTarget: 'ETH' | 'AVAX';
  /** USDC amount to send (human-readable) */
  amountUsdc: number;
}

/**
 * Result of EVM transfer execution
 */
export interface EVMTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: bigint;
  blockNumber?: number;
}

/**
 * Complete bridge operation result
 */
export interface BridgeResult {
  success: boolean;
  /** Solana transaction verification result */
  solanaVerification: SolanaVerificationResult;
  /** EVM transfer result (only present if Solana verification passed) */
  evmTransfer?: EVMTransferResult;
  /** Error message if operation failed */
  error?: string;
  /** Timestamp of operation */
  timestamp: string;
}

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  /** Minimum USDC amount allowed */
  minAmountUsdc: number;
  /** Maximum USDC amount allowed */
  maxAmountUsdc: number;
  /** Required confirmation level for Solana tx */
  confirmationRequired: 'confirmed' | 'finalized';
}
