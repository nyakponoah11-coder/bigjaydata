/**
 * Device Session & Local Storage Cache
 * 
 * Provides robust client-side storage for store settings, products, agent storefronts,
 * and delivery stats so that page loads across the website read from the local device session
 * and do not trigger unnecessary database queries or consume egress bandwidth.
 * 
 * Database is only queried for actions (checkout, verify, order tracking, admin changes).
 */

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes session TTL
const TRACKER_TTL_MS = 60 * 1000;      // 1 minute for tracker
const VOUCHER_TTL_MS = 5 * 60 * 1000;  // 5 minutes for giveaway

interface SessionPayload<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__bmgh_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback if localStorage is unavailable
const memoryFallback = new Map<string, SessionPayload<any>>();

export function saveDeviceSession<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  if (typeof window === "undefined") return;
  const payload: SessionPayload<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };

  try {
    if (isStorageAvailable()) {
      window.localStorage.setItem(`bmgh_sess_${key}`, JSON.stringify(payload));
    } else {
      memoryFallback.set(`bmgh_sess_${key}`, payload);
    }
  } catch (err) {
    // Quota exceeded or private browsing error fallback
    memoryFallback.set(`bmgh_sess_${key}`, payload);
  }
}

export function loadDeviceSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    let raw: string | null = null;
    if (isStorageAvailable()) {
      raw = window.localStorage.getItem(`bmgh_sess_${key}`);
    }

    let payload: SessionPayload<T> | undefined;
    if (raw) {
      payload = JSON.parse(raw);
    } else {
      payload = memoryFallback.get(`bmgh_sess_${key}`);
    }

    if (!payload || typeof payload !== "object" || !payload.timestamp) {
      return null;
    }

    const age = Date.now() - payload.timestamp;
    if (age > payload.ttl) {
      clearDeviceSession(key);
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

export function clearDeviceSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (isStorageAvailable()) {
      window.localStorage.removeItem(`bmgh_sess_${key}`);
    }
    memoryFallback.delete(`bmgh_sess_${key}`);
  } catch {}
}

export function clearAllDeviceSessions(): void {
  if (typeof window === "undefined") return;
  try {
    if (isStorageAvailable()) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("bmgh_sess_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
    memoryFallback.clear();
  } catch {}
}

// ----------------- Specialized Helpers -----------------

export function getCachedSettings() {
  return loadDeviceSession<any>("settings");
}

export function saveSettingsSession(settings: any) {
  saveDeviceSession("settings", settings, DEFAULT_TTL_MS);
}

export function getCachedProducts(network = "all") {
  return loadDeviceSession<any[]>(`products_${network.toLowerCase()}`);
}

export function saveProductsSession(network = "all", products: any[]) {
  saveDeviceSession(`products_${network.toLowerCase()}`, products, DEFAULT_TTL_MS);
}

export function getCachedAgentStore(slug: string) {
  return loadDeviceSession<any>(`store_${slug.toLowerCase().trim()}`);
}

export function saveAgentStoreSession(slug: string, storeData: any) {
  saveDeviceSession(`store_${slug.toLowerCase().trim()}`, storeData, DEFAULT_TTL_MS);
}

export function getCachedDeliveryTracker() {
  return loadDeviceSession<any>("delivery_tracker");
}

export function saveDeliveryTrackerSession(tracker: any) {
  saveDeviceSession("delivery_tracker", tracker, TRACKER_TTL_MS);
}

export function getCachedActiveVoucher() {
  return loadDeviceSession<any>("active_voucher");
}

export function saveActiveVoucherSession(voucher: any) {
  saveDeviceSession("active_voucher", voucher, VOUCHER_TTL_MS);
}
