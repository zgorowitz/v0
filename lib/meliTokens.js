import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


/**
 * Get MercadoLibre tokens for an org/user/account.
 */
export async function getMeliTokens({ organization_id }) {
  const { data, error } = await supabase
    .from('meli_tokens')
    .select('*')
    .eq('organization_id', organization_id)
    // .eq('meli_user_id', meli_user_id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete MercadoLibre tokens for an org/user/account.
 */
export async function deleteMeliTokens({ organization_id }) {
  return supabase
    .from('meli_tokens')
    .delete()
    .eq('organization_id', organization_id)
    // .eq('meli_user_id', meli_user_id);
}



/**
 * Store MercadoLibre tokens, auto-detecting organization_id if not provided.
 * @param {Object} params
 * @param {string} params.user_id - The app user UUID
 * @param {Object} params.meli_user_info - MercadoLibre user info (must include id)
 * @param {Object} params.tokens - { access_token, refresh_token, expires_at, token_type }
 * @param {string} [params.organization_id] - Optional, if known (e.g. after org creation)
 */
export async function storeMeliTokens({ user_id, tokens, organization_id }) {
  let orgId = organization_id;

  // If orgId not provided, look up user's orgs
  if (!orgId) {
    const { data: orgUsers, error } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user_id);

    if (error) throw new Error('Failed to fetch user organizations: ' + error.message);
    if (!orgUsers || orgUsers.length === 0) {
      throw new Error('User is not a member of any organization');
    }
    orgId = orgUsers[0].organization_id; // Use the first org (or let user pick)
  }

  // Store or update tokens
  const { error: upsertError } = await supabase
    .from('meli_tokens')
    .upsert({
      organization_id: orgId,
      user_id,
      meli_user_id: tokens.meli_user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: tokens.expires_at,
      updated_at: new Date().toISOString()
    }, { onConflict: ['organization_id', 'meli_user_id'] });

  if (upsertError) throw new Error('Failed to store MercadoLibre tokens: ' + upsertError.message);

  return { success: true, organization_id: orgId };
}