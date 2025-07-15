// lib/meliTokens.js

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Store or update MercadoLibre tokens for an org/user/account.
 */
export async function storeMeliTokens({ organization_id, user_id, meli_user_id, tokens }) {
  return supabase
    .from('meli_tokens')
    .upsert({
      organization_id,
      user_id,
      meli_user_id: tokens.user_id
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at,
      updated_at: new Date().toISOString()
    }, { onConflict: ['organization_id', 'meli_user_id'] });
}

/**
 * Get MercadoLibre tokens for an org/user/account.
 */
export async function getMeliTokens({ organization_id, meli_user_id }) {
  const { data, error } = await supabase
    .from('meli_tokens')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('meli_user_id', meli_user_id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete MercadoLibre tokens for an org/user/account.
 */
export async function deleteMeliTokens({ organization_id, meli_user_id }) {
  return supabase
    .from('meli_tokens')
    .delete()
    .eq('organization_id', organization_id)
    .eq('meli_user_id', meli_user_id);
}