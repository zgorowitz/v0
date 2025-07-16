// lib/meliTokens.js

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// const supabase = createAuthenticatedClient(); // Auth handled internally

async function createAuthenticatedClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
/**
 * Store or update MercadoLibre tokens for an org/user/account.
 */
export async function storeMeliTokens({ tokens, is_default = false }) {
  const supabase = await createAuthenticatedClient();  
  const organization_id = await getCurrentUserOrganizationId(supabase);

  // If marking as default, unset other defaults first
  if (is_default) {
    await supabase
      .from('meli_tokens')
      .update({ is_default: false })
      .eq('organization_id', organization_id);
  }
  
  // Check if this is the first account for the org
  const { count } = await supabase
    .from('meli_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization_id);
  
  return supabase
    .from('meli_tokens')
    .upsert({
      organization_id,
      meli_user_id: tokens.user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at,
      is_default: is_default || count === 0, // Auto-default if first account
      updated_at: new Date().toISOString()
    }, { onConflict: ['organization_id', 'meli_user_id'] });
}

/**
 * Get MercadoLibre tokens for an org/user/account.
 */
export async function getMeliTokens( meli_user_id ) {
  const supabase = await createAuthenticatedClient();
  const organization_id = await getCurrentUserOrganizationId(supabase);

  // If meli_user_id is provided, get specific account
  if (meli_user_id) {
    const { data, error } = await supabase
      .from('meli_tokens')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('meli_user_id', meli_user_id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // No meli_user_id provided - get default account
  const { data, error } = await supabase
    .from('meli_tokens')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('is_default', true)
    .single();
  
  if (error) {
    // If no default found, try to get any account (fallback)
    const { data: anyAccount, error: fallbackError } = await supabase
      .from('meli_tokens')
      .select('*')
      .eq('organization_id', organization_id)
      .limit(1)
      .single();
    
    if (fallbackError) throw new Error('No MercadoLibre accounts found');
    
    // Optionally, make this the default since it's the only one
    await supabase
      .from('meli_tokens')
      .update({ is_default: true })
      .eq('organization_id', organization_id)
      .eq('meli_user_id', anyAccount.meli_user_id);
    
    return anyAccount;
  }
  
  return data;
}

/**
 * Delete MercadoLibre tokens for an org/user/account.
 */
export async function deleteMeliTokens({ meli_user_id }) {
  const supabase = await createAuthenticatedClient();
  const organization_id = await getCurrentUserOrganizationId(supabase);

  return supabase
    .from('meli_tokens')
    .delete()
    .eq('organization_id', organization_id)
    .eq('meli_user_id', meli_user_id);
}

// organization_id for functions
async function getCurrentUserOrganizationId(supabase) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  const { data: orgUser, error: orgError } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (orgError || !orgUser) throw new Error('No organization found for user');

  return orgUser.organization_id;
}