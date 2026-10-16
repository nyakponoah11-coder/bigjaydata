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

// Public client for frontend use
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey)
  : null;

// Server-side service role client for backend operations
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

