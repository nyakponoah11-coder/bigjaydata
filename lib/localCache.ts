/**
 * High-efficiency Local Cache with TTL & Tab-Visibility Aware Polling
 * Designed to drastically cut Supabase API / Database Egress.
 * Modeled on Data-Ease caching architecture.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

export function getCache<T>(key: string): T | null {
  try {
    const now = Date.now();

    // 1. Check in-memory cache first
    const mem = MEMORY_CACHE.get(key);
    if (mem && now - mem.timestamp < mem.ttlMs) {
      return mem.data as T;
    }

    // 2. Check localStorage (client-side only)
    if (typeof window === "undefined" || !window.localStorage) return null;

    const raw = localStorage.getItem(`cache_${key}`);
    if (!raw) return null;

    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (now - parsed.timestamp < parsed.ttlMs) {
      MEMORY_CACHE.set(key, parsed);
      return parsed.data;
    }

    // Expired
    localStorage.removeItem(`cache_${key}`);
    MEMORY_CACHE.delete(key);
    return null;
  } catch (err) {
    return null;
  }
}

export function getCacheMeta<T>(key: string): { data: T | null; isStale: boolean; exists: boolean } {
  try {
    const now = Date.now();
    const mem = MEMORY_CACHE.get(key);
    if (mem) {
      return {
        data: mem.data,
        isStale: now - mem.timestamp >= mem.ttlMs,
        exists: true,
      };
    }

    if (typeof window === "undefined" || !window.localStorage) {
      return { data: null, isStale: true, exists: false };
    }

    const raw = localStorage.getItem(`cache_${key}`);
    if (!raw) return { data: null, isStale: true, exists: false };

    const parsed: CacheEntry<T> = JSON.parse(raw);
    const isStale = now - parsed.timestamp >= parsed.ttlMs;
    MEMORY_CACHE.set(key, parsed);

    return {
      data: parsed.data,
      isStale,
      exists: true,
    };
  } catch {
    return { data: null, isStale: true, exists: false };
  }
}

export function setCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    MEMORY_CACHE.set(key, entry);

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (storageErr) {
        cleanExpiredCache();
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn(`LocalCache write failed for key ${key}:`, err);
  }
}

export function invalidateCache(key: string): void {
  try {
    MEMORY_CACHE.delete(key);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(`cache_${key}`);
    }
  } catch (_) {}
}

export function clearCachePrefix(prefix: string): void {
  try {
    for (const k of Array.from(MEMORY_CACHE.keys())) {
      if (k.startsWith(prefix)) MEMORY_CACHE.delete(k);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const storageKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`cache_${prefix}`)) storageKeys.push(k);
      }
      storageKeys.forEach((k) => localStorage.removeItem(k));
    }
  } catch (_) {}
}

export function cleanExpiredCache(): void {
  try {
    const now = Date.now();
    for (const [k, v] of Array.from(MEMORY_CACHE.entries())) {
      if (now - v.timestamp >= v.ttlMs) MEMORY_CACHE.delete(k);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cache_")) {
          try {
            const item = JSON.parse(localStorage.getItem(k) || "{}");
            if (!item.timestamp || now - item.timestamp >= (item.ttlMs || 0)) {
              toRemove.push(k);
            }
          } catch {
            toRemove.push(k);
          }
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (_) {}
}

/**
 * Cached async fetcher:
 * 1. Returns cached value immediately if still fresh (0 network egress!).
 * 2. If stale or forceFresh=true, calls fetcher().
 * 3. If network fails, falls back to stale cache if available.
 */
export async function cachedAsync<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000,
  forceFresh: boolean = false
): Promise<T> {
  const meta = getCacheMeta<T>(key);

  if (!forceFresh && meta.exists && !meta.isStale && meta.data !== null) {
    return meta.data;
  }

  try {
    const freshData = await fetcher();
    if (freshData !== undefined && freshData !== null) {
      setCache(key, freshData, ttlMs);
      return freshData;
    }
  } catch (err) {
    // If fetch failed but we have cached (even stale) data, return it to keep the app working!
    if (meta.exists && meta.data !== null) {
      console.warn(`Fetcher failed for ${key}, using cached fallback:`, err);
      return meta.data;
    }
    throw err;
  }

  return (meta.data as T) || (null as unknown as T);
}

/**
 * Smart interval:
 * - Automatically pauses polling when the user switches tabs (document.hidden).
 * - Fires when user returns to tab if interval time elapsed.
 * - Prevents 24/7 background bandwidth and egress drain.
 */
export function createSmartInterval(
  callback: () => void | Promise<void>,
  intervalMs: number
): () => void {
  if (typeof window === "undefined") {
    const timer = setInterval(callback, intervalMs);
    return () => clearInterval(timer);
  }

  let timer: any = null;
  let lastRan = Date.now();
  let isRunning = false;

  const run = async () => {
    if (document.hidden || isRunning) return;
    isRunning = true;
    lastRan = Date.now();
    try {
      await callback();
    } catch (_) {}
    isRunning = false;
  };

  timer = setInterval(run, intervalMs);

  const onVisibilityChange = () => {
    if (!document.hidden) {
      const elapsed = Date.now() - lastRan;
      if (elapsed >= intervalMs) {
        run();
      }
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
