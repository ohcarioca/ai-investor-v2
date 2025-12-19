/**
 * Solana Investment Types
 * Types for Solana-to-EVM investment flow
 */

/**
 * Data returned by confirm_solana_invest tool
 * Used by frontend to sign and send the transaction
 */
export interface SolanaInvestData {
  /** Flag to distinguish from EVM SwapData */
  isSolana: true;
  /** Base64 encoded serialized transaction */
  serializedTransaction: string;
  /** Fixed deposit wallet address */
  depositWallet: string;
  /** USDC amount to invest */
  amount: string;
  /** Target EVM wallet address (0x...) */
  targetWallet: string;
  /** Target network for receiving funds */
  targetNetwork: 'ETH' | 'AVAX';
}

/**
 * Webhook payload sent after successful Solana investment
 */
export interface SolanaWebhookPayload {
  /** User's Solana wallet address */
  wallet_solana: string;
  /** Target EVM wallet address */
  wallet_target: string;
  /** Target network */
  network_target: 'ETH' | 'AVAX';
  /** Amount in USDC */
  amount_usdc: number;
  /** Solana transaction signature */
  tx_hash: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * State for Solana investment flow
 */
export type SolanaInvestStep =
  | 'idle'
  | 'signing'
  | 'confirming'
  | 'sending-webhook'
  | 'success'
  | 'error';

export interface SolanaInvestState {
  step: SolanaInvestStep;
  error: string | null;
  txSignature: string | null;
}

/**
 * API response for webhook endpoint
 */
export interface SolanaWebhookResponse {
  success: boolean;
  error?: string;
}
