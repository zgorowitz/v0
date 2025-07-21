// lib/supabase/client.js
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create a singleton client that will be shared across your app
let supabaseClient = null;

export function createClient() {
  // Only create one instance
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return supabaseClient;
}

// Export the shared instance directly
export const supabase = createClient();