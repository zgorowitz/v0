// app/api/auth/callback/route.js - Improved version with better error handling

import { getMeliTokens, storeMeliTokens } from '@/lib/meliTokens'

const baseUrl = 'https://laburandik.vercel.app'

export async function GET(request) {
  try {
    console.log('=== OAuth Callback Started ===')
    
    // 1. EXTRACT CODE FROM URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('URL params:', { code: code ? 'present' : 'missing', error })

    // 2. HANDLE AUTHORIZATION DENIAL
    if (error) {
      console.log('OAuth authorization denied:', error);
      return Response.redirect(`${baseUrl}/settings?error=access_denied&details=${encodeURIComponent(error)}`);
    }

    // 3. VALIDATE CODE
    if (!code) {
      console.log('No authorization code received');
      return Response.redirect(`${baseUrl}/settings?error=no_code`);
    }

    // 4. VALIDATE ENVIRONMENT VARIABLES
    if (!process.env.MERCADO_LIBRE_APP_ID) {
      console.error('Missing MERCADO_LIBRE_APP_ID environment variable');
      return Response.redirect(`${baseUrl}/settings?error=missing_app_id`);
    }

    if (!process.env.MERCADO_LIBRE_CLIENT_SECRET) {
      console.error('Missing MERCADO_LIBRE_CLIENT_SECRET environment variable');
      return Response.redirect(`${baseUrl}/settings?error=missing_client_secret`);
    }

    console.log('Environment variables validated');
    console.log('App ID:', process.env.MERCADO_LIBRE_APP_ID ? 'present' : 'missing');

    // 5. EXCHANGE CODE FOR TOKENS
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
      console.log('Token exchange successful');
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError.message);
      return Response.redirect(`${baseUrl}/settings?error=token_exchange_failed&details=${encodeURIComponent(tokenError.message)}`);
    }
    
    if (!tokens.access_token) {
      console.error('No access token received from exchange');
      return Response.redirect(`${baseUrl}/settings?error=no_access_token`);
    }

    // 6. STORE TOKENS IN DATABASE
    try {
      await storeMeliTokens({ tokens });
      console.log('Tokens stored successfully');
    } catch (storeError) {
      console.error('Token storage failed:', storeError.message);
      return Response.redirect(`${baseUrl}/settings?error=token_storage_failed&details=${encodeURIComponent(storeError.message)}`);
    }

    // 7. REDIRECT TO SUCCESS PAGE
    console.log('=== OAuth Callback Completed Successfully ===');
    return Response.redirect(`${baseUrl}/settings?auth=success`);

  } catch (error) {
    console.error('=== OAuth Callback Failed ===');
    console.error('Unexpected error:', error);
    console.error('Stack trace:', error.stack);
    
    return Response.redirect(`${baseUrl}/settings?error=unexpected_error&details=${encodeURIComponent(error.message)}`);
  }
}

// HELPER: Exchange code for tokens with better error handling
async function exchangeCodeForTokens(authorizationCode) {
  const tokenEndpoint = 'https://api.mercadolibre.com/oauth/token';
  
  const requestBody = {
    grant_type: 'authorization_code',
    client_id: process.env.MERCADO_LIBRE_APP_ID,
    client_secret: process.env.MERCADO_LIBRE_CLIENT_SECRET,
    code: authorizationCode,
    redirect_uri: `${baseUrl}/api/auth/callback`
  };

  console.log('Token exchange request:', {
    endpoint: tokenEndpoint,
    client_id: requestBody.client_id,
    redirect_uri: requestBody.redirect_uri,
    code: authorizationCode ? 'present' : 'missing'
  });
  
  const tokenRequest = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams(requestBody)
  };

  let response;
  try {
    response = await fetch(tokenEndpoint, tokenRequest);
  } catch (fetchError) {
    console.error('Network error during token exchange:', fetchError);
    throw new Error(`Network error: ${fetchError.message}`);
  }
  
  console.log('Token exchange response status:', response.status);
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.text();
      console.error('Token exchange error response:', errorData);
    } catch (e) {
      errorData = 'Unable to read error response';
    }
    
    throw new Error(`Token exchange failed: HTTP ${response.status} - ${errorData}`);
  }

  let tokenData;
  try {
    tokenData = await response.json();
    console.log('Token exchange response keys:', Object.keys(tokenData));
  } catch (parseError) {
    console.error('Failed to parse token response as JSON:', parseError);
    throw new Error('Invalid JSON response from token endpoint');
  }
  
  if (!tokenData.access_token) {
    console.error('No access token in response:', tokenData);
    throw new Error('No access token in response');
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in || 3600,
    token_type: tokenData.token_type || 'Bearer',
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000),
    user_id: tokenData.user_id
  };
}