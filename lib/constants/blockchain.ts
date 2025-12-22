/**
 * Blockchain Constants
 * Centralized configuration for all blockchain-related constants
 */

import { avalanche, mainnet } from 'viem/chains';
import type { Chain } from 'viem';

// =============================================================================
// CHAIN IDS
// =============================================================================

export const CHAIN_IDS = {
  ETHEREUM: 1,
  AVALANCHE: 43114,
  BASE: 8453,
  SOLANA: 101,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

export const SUPPORTED_CHAIN_IDS = [
  CHAIN_IDS.ETHEREUM,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.SOLANA,
] as const;

// =============================================================================
// VIEM CHAIN CONFIGURATIONS
// =============================================================================

export const VIEM_CHAINS: Record<number, Chain> = {
  [CHAIN_IDS.ETHEREUM]: mainnet,
  [CHAIN_IDS.AVALANCHE]: avalanche,
};

// =============================================================================
// TOKEN ADDRESSES
// =============================================================================

/**
 * Native token placeholder address used by DEX aggregators
 * Represents ETH on Ethereum, AVAX on Avalanche, etc.
 */
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Native token symbol by chain
 */
export const NATIVE_SYMBOLS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: 'ETH',
  [CHAIN_IDS.AVALANCHE]: 'AVAX',
};

// =============================================================================
// OKX DEX CONFIGURATION
// =============================================================================

/**
 * OKX DEX router addresses per chain
 * These are the actual OKX DEX aggregator routers that will be used for swaps
 */
export const OKX_ROUTERS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: '0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f',
  [CHAIN_IDS.AVALANCHE]: '0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f',
};

/**
 * Chain ID mapping for OKX DEX API
 * Maps numeric chain IDs to OKX's chainIndex parameter
 */
export const CHAIN_INDEX_MAP: Record<number, string> = {
  [CHAIN_IDS.AVALANCHE]: '43114',
  [CHAIN_IDS.ETHEREUM]: '1',
  [CHAIN_IDS.BASE]: '8453',
};

// =============================================================================
// BLOCK EXPLORERS
// =============================================================================

export interface BlockExplorerConfig {
  name: string;
  url: string;
}

export const BLOCK_EXPLORERS: Record<number, BlockExplorerConfig> = {
  [CHAIN_IDS.ETHEREUM]: {
    name: 'Etherscan',
    url: 'https://etherscan.io',
  },
  [CHAIN_IDS.AVALANCHE]: {
    name: 'Snowtrace',
    url: 'https://snowtrace.io',
  },
  [CHAIN_IDS.SOLANA]: {
    name: 'Solscan',
    url: 'https://solscan.io',
  },
};

// =============================================================================
// SOLANA CONSTANTS
// =============================================================================

/**
 * Solana USDC token mint address (SPL Token)
 */
export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Solana deposit wallet for investment transfers
 * Users send USDC here when investing from Solana
 */
export const SOLANA_DEPOSIT_WALLET =
  process.env.NEXT_PUBLIC_SOLANA_DEPOSIT_WALLET || '5Ki6rhVbWxmsLYxhNRT32ePPCUZwtuN7XZN16Dv7aXzg';

/**
 * Solana RPC endpoint
 */
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

/**
 * Webhook URL for Solana investment notifications
 */
export const SOLANA_WEBHOOK_URL = 'https://n8n.balampay.com/webhook/new_wallet';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the block explorer URL for a transaction
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const explorer = BLOCK_EXPLORERS[chainId];
  if (!explorer) {
    return `https://etherscan.io/tx/${txHash}`; // Default to Etherscan
  }
  return `${explorer.url}/tx/${txHash}`;
}

/**
 * Get the block explorer name for a chain
 */
export function getExplorerName(chainId: number): string {
  return BLOCK_EXPLORERS[chainId]?.name || 'Explorer';
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in VIEM_CHAINS;
}

/**
 * Get the native token symbol for a chain
 */
export function getNativeSymbol(chainId: number): string {
  return NATIVE_SYMBOLS[chainId] || 'ETH';
}

/**
 * Get the chain name for display
 */
export function getChainName(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.ETHEREUM:
      return 'Ethereum';
    case CHAIN_IDS.AVALANCHE:
      return 'Avalanche';
    case CHAIN_IDS.BASE:
      return 'Base';
    case CHAIN_IDS.SOLANA:
      return 'Solana';
    default:
      return 'Unknown';
  }
}

/**
 * Check if the chain is Solana
 */
export function isSolanaChain(chainId: number): boolean {
  return chainId === CHAIN_IDS.SOLANA;
}

/**
 * Get Solscan URL for a transaction
 */
export function getSolscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

/**
 * Check if an address is the native token placeholder
 */
export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

// =============================================================================
// BRIDGE CONFIGURATION
// =============================================================================

/**
 * EVM USDC contract addresses by chain ID
 */
export const EVM_USDC_ADDRESSES: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [CHAIN_IDS.AVALANCHE]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
};

/**
 * Map network target string to chain ID
 */
export const NETWORK_TARGET_TO_CHAIN_ID: Record<'ETH' | 'AVAX', number> = {
  ETH: CHAIN_IDS.ETHEREUM,
  AVAX: CHAIN_IDS.AVALANCHE,
};

/**
 * Bridge configuration constants
 */
export const BRIDGE_CONFIG = {
  /** Minimum USDC amount for bridge transfer */
  MIN_AMOUNT_USDC: 0.01,
  /** Maximum USDC amount for bridge transfer */
  MAX_AMOUNT_USDC: 10000,
  /** Required confirmation level for Solana transactions */
  CONFIRMATION_REQUIRED: 'confirmed' as const,
};
