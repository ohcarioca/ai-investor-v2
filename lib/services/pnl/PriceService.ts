/**
 * Price Service
 * Fetches real-time SIERRA/USDC price from OKX DEX
 *
 * Uses persistent cache - keeps last known price indefinitely
 * Only updates when OKX returns a successful quote
 */

import { getQuoteFetcher } from '../transaction/QuoteFetcher';

// Cache for price - persists until successfully updated
interface PriceCache {
  price: number;
  timestamp: number;
  chainId: number;
}

// Separate caches per chain - persist last known prices
const priceCacheByChain: Map<number, PriceCache> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute before attempting fresh fetch

/**
 * Get current SIERRA price in USDC from OKX DEX
 * @param chainId Chain ID (1 for Ethereum, 43114 for Avalanche)
 * @returns Price per SIERRA in USDC
 * @throws Error if no price available (no cache and OKX fails)
 */
export async function getSierraPrice(chainId: number = 1): Promise<number> {
  const cachedPrice = priceCacheByChain.get(chainId);

  // Check if cache is fresh (within TTL)
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_TTL_MS) {
    console.log('[PriceService] Using cached price:', cachedPrice.price);
    return cachedPrice.price;
  }

  try {
    const quoteFetcher = getQuoteFetcher();

    // Get quote for 1 SIERRA → USDC
    const result = await quoteFetcher.getQuoteBySymbols({
      fromToken: 'SIERRA',
      toToken: 'USDC',
      amount: '1', // 1 SIERRA
      chainId,
    });

    if (result.success && result.quote) {
      // exchangeRate is how many USDC you get for 1 SIERRA
      const price = parseFloat(result.quote.exchangeRate);

      console.log('[PriceService] Fetched SIERRA price from OKX:', {
        price,
        chainId,
        priceImpact: result.quote.priceImpact,
      });

      // Update cache for this chain
      priceCacheByChain.set(chainId, {
        price,
        timestamp: Date.now(),
        chainId,
      });

      return price;
    }

    // Quote failed - use last known price if available
    if (cachedPrice) {
      console.warn('[PriceService] Quote failed, using last known price:', cachedPrice.price);
      return cachedPrice.price;
    }

    throw new Error(`Failed to get SIERRA price: ${result.error || 'Unknown error'}`);
  } catch (error) {
    // Error fetching - use last known price if available
    if (cachedPrice) {
      console.warn('[PriceService] Error fetching price, using last known:', cachedPrice.price);
      return cachedPrice.price;
    }

    console.error('[PriceService] Error fetching price and no cache available:', error);
    throw error;
  }
}

/**
 * Get cached price if available (any age)
 * Useful for UI that needs immediate response
 * @param chainId Chain ID (1 for Ethereum, 43114 for Avalanche)
 */
export function getCachedSierraPrice(chainId: number = 1): number | null {
  const cached = priceCacheByChain.get(chainId);
  return cached?.price ?? null;
}

/**
 * Get last known price - returns cached price regardless of age
 * Falls back to fetching if no cache exists
 * @param chainId Chain ID (1 for Ethereum, 43114 for Avalanche)
 */
export async function getLastKnownSierraPrice(chainId: number = 1): Promise<number> {
  const cached = priceCacheByChain.get(chainId);
  if (cached) {
    return cached.price;
  }
  // No cache - must fetch
  return getSierraPrice(chainId);
}

/**
 * Clear the price cache for a specific chain or all chains
 * @param chainId Optional chain ID to clear, or all if not provided
 */
export function clearPriceCache(chainId?: number): void {
  if (chainId !== undefined) {
    priceCacheByChain.delete(chainId);
  } else {
    priceCacheByChain.clear();
  }
}

/**
 * Check if we have any cached price for a chain
 * @param chainId Chain ID
 */
export function hasCachedPrice(chainId: number = 1): boolean {
  return priceCacheByChain.has(chainId);
}
