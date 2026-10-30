import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily creates a Supabase browser client from env vars. Returns null when the
 * env vars are absent (local dev, Vitest, and Playwright screenshots all run
 * against the deterministic ShopFoundationStore in src/lib/domain instead).
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!cachedClient) {
    cachedClient = createClient(url, anonKey);
  }
  return cachedClient;
}
