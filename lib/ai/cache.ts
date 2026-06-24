import "server-only";

interface CacheEntry {
  result: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const TTL = 1000 * 60 * 60; // 1 hour default

export function aiCacheGet(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function aiCacheSet(key: string, result: string, ttl = TTL): void {
  cache.set(key, { result, expiresAt: Date.now() + ttl });
}

export function aiCacheKey(...parts: string[]): string {
  return parts.join("::");
}
