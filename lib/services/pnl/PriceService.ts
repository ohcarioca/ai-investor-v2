/**
 * Price Service
 * Fetches real-time SIERRA/USDC price from OKX DEX
 */

import { getQuoteFetcher } from '../transaction/QuoteFetcher';

// Fallback rate from environment
const FALLBACK_SIERRA_RATE = parseFloat(
  process.env.NEXT_PUBLIC_SIERRA_USDC_RATE || '1.005814'
);

// Cache for price to avoid excessive API calls
interface PriceCache {
  price: number;
  timestamp: number;
  chainId: number;
}

let priceCache: PriceCache | null = null;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get current SIERRA price in USDC from OKX DEX
 * @param chainId Chain ID (1 for Ethereum, 43114 for Avalanche)
 * @returns Price per SIERRA in USDC
 */
export async function getSierraPrice(chainId: number = 1): Promise<number> {
  // Check cache first
  if (
    priceCache &&
    priceCache.chainId === chainId &&
    Date.now() - priceCache.timestamp < CACHE_TTL_MS
  ) {
    console.log('[PriceService] Using cached price:', priceCache.price);
    return priceCache.price;
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

      // Update cache
      priceCache = {
        price,
        timestamp: Date.now(),
        chainId,
      };

      return price;
    }

    console.warn('[PriceService] Quote failed, using fallback:', result.error);
    return FALLBACK_SIERRA_RATE;
  } catch (error) {
    console.error('[PriceService] Error fetching price:', error);
    return FALLBACK_SIERRA_RATE;
  }
}

/**
 * Get cached price if available, otherwise fetch fresh
 * Useful for UI that needs immediate response
 */
export function getCachedSierraPrice(): number | null {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
    return priceCache.price;
  }
  return null;
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache = null;
}

/**
 * Get fallback price from environment
 */
export function getFallbackSierraPrice(): number {
  return FALLBACK_SIERRA_RATE;
}
