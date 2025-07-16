// app/api/auth/status/route.js

// import { kv } from '@vercel/kv';
import { getMeliTokens, refreshMeliTokens } from '@/lib/meliTokens';


export async function GET(request) {
  try {
    // 1. CHECK IF TOKENS EXIST IN STORAGE
    let storedTokens;
    try {
      storedTokens = await getMeliTokens();
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
      const refreshedTokens = await refreshMeliTokens(storedTokens.refresh_token);
      
      console.log('Token refresh successful');
      return Response.json({
        authenticated: true,
        needs_auth: false,
        expires_in_minutes: Math.floor(3600 / 60),
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
