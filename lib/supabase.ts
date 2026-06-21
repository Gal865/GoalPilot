import { createClient } from "@supabase/supabase-js";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createBrowserSupabaseClient() {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

export function createServerSupabaseClient(accessToken?: string) {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON.");
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
