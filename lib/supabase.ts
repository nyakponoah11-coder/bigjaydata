import { createClient } from "@supabase/supabase-js";

function cleanUrl(url?: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (!clean) return "";
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith("http") && 
  (supabaseAnonKey || supabaseServiceRoleKey)
);

// Global fetch with a 4s timeout to prevent external DB lag from locking the site
const timeoutFetch = (url: any, options: any = {}) => {
  let signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
  if (options?.signal && (AbortSignal as any)?.any && signal) {
    try {
      signal = (AbortSignal as any).any([options.signal, signal]);
    } catch {
      signal = options.signal;
    }
  } else if (options?.signal && !signal) {
    signal = options.signal;
  }
  return fetch(url, {
    ...options,
    ...(signal ? { signal } : {}),
  });
};

// Public client for frontend use
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
      global: { fetch: timeoutFetch },
    })
  : null;

// Server-side service role client for backend operations
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: { fetch: timeoutFetch },
    })
  : null;

