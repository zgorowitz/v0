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

// Helper function to get current user's organization ID
export async function getCurrentUserOrganizationId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orgUser } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  return orgUser?.organization_id;
}