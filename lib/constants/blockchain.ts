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
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

export const SUPPORTED_CHAIN_IDS = [CHAIN_IDS.ETHEREUM, CHAIN_IDS.AVALANCHE] as const;

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
  [CHAIN_IDS.ETHEREUM]: '0xF6801D319497789f934ec7F83E142a9536312B08',
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
};

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
    default:
      return 'Unknown';
  }
}

/**
 * Check if an address is the native token placeholder
 */
export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}
