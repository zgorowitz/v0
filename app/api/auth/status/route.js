// app/api/auth/status/route.js

// import { kv } from '@vercel/kv';
import { getMeliTokens, storeMeliTokens } from '@/lib/meliTokens';


export async function GET(request) {
  try {
    // 1. CHECK IF TOKENS EXIST IN STORAGE
    let storedTokens;
    try {
      storedTokens = await getMeliTokens();
      console.log(storedTokens)
    } catch (tokenErr) {
      console.error('Error fetching tokens:', tokenErr);
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'token_storage_error',
        error: 'Failed to fetch tokens from storage'
      }, { status: 500 });
    }

    if (!storedTokens || !storedTokens.access_token) {
      console.log('No tokens found in storage');
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_tokens'
      });
    }

    // 2. CHECK TOKEN EXPIRATION
    let expiresAt;
    try {
      expiresAt = parseInt(storedTokens.expires_at);
      if (isNaN(expiresAt)) throw new Error('expires_at is not a number');
    } catch (parseErr) {
      console.error('Invalid expires_at value:', parseErr);
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'invalid_token_expiry',
        error: 'Token expiry is invalid'
      }, { status: 500 });
    }

    const now = Date.now();
    const isExpired = now >= expiresAt;
    const expiresInMinutes = Math.floor((expiresAt - now) / (1000 * 60));

    console.log(`Token expires in ${expiresInMinutes} minutes`);

    // 3. IF TOKEN NOT EXPIRED, RETURN SUCCESS
    if (!isExpired) {
      return Response.json({
        authenticated: true,
        needs_auth: false,
        expires_in_minutes: expiresInMinutes,
        reason: 'valid_token'
      });
    }

    // 4. TOKEN IS EXPIRED - TRY TO REFRESH
    console.log('Access token expired, attempting refresh...');
    
    if (!storedTokens.refresh_token) {
      console.log('No refresh token available');
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_refresh_token'
      });
    }

    // 5. ATTEMPT TOKEN REFRESH
    try {
      // userId is not defined in your code, you may need to get it from somewhere
      const refreshResult = await refreshTokensInternal(storedTokens.refresh_token, /* userId */ undefined);
      
      console.log('Token refresh successful');
      return Response.json({
        authenticated: true,
        needs_auth: false,
        expires_in_minutes: Math.floor(refreshResult.expires_in / 60),
        reason: 'refreshed_token'
      });

    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'refresh_failed',
        error: refreshError.message || 'Unknown error during token refresh'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Status check failed:', error);
    return Response.json({
      authenticated: false,
      needs_auth: true,
      reason: 'status_check_failed',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

// INTERNAL HELPER: Refresh tokens (same logic as refresh route)
async function refreshTokensInternal(refreshToken, userId) {
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

  let response;
  try {
    response = await fetch(tokenEndpoint, refreshRequest);
  } catch (networkErr) {
    throw new Error(`Network error during token refresh: ${networkErr.message}`);
  }
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  let tokenData;
  try {
    tokenData = await response.json();
  } catch (jsonErr) {
    throw new Error('Failed to parse token refresh response as JSON');
  }
  
  if (!tokenData.access_token) {
    throw new Error('No access token in refresh response');
  }

  const newTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken,
    expires_in: tokenData.expires_in || 3600,
    token_type: tokenData.token_type || 'Bearer',
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
  };

  // Store new tokens
  try {
    await storeMeliTokens();
  } catch (storeErr) {
    throw new Error('Failed to store refreshed tokens');
  }
  
  return newTokens;
}
// ... existing code ...

// HELPER: Store tokens in Vercel KV
// async function storeTokensInKV(userId, tokens) {
//   const key = `oauth_tokens:${userId}`;
  
//   await kv.hset(key, {
//     access_token: tokens.access_token,
//     refresh_token: tokens.refresh_token,
//     expires_at: tokens.expires_at.toString(),
//     token_type: tokens.token_type
//   });
// }