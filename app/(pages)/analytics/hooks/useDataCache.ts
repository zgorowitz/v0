import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
}

// In-memory cache
const cache = new Map<string, CacheEntry<any>>();

export const useDataCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: CacheOptions = {}
) => {
  const { ttl = 5 * 60 * 1000 } = options; // Default 5 minutes
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Check cache
      const cached = cache.get(key);
      const now = Date.now();

      if (cached && now - cached.timestamp < ttl) {
        console.log(`[Cache HIT] ${key}`);
        setData(cached.data);
        setLoading(false);
        return;
      }

      // Cache miss or expired - fetch fresh data
      console.log(`[Cache MISS] ${key}`);
      const freshData = await fetcher();

      if (isMountedRef.current) {
        // Update cache
        cache.set(key, {
          data: freshData,
          timestamp: now,
        });

        setData(freshData);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        setLoading(false);
      }
    }
  }, [key, fetcher, ttl]);

  // Fetch data when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [key, ...dependencies]);

  // Invalidate cache entry
  const invalidate = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, fetchData]);

  // Clear all cache
  const clearAll = useCallback(() => {
    cache.clear();
  }, []);

  return { data, loading, error, invalidate, clearAll, refetch: fetchData };
};

// Clear cache by pattern
export const clearCacheByPattern = (pattern: RegExp) => {
  const keys = Array.from(cache.keys());
  keys.forEach(key => {
    if (pattern.test(key)) {
      cache.delete(key);
    }
  });
};
