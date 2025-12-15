/**
 * Token Registry Service
 * Centralized management of token addresses and decimals
 * Supports multiple chains (Ethereum and Avalanche)
 */

export type TokenSymbol = 'AVAX' | 'USDC' | 'SIERRA' | 'ETH';

export interface TokenConfig {
  symbol: TokenSymbol;
  address: string;
  decimals: number;
  isNative: boolean;
  name: string;
}

// Chain IDs
export const CHAIN_IDS = {
  ETHEREUM: 1,
  AVALANCHE: 43114,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

// Native token placeholder address
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Token configurations by chain
const TOKENS_BY_CHAIN: Record<number, Map<TokenSymbol, TokenConfig>> = {
  // Ethereum Mainnet (1)
  [CHAIN_IDS.ETHEREUM]: new Map([
    [
      'ETH',
      {
        symbol: 'ETH',
        address: NATIVE_TOKEN_ADDRESS,
        decimals: 18,
        isNative: true,
        name: 'Ethereum',
      },
    ],
    [
      'USDC',
      {
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        isNative: false,
        name: 'USD Coin',
      },
    ],
    [
      'SIERRA',
      {
        symbol: 'SIERRA',
        address: '0x6bf7788EAA948d9fFBA7E9bb386E2D3c9810e0fc',
        decimals: 6,
        isNative: false,
        name: 'Sierra Token',
      },
    ],
  ]),
  // Avalanche C-Chain (43114)
  [CHAIN_IDS.AVALANCHE]: new Map([
    [
      'AVAX',
      {
        symbol: 'AVAX',
        address: NATIVE_TOKEN_ADDRESS,
        decimals: 18,
        isNative: true,
        name: 'Avalanche',
      },
    ],
    [
      'USDC',
      {
        symbol: 'USDC',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        isNative: false,
        name: 'USD Coin',
      },
    ],
    [
      'SIERRA',
      {
        symbol: 'SIERRA',
        address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
        decimals: 6,
        isNative: false,
        name: 'Sierra Token',
      },
    ],
  ]),
};

/**
 * Registry of supported tokens across multiple chains
 */
class TokenRegistryService {
  private readonly defaultChainId: number = CHAIN_IDS.ETHEREUM;

  /**
   * Get tokens map for a specific chain
   */
  private getTokensForChain(chainId: number): Map<TokenSymbol, TokenConfig> {
    const tokens = TOKENS_BY_CHAIN[chainId];
    if (!tokens) {
      // Fallback to Ethereum if chain not supported
      return TOKENS_BY_CHAIN[this.defaultChainId];
    }
    return tokens;
  }

  /**
   * Get token address by symbol and chain
   * @throws Error if token not found
   */
  getAddress(symbol: string, chainId: number = this.defaultChainId): string {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const tokens = this.getTokensForChain(chainId);
    const token = tokens.get(upperSymbol);
    if (!token) {
      throw new Error(`Unknown token: ${symbol} on chain ${chainId}`);
    }
    return token.address;
  }

  /**
   * Get token decimals by symbol and chain
   * @throws Error if token not found
   */
  getDecimals(symbol: string, chainId: number = this.defaultChainId): number {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const tokens = this.getTokensForChain(chainId);
    const token = tokens.get(upperSymbol);
    if (!token) {
      throw new Error(`Unknown token decimals: ${symbol} on chain ${chainId}`);
    }
    return token.decimals;
  }

  /**
   * Check if token is native (ETH on Ethereum, AVAX on Avalanche)
   */
  isNative(symbol: string, chainId: number = this.defaultChainId): boolean {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const tokens = this.getTokensForChain(chainId);
    const token = tokens.get(upperSymbol);
    return token?.isNative ?? false;
  }

  /**
   * Get full token config
   */
  getToken(symbol: string, chainId: number = this.defaultChainId): TokenConfig | undefined {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const tokens = this.getTokensForChain(chainId);
    return tokens.get(upperSymbol);
  }

  /**
   * Check if token is supported on a specific chain
   */
  isSupported(symbol: string, chainId: number = this.defaultChainId): boolean {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const tokens = this.getTokensForChain(chainId);
    return tokens.has(upperSymbol);
  }

  /**
   * Get all supported token symbols for a chain
   */
  getSupportedSymbols(chainId: number = this.defaultChainId): TokenSymbol[] {
    const tokens = this.getTokensForChain(chainId);
    return Array.from(tokens.keys());
  }

  /**
   * Get all token configs for a chain
   */
  getAllTokens(chainId: number = this.defaultChainId): TokenConfig[] {
    const tokens = this.getTokensForChain(chainId);
    return Array.from(tokens.values());
  }

  /**
   * Check if token is a low liquidity token (for slippage calculation)
   */
  isLowLiquidity(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    // SIERRA has low liquidity on both chains
    return upperSymbol === 'SIERRA';
  }

  /**
   * Get recommended slippage for a token pair
   * Returns slippage as percentage (e.g., 0.5 for 0.5%, 10 for 10%)
   */
  getRecommendedSlippage(fromToken: string, toToken: string): number {
    // If either token is low liquidity, use high slippage
    if (this.isLowLiquidity(fromToken) || this.isLowLiquidity(toToken)) {
      return 10.0; // 10% for SIERRA swaps
    }
    return 0.5; // 0.5% default
  }

  /**
   * Convert human-readable amount to base units (with decimals)
   */
  toBaseUnits(symbol: string, amount: string | number, chainId: number = this.defaultChainId): bigint {
    const decimals = this.getDecimals(symbol, chainId);
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return BigInt(Math.floor(numAmount * 10 ** decimals));
  }

  /**
   * Convert base units to human-readable amount
   */
  fromBaseUnits(symbol: string, amount: string | bigint, chainId: number = this.defaultChainId): string {
    const decimals = this.getDecimals(symbol, chainId);
    const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const intPart = bigAmount / divisor;
    const fracPart = bigAmount % divisor;

    // Format with proper decimal places
    const fracStr = fracPart.toString().padStart(decimals, '0');
    return `${intPart}.${fracStr}`.replace(/\.?0+$/, '') || '0';
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: number): boolean {
    return chainId in TOKENS_BY_CHAIN;
  }

  /**
   * Get all supported chain IDs
   */
  getSupportedChainIds(): number[] {
    return Object.keys(TOKENS_BY_CHAIN).map(Number);
  }

  /**
   * Get native token symbol for a chain
   */
  getNativeTokenSymbol(chainId: number): TokenSymbol {
    if (chainId === CHAIN_IDS.ETHEREUM) {
      return 'ETH';
    }
    return 'AVAX';
  }
}

// Singleton instance
export const TokenRegistry = new TokenRegistryService();

// Convenience functions for backwards compatibility
export const getTokenAddress = (symbol: string, chainId?: number): string =>
  TokenRegistry.getAddress(symbol, chainId);
export const getTokenDecimals = (symbol: string, chainId?: number): number =>
  TokenRegistry.getDecimals(symbol, chainId);
