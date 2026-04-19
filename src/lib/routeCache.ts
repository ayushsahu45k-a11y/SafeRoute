interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return;
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheKey(prefix: string, ...params: (string | number | boolean)[]): string {
  return `${prefix}:${params.join(':')}`;
}

export function generateRouteCacheKey(start: [number, number], end: [number, number], profile: string): string {
  return getCacheKey('route', start.join(','), end.join(','), profile);
}

export function generateGeocodeCacheKey(query: string): string {
  return getCacheKey('geocode', query.toLowerCase().trim());
}

export function generateWeatherCacheKey(lat: number, lon: number): string {
  return getCacheKey('weather', lat.toFixed(3), lon.toFixed(3));
}
