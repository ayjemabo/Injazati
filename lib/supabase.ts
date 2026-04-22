import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasPublicSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const hasServerSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function createBrowserSupabaseClient() {
  if (!hasPublicSupabaseEnv) {
    return null;
  }

  return createClient(supabaseUrl!, supabaseAnonKey!);
}

export function createServerSupabaseClient(): SupabaseClient | null {
  if (!hasServerSupabaseEnv) {
    return null;
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getSupabaseMode() {
  if (hasServerSupabaseEnv) {
    return "live";
  }

  if (hasPublicSupabaseEnv) {
    return "auth-only";
  }

  return "mock";
}
