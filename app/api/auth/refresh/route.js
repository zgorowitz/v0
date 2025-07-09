
// app/api/auth/refresh/route.js

import { kv } from '@vercel/kv';

export async function POST(request) {
  try {
    // For now, using a fixed user ID - you might get this from session/auth later
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;

    // 1. GET CURRENT TOKENS FROM VERCEL KV
    const storedTokens = await kv.hgetall(tokenKey);
    
    if (!storedTokens || !storedTokens.refresh_token) {
      console.log('No refresh token found in storage');
      return Response.json(
        { error: 'No refresh token available' }, 
        { status: 401 }
      );
    }

    console.log('Found stored refresh token, attempting refresh...');

    // 2. REFRESH TOKENS WITH MERCADOLIBRE
    const newTokens = await refreshTokensFromProvider(storedTokens.refresh_token);

    // 3. STORE NEW TOKENS IN VERCEL KV
    await storeTokensInKV(userId, newTokens);

    console.log('Tokens refreshed and stored successfully');

    // 4. RETURN SUCCESS
    return Response.json({
      success: true,
      access_token: newTokens.access_token,
      expires_in: newTokens.expires_in
    });

  } catch (error) {
    console.error('Token refresh failed:', error);

    // Handle specific errors
    if (error.message.includes('invalid_grant') || error.message.includes('expired')) {
      // Refresh token is invalid/expired - user needs to re-authenticate
      return Response.json(
        { error: 'Refresh token expired', needs_reauth: true }, 
        { status: 401 }
      );
    }

    return Response.json(
      { error: 'Token refresh failed', details: error.message }, 
      { status: 500 }
    );
  }
}

// HELPER: Refresh tokens with MercadoLibre
async function refreshTokensFromProvider(refreshToken) {
  // TODO: Replace with actual MercadoLibre token endpoint
  const tokenEndpoint = 'https://api.mercadolibre.com/oauth/token'; // NEED ACTUAL URL
  
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

  console.log('Making refresh request to MercadoLibre...');
  
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

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken, // Some providers rotate refresh tokens
    expires_in: tokenData.expires_in || 3600,
    token_type: tokenData.token_type || 'Bearer',
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
  };
}

// HELPER: Store tokens in Vercel KV
async function storeTokensInKV(userId, tokens) {
  const key = `oauth_tokens:${userId}`;
  
  // Store all token data
  await kv.hset(key, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at.toString(),
    token_type: tokens.token_type
  });
  
  // Set expiration slightly longer than token expiry for safety margin
  const ttlSeconds = Math.floor((tokens.expires_at - Date.now()) / 1000) + 300; // 5 min buffer
  await kv.expire(key, ttlSeconds);
  
  console.log(`Tokens stored with TTL: ${ttlSeconds} seconds`);
}