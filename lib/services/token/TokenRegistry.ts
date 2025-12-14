/**
 * Token Registry Service
 * Centralized management of token addresses and decimals
 * Replaces duplicated getTokenAddress/getTokenDecimals functions
 */

export type TokenSymbol = 'AVAX' | 'USDC' | 'SIERRA';

export interface TokenConfig {
  symbol: TokenSymbol;
  address: string;
  decimals: number;
  isNative: boolean;
  name: string;
}

/**
 * Registry of supported tokens on Avalanche C-Chain
 */
class TokenRegistryService {
  private readonly tokens: Map<TokenSymbol, TokenConfig>;

  constructor() {
    this.tokens = new Map([
      ['AVAX', {
        symbol: 'AVAX',
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        decimals: 18,
        isNative: true,
        name: 'Avalanche',
      }],
      ['USDC', {
        symbol: 'USDC',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        isNative: false,
        name: 'USD Coin',
      }],
      ['SIERRA', {
        symbol: 'SIERRA',
        address: '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
        decimals: 6,
        isNative: false,
        name: 'Sierra Token',
      }],
    ]);
  }

  /**
   * Get token address by symbol
   * @throws Error if token not found
   */
  getAddress(symbol: string): string {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const token = this.tokens.get(upperSymbol);
    if (!token) {
      throw new Error(`Unknown token: ${symbol}`);
    }
    return token.address;
  }

  /**
   * Get token decimals by symbol
   * @throws Error if token not found
   */
  getDecimals(symbol: string): number {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const token = this.tokens.get(upperSymbol);
    if (!token) {
      throw new Error(`Unknown token decimals: ${symbol}`);
    }
    return token.decimals;
  }

  /**
   * Check if token is native (AVAX)
   */
  isNative(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    const token = this.tokens.get(upperSymbol);
    return token?.isNative ?? false;
  }

  /**
   * Get full token config
   */
  getToken(symbol: string): TokenConfig | undefined {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    return this.tokens.get(upperSymbol);
  }

  /**
   * Check if token is supported
   */
  isSupported(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase() as TokenSymbol;
    return this.tokens.has(upperSymbol);
  }

  /**
   * Get all supported token symbols
   */
  getSupportedSymbols(): TokenSymbol[] {
    return Array.from(this.tokens.keys());
  }

  /**
   * Get all token configs
   */
  getAllTokens(): TokenConfig[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Check if token is a low liquidity token (for slippage calculation)
   */
  isLowLiquidity(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    // SIERRA has low liquidity
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
  toBaseUnits(symbol: string, amount: string | number): bigint {
    const decimals = this.getDecimals(symbol);
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return BigInt(Math.floor(numAmount * (10 ** decimals)));
  }

  /**
   * Convert base units to human-readable amount
   */
  fromBaseUnits(symbol: string, amount: string | bigint): string {
    const decimals = this.getDecimals(symbol);
    const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const intPart = bigAmount / divisor;
    const fracPart = bigAmount % divisor;

    // Format with proper decimal places
    const fracStr = fracPart.toString().padStart(decimals, '0');
    return `${intPart}.${fracStr}`.replace(/\.?0+$/, '') || '0';
  }
}

// Singleton instance
export const TokenRegistry = new TokenRegistryService();

// Convenience functions for backwards compatibility
export const getTokenAddress = (symbol: string): string => TokenRegistry.getAddress(symbol);
export const getTokenDecimals = (symbol: string): number => TokenRegistry.getDecimals(symbol);
