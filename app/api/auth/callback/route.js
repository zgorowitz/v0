// app/api/auth/callback/route.js - Fixed version

import { storeMeliTokens } from '@/lib/meliTokens'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    console.log('=== OAuth Callback Started ===')
    
    // Determine the correct base URL
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host?.includes('localhost') 
      ? `http://${host}` 
      : `${protocol}://${host}`;
    
    // 1. EXTRACT PARAMETERS FROM URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log('URL params:', { 
      code: code ? 'present' : 'missing', 
      error,
      state: state ? 'present' : 'missing',
      baseUrl
    })

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

    // 4. PARSE STATE AND VALIDATE USER
    let returnUrl = `${baseUrl}/settings`;
    
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        console.log('State data extracted:', { 
          hasUserId: !!stateData.userId,
          returnUrl: stateData.returnUrl,
          timestamp: stateData.timestamp
        });
        
        // Check if state is not too old (5 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge < 5 * 60 * 1000) {
          // Validate that the user is still authenticated
          const supabase = await createClient();
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (!user || user.id !== stateData.userId) {
            console.log('User session invalid or user ID mismatch');
            return Response.redirect(`${baseUrl}/settings?error=session_invalid`);
          }
          
          console.log('User session validated successfully');
          returnUrl = stateData.returnUrl || returnUrl;
        } else {
          console.log('State parameter too old, ignoring');
          return Response.redirect(`${baseUrl}/settings?error=state_expired`);
        }
      } catch (stateError) {
        console.log('Failed to parse state parameter:', stateError.message);
        return Response.redirect(`${baseUrl}/settings?error=invalid_state`);
      }
    } else {
      // No state - just verify current user is authenticated
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return Response.redirect(`${baseUrl}/settings?error=no_user`);
      }
    }

    // 5. VALIDATE ENVIRONMENT VARIABLES
    if (!process.env.MERCADO_LIBRE_APP_ID) {
      console.error('Missing MERCADO_LIBRE_APP_ID environment variable');
      return Response.redirect(`${returnUrl}?error=missing_app_id`);
    }

    if (!process.env.MERCADO_LIBRE_CLIENT_SECRET) {
      console.error('Missing MERCADO_LIBRE_CLIENT_SECRET environment variable');
      return Response.redirect(`${returnUrl}?error=missing_client_secret`);
    }

    console.log('Environment variables validated');

    // 6. EXCHANGE CODE FOR TOKENS
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, baseUrl);
      console.log('Token exchange successful');
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError.message);
      return Response.redirect(`${returnUrl}?error=token_exchange_failed&details=${encodeURIComponent(tokenError.message)}`);
    }
    
    if (!tokens.access_token) {
      console.error('No access token received from exchange');
      return Response.redirect(`${returnUrl}?error=no_access_token`);
    }

    // 7. STORE TOKENS IN DATABASE
    try {
      await storeMeliTokens({ tokens });
      console.log('Tokens stored successfully');
    } catch (storeError) {
      console.error('Token storage failed:', storeError.message);
      return Response.redirect(`${returnUrl}?error=token_storage_failed&details=${encodeURIComponent(storeError.message)}`);
    }

    // 8. REDIRECT TO SUCCESS PAGE
    console.log('=== OAuth Callback Completed Successfully ===');
    return Response.redirect(`${returnUrl}?auth=success`);

  } catch (error) {
    console.error('=== OAuth Callback Failed ===');
    console.error('Unexpected error:', error);
    
    // Try to determine baseUrl for error redirect
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host?.includes('localhost') 
      ? `http://${host}` 
      : `${protocol}://${host}`;
    
    return Response.redirect(`${baseUrl}/settings?error=unexpected_error&details=${encodeURIComponent(error.message)}`);
  }
}

// HELPER: Exchange code for tokens with better error handling
async function exchangeCodeForTokens(authorizationCode, baseUrl) {
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