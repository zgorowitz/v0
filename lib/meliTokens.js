// lib/meliTokens.js

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// const supabase = createAuthenticatedClient(); // Auth handled internally

// =======================
// MELI TOKENS OPERATIONS
// =======================
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

// =======================
// MELI ACCOUNTS OPERATIONS
// =======================

export async function storeMeliAccounts(userInfo) {
  const supabase = await createAuthenticatedClient();
  const organization_id = await getCurrentUserOrganizationId(supabase);

  return supabase
    .from('meli_accounts')
    .upsert({
      organization_id,
      meli_user_id: userInfo.id,
      nickname: userInfo.nickname,
      permalink: userInfo.permalink,
      thumbnail_url: userInfo.thumbnail?.picture_url || null,
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      country_id: userInfo.country_id,
      site_id: userInfo.site_id,
      user_type: userInfo.user_type,
      seller_level_id: userInfo.seller_reputation?.level_id || null,
      power_seller_status: userInfo.seller_reputation?.power_seller_status || null,
      created_at: new Date().toISOString()
    }, { onConflict: ['organization_id', 'meli_user_id'] });
}

// =======================
// HELPERS
// =======================

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

//get client for supabase conection?
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

// =====================================
// refresh_token
// =====================================

export async function refreshMeliTokens(refreshToken) {
  try {
    const tokenEndpoint = 'https://api.mercadolibre.com/oauth/token';
    
    const refreshRequest = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.MERCADO_LIBRE_APP_ID,
        client_secret: process.env.MERCADO_LIBRE_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    };

    const response = await fetch(tokenEndpoint, refreshRequest);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('MercadoLibre refresh failed:', response.status, errorData);
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token in refresh response');
    }

    // Get original tokens to preserve user_id
    const originalTokens = await getMeliTokens();
    
    // Create properly structured tokens
    const tokens = {
      user_id: tokenData.user_id || originalTokens.meli_user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
    };

    // Store new tokens
    await storeMeliTokens({ tokens });
    
    console.log('Tokens refreshed and stored successfully');
    return tokens;

  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}