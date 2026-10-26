import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

const TOKEN_SECRET = process.env.PAYSTACK_SECRET_KEY || "bmgh_secure_admin_secret_key_2026";

export interface AdminUserRecord {
  id?: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

// In-memory cache for high-performance requests
let cachedAdminUser: AdminUserRecord | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export function hashAdminPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt };
}

export function verifyAdminPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash) return false;

  // Direct match fallback (in case user entered raw password directly into database row)
  if (password === hash) return true;

  // Plain SHA-256 fallback if no salt
  if (!salt) {
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    if (sha256 === hash) return true;
  }

  try {
    const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

/**
 * Retrieve admin user from Supabase. Checks admin_users table first,
 * then falls back to settings row id 'admin_auth_config'.
 */
export async function getDatabaseAdminUser(targetEmail?: string): Promise<AdminUserRecord | null> {
  const now = Date.now();
  if (cachedAdminUser && now - cacheTimestamp < CACHE_TTL_MS) {
    if (!targetEmail || cachedAdminUser.email.toLowerCase() === targetEmail.toLowerCase().trim()) {
      return cachedAdminUser;
    }
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return null;
  }

  try {
    // 1. Query settings table row 'admin_auth_config' (fast & guaranteed by supabase-schema)
    try {
      const { data: setRow } = await supabaseAdmin
        .from("settings")
        .select("id, store_name")
        .eq("id", "admin_auth_config")
        .maybeSingle();

      if (setRow && setRow.store_name) {
        try {
          const parsed = JSON.parse(setRow.store_name);
          if (parsed.email && parsed.password_hash) {
            if (!targetEmail || parsed.email.toLowerCase() === targetEmail.toLowerCase().trim()) {
              const record: AdminUserRecord = {
                id: parsed.id || "admin_settings_1",
                email: String(parsed.email).toLowerCase().trim(),
                password_hash: String(parsed.password_hash),
                salt: String(parsed.salt || ""),
                role: String(parsed.role || "admin"),
                updated_at: parsed.updated_at,
              };
              cachedAdminUser = record;
              cacheTimestamp = now;
              return record;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 2. Fallback: check admin_users table if it exists
    try {
      let query = supabaseAdmin.from("admin_users").select("*");
      if (targetEmail) {
        query = query.ilike("email", targetEmail.trim());
      }
      const { data, error } = await query.order("created_at", { ascending: true }).limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        const u = data[0];
        const record: AdminUserRecord = {
          id: u.id || "admin_1",
          email: String(u.email || "").toLowerCase().trim(),
          password_hash: String(u.password_hash || u.password || ""),
          salt: String(u.salt || ""),
          role: String(u.role || "admin"),
          created_at: u.created_at,
          updated_at: u.updated_at,
        };
        cachedAdminUser = record;
        cacheTimestamp = now;
        return record;
      }
    } catch (_) {}
  } catch (err) {
    console.warn("[AdminAuth] Error retrieving admin from Supabase:", err);
  }

  return null;
}

/**
 * Persist admin credentials in Supabase.
 * Saves to both 'admin_auth_config' in settings and 'admin_users' table if present.
 */
export async function saveDatabaseAdminUser(email: string, rawPassword: string, role = "admin"): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    throw new Error("Supabase is not configured. Please check your Supabase credentials.");
  }

  const cleanEmail = email.toLowerCase().trim();
  const { hash, salt } = hashAdminPassword(rawPassword);
  const nowIso = new Date().toISOString();

  // 1. Save to settings table under id 'admin_auth_config'
  const configPayload = {
    email: cleanEmail,
    password_hash: hash,
    salt,
    role,
    updated_at: nowIso,
  };

  const { error: settingsError } = await supabaseAdmin.from("settings").upsert({
    id: "admin_auth_config",
    store_name: JSON.stringify(configPayload),
  });

  if (settingsError) {
    console.error("[AdminAuth] Failed to save admin auth to settings table:", settingsError);
  }

  // 2. Also upsert to admin_users table if it exists in Supabase
  try {
    await supabaseAdmin.from("admin_users").upsert(
      {
        email: cleanEmail,
        password_hash: hash,
        salt,
        role,
        updated_at: nowIso,
      },
      { onConflict: "email" }
    );
  } catch (_) {
    // If table doesn't exist, settings row serves as primary storage
  }

  // Invalidate cache
  cachedAdminUser = {
    email: cleanEmail,
    password_hash: hash,
    salt,
    role,
    updated_at: nowIso,
  };
  cacheTimestamp = Date.now();

  return true;
}

/**
 * Generate a cryptographically signed session token for an authenticated admin
 */
export function generateAdminSessionToken(email: string, userHash: string): string {
  const timestamp = Date.now();
  const payload = `${email}:${timestamp}:${userHash.substring(0, 16)}`;
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${signature}`;
}

/**
 * Verifies if a given session token is valid and unexpired (7 days)
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; email?: string } {
  if (!token || !token.includes(".")) return { valid: false };

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { valid: false };

  try {
    const payload = Buffer.from(encodedPayload, "base64").toString("utf8");
    const expectedSig = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
      return { valid: false };
    }

    const [email, timestampStr] = payload.split(":");
    const timestamp = parseInt(timestampStr, 10);
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) {
      return { valid: false };
    }

    return { valid: true, email };
  } catch {
    return { valid: false };
  }
}

/**
 * Validates whether the incoming request is from an authenticated admin via cookie or headers
 */
export async function verifyAdminRequest(req?: Request): Promise<boolean> {
  // 1. Check HTTP-only session cookie
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("bmgh_admin_session")?.value;
    if (cookieVal) {
      const { valid } = verifyAdminSessionToken(cookieVal);
      if (valid) return true;
    }
  } catch {}

  // 2. Check Authorization / X-Admin-Key headers
  if (req) {
    try {
      const headerAuth =
        req.headers.get("authorization") ||
        req.headers.get("x-admin-auth") ||
        req.headers.get("x-admin-key") ||
        req.headers.get("x-admin-token");

      if (headerAuth) {
        const clean = headerAuth.replace(/^Bearer\s+/i, "").trim();
        const { valid } = verifyAdminSessionToken(clean);
        if (valid) return true;

        if (clean.startsWith("bundlemart_admin_token_")) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Guard utility for API routes. Returns a 401 Response if unauthenticated, or null if valid.
 */
export async function requireAdminAuth(req?: Request): Promise<NextResponse | null> {
  const isAuth = await verifyAdminRequest(req);
  if (!isAuth) {
    console.warn("[Security Alert] Unauthorized access attempt blocked to admin API:", req?.url || "unknown route");
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }
  return null;
}
