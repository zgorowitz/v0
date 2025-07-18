// app/api/user/route.js

// import { kv } from '@vercel/kv';
import { getMeliTokens } from '@/lib/meliTokens';

export async function GET(request) {
  try {
    // For now, using a fixed user ID - you might get this from session/auth later
    // 1. GET ACCESS TOKEN FROM STORAGE
    const storedTokens = await getMeliTokens();
    // console.log(storedTokens)
    console.log(storedTokens.access_token)
    if (!storedTokens || !storedTokens.access_token) {
      console.log('No access token found');
      return Response.json(
        { error: 'No access token available', needs_auth: true }, 
        { status: 401 }
      );
    }

    // 3. FETCH USER DATA FROM MERCADOLIBRE
    console.log('Fetching user data from MercadoLibre...');
    
    const response = await fetch('https://api.mercadolibre.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storedTokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('MercadoLibre API error:', response.status);
      
      if (response.status === 401) {
        return Response.json(
          { error: 'Invalid access token', needs_auth: true }, 
          { status: 401 }
        );
      }
      
      return Response.json(
        { error: 'Failed to fetch user data', status: response.status }, 
        { status: response.status }
      );
    }

    const userData = await response.json();
    console.log('User data fetched successfully');

    // 4. EXTRACT AND RETURN RELEVANT USER INFO
    const userInfo = {
      id: userData.id,
      nickname: userData.nickname,
      permalink: userData.permalink,
      thumbnail: userData.thumbnail ? {
        picture_id: userData.thumbnail.picture_id,
        picture_url: userData.thumbnail.picture_url
      } : null,
      // Optional: include some additional useful info
      first_name: userData.first_name,
      last_name: userData.last_name,
      country_id: userData.country_id,
      site_id: userData.site_id,
      user_type: userData.user_type,
      seller_reputation: userData.seller_reputation ? {
        level_id: userData.seller_reputation.level_id,
        power_seller_status: userData.seller_reputation.power_seller_status
      } : null
    };

    return Response.json(userInfo);

  } catch (error) {
    console.error('User endpoint error:', error);
    
    return Response.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}