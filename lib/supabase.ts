import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));

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
