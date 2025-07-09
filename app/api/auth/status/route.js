// app/api/auth/status/route.js

import { kv } from '@vercel/kv';

export async function GET(request) {
  try {
    // For now, using a fixed user ID - you might get this from session/auth later
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;

    // 1. CHECK IF TOKENS EXIST IN STORAGE
    const storedTokens = await kv.hgetall(tokenKey);
    
    if (!storedTokens || !storedTokens.access_token) {
      console.log('No tokens found in storage');
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_tokens'
      });
    }

    // 2. CHECK TOKEN EXPIRATION
    const expiresAt = parseInt(storedTokens.expires_at);
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
      const refreshResult = await refreshTokensInternal(storedTokens.refresh_token, userId);
      
      console.log('Token refresh successful');
      return Response.json({
        authenticated: true,
        needs_auth: false,
        expires_in_minutes: Math.floor(refreshResult.expires_in / 60),
        reason: 'refreshed_token'
      });

    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError.message);
      
      // If refresh failed, user needs to re-authenticate
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'refresh_failed',
        error: refreshError.message
      });
    }

  } catch (error) {
    console.error('Status check failed:', error);
    
    return Response.json({
      authenticated: false,
      needs_auth: true,
      reason: 'status_check_failed',
      error: error.message
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
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken
    })
  };

  const response = await fetch(tokenEndpoint, refreshRequest);
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();
  
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
  await storeTokensInKV(userId, newTokens);
  
  return newTokens;
}

// HELPER: Store tokens in Vercel KV
async function storeTokensInKV(userId, tokens) {
  const key = `oauth_tokens:${userId}`;
  
  await kv.hset(key, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at.toString(),
    token_type: tokens.token_type
  });
  
  const ttlSeconds = Math.floor((tokens.expires_at - Date.now()) / 1000) + 300;
  await kv.expire(key, ttlSeconds);
}