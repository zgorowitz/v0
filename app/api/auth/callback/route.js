// app/api/auth/callback/route.js - Improved version with session restoration

import { getMeliTokens, storeMeliTokens } from '@/lib/meliTokens'
import { createClient } from '@/lib/supabase/server'

const baseUrl = 'https://laburandik.vercel.app'

export async function GET(request) {
  try {
    console.log('=== OAuth Callback Started ===')
    
    // 1. EXTRACT PARAMETERS FROM URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log('URL params:', { 
      code: code ? 'present' : 'missing', 
      error,
      state: state ? 'present' : 'missing'
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

    // 4. RESTORE SESSION FROM STATE PARAMETER
    let sessionRestored = false;
    let returnUrl = `${baseUrl}/settings`;
    
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        console.log('State data extracted:', { 
          hasSession: !!stateData.supabaseSession,
          returnUrl: stateData.returnUrl,
          timestamp: stateData.timestamp
        });
        
        // Check if state is not too old (5 minutes)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge < 5 * 60 * 1000) {
          const supabase = createClient();
          
          // Step 1: Try to restore session from state
          if (stateData.supabaseSession) {
            try {
              await supabase.auth.setSession(stateData.supabaseSession);
              console.log('Session restored from state parameter');
              sessionRestored = true;
            } catch (sessionError) {
              console.log('Failed to restore session from state:', sessionError.message);
            }
          }
          
          // Step 2: If session restoration failed, try to refresh session
          if (!sessionRestored) {
            try {
              const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
              if (session && !refreshError) {
                console.log('Session refreshed successfully');
                sessionRestored = true;
              } else {
                console.log('Session refresh failed:', refreshError?.message);
              }
            } catch (refreshError) {
              console.log('Session refresh error:', refreshError.message);
            }
          }
          
          returnUrl = stateData.returnUrl || returnUrl;
        } else {
          console.log('State parameter too old, ignoring');
        }
      } catch (stateError) {
        console.log('Failed to parse state parameter:', stateError.message);
      }
    }

    if (!sessionRestored) {
      console.log('No valid session found, redirecting to login');
      return Response.redirect(`${baseUrl}/settings?error=session_lost`);
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
    console.log('App ID:', process.env.MERCADO_LIBRE_APP_ID ? 'present' : 'missing');

    // 6. EXCHANGE CODE FOR TOKENS
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
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