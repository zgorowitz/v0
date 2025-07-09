// app/api/auth/callback/route.js

import { kv } from '@vercel/kv';

export async function GET(request) {
  try {
    // 1. EXTRACT CODE FROM URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // 2. HANDLE AUTHORIZATION DENIAL
    if (error) {
      console.log('OAuth authorization denied:', error);
      return Response.redirect('https://laburandik.vercel.app/?error=access_denied');
    }

    // 3. VALIDATE CODE
    if (!code) {
      console.log('No authorization code received');
      return Response.redirect('https://laburandik.vercel.app/?error=no_code');
    }

    console.log('Received authorization code:', code);

    // 4. EXCHANGE CODE FOR TOKENS
    const tokens = await exchangeCodeForTokens(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // 5. STORE TOKENS IN KV
    await storeTokensInKV(tokens);

    console.log('Tokens stored successfully');

    // 6. REDIRECT TO SUCCESS PAGE
    return Response.redirect('https://laburandik.vercel.app/settings?auth=success');

  } catch (error) {
    console.error('Callback error:', error);
    return Response.redirect('https://laburandik.vercel.app/settings?error=oauth_failed');
  }
}

// HELPER: Exchange code for tokens
async function exchangeCodeForTokens(authorizationCode) {
  const tokenEndpoint = 'https://api.mercadolibre.com/oauth/token';
  
  const tokenRequest = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: authorizationCode,
      redirect_uri: 'https://laburandik.vercel.app/api/auth/callback'
    })
  };

  console.log('Exchanging code for tokens...');
  
  const response = await fetch(tokenEndpoint, tokenRequest);
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token exchange failed:', response.status, errorData);
    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();
  console.log('Token exchange successful');
  
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in || 3600,
    token_type: tokenData.token_type || 'Bearer',
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
  };
}

// HELPER: Store tokens in KV
async function storeTokensInKV(tokens) {
  const userId = 'default_user';
  const key = `oauth_tokens:${userId}`;
  
  await kv.hset(key, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at.toString(),
    token_type: tokens.token_type
  });
  
  // Set TTL with buffer
  const ttlSeconds = Math.floor((tokens.expires_at - Date.now()) / 1000) + 300;
  await kv.expire(key, ttlSeconds);
  
  console.log(`Tokens stored with TTL: ${ttlSeconds} seconds`);
}