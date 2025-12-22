/**
 * Cache Layer
 * Simple in-memory cache for API responses
 * For production, consider using Redis for distributed caching
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * Generic in-memory cache with TTL support
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(options: { maxSize?: number; defaultTtl?: number } = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 60000; // 1 minute default
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = ttlMs ?? this.defaultTtl;
    const now = Date.now();

    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
      createdAt: now,
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    this.stats.size = this.cache.size;
    return pruned;
  }

  /**
   * Evict oldest entries to make room for new ones
   */
  private evictOldest(): void {
    const entriesToEvict = Math.ceil(this.maxSize * 0.1); // Evict 10%
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
      .slice(0, entriesToEvict);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and store
   */
  async getOrSet(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }
}

// Pre-configured caches for different data types

/**
 * Cache for swap quotes
 * Short TTL because prices change frequently
 */
export const quoteCache = new SimpleCache<unknown>({
  maxSize: 500,
  defaultTtl: 10000, // 10 seconds
});

/**
 * Cache for wallet balances
 * Medium TTL - balances don't change super frequently
 */
export const balanceCache = new SimpleCache<unknown>({
  maxSize: 200,
  defaultTtl: 30000, // 30 seconds
});

/**
 * Cache for token prices
 * Medium TTL
 */
export const priceCache = new SimpleCache<unknown>({
  maxSize: 100,
  defaultTtl: 60000, // 1 minute
});

/**
 * Cache for token metadata (decimals, symbols, etc.)
 * Long TTL - this data rarely changes
 */
export const tokenMetadataCache = new SimpleCache<unknown>({
  maxSize: 50,
  defaultTtl: 3600000, // 1 hour
});

/**
 * Cache for PNL calculations
 * Longer TTL - only invalidated on transactions or manual refresh
 * Key format: pnl:{walletAddress}:{chainId}
 */
export const pnlCache = new SimpleCache<unknown>({
  maxSize: 100,
  defaultTtl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Generate a cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

/**
 * Periodic cache cleanup
 * Call this periodically to remove expired entries
 */
export function cleanupAllCaches(): void {
  quoteCache.prune();
  balanceCache.prune();
  priceCache.prune();
  tokenMetadataCache.prune();
  pnlCache.prune();
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupAllCaches, 5 * 60 * 1000);
}
