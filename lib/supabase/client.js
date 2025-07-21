// lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

let supabaseClient = null;

export function createClient() {
  // Only create one instance
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      // ✅ FIX: This automatically handles cookies for SSR
    );
  }
  return supabaseClient;
}

// Export the shared instance directly
export const supabase = createClient();
