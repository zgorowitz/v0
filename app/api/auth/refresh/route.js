
// app/api/auth/refresh/route.js

// import { kv } from '@vercel/kv';
import { getMeliTokens, refreshMeliTokens } from '@/lib/meliTokens'

export async function POST(request) {
  try {

    // 1. GET CURRENT TOKENS FROM VERCEL KV
    // const storedTokens = await kv.hgetall(tokenKey);
    const storedTokens = await getMeliTokens()
    
    if (!storedTokens || !storedTokens.refresh_token) {
      console.log('No refresh token found in storage');
      return Response.json(
        { error: 'No refresh token available' }, 
        { status: 401 }
      );
    }

    console.log('Found stored refresh token, attempting refresh...');

    const refreshedTokens = await refreshMeliTokens(storedTokens.refresh_token);
    
    return Response.json({
      success: true,
      access_token: refreshedTokens.access_token,
      expires_in: 3600
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

