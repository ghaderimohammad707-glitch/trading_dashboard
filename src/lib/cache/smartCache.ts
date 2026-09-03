/**
 * Smart Cache with Dynamic TTL
 * Handles caching with different expiration times based on data type
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

type CacheKeyType = 'price' | 'depth' | 'historical' | 'base' | 'news' | 'ai';

const TTL_CONFIG: Record<CacheKeyType, number> = {
  price: 5000,        // 5 seconds for live prices
  depth: 10000,       // 10 seconds for order book
  historical: 60000,  // 1 minute for OHLC
  base: 3600000,      // 1 hour for base info
  news: 300000,       // 5 minutes for news
  ai: 60000,          // 1 minute for AI context
};

class SmartCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string, type: CacheKeyType): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, type: CacheKeyType): void {
    const ttl = TTL_CONFIG[type];
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Check if data is stale
  isStale(key: string, type: CacheKeyType): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Consider stale if older than 80% of TTL
    return age > (entry.ttl * 0.8);
  }

  getMetadata(key: string, type: CacheKeyType) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;
    const remaining = entry.ttl - age;

    return {
      age,
      remainingTTL: Math.max(0, remaining),
      isStale: this.isStale(key, type),
      timestamp: entry.timestamp,
    };
  }
}

export const smartCache = new SmartCache();
export type { CacheKeyType };
