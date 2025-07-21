// app/api/user/route.js

import { getMeliTokens, storeMeliAccounts, createAuthenticatedClient, getUserInfo } from '@/lib/meliTokens';
export async function GET(request) {
  try {
    // 1. GET ACCESS TOKEN FROM STORAGE
    const storedTokens = await getMeliTokens();
    
    if (!storedTokens || !storedTokens.access_token) {
      console.log('No access token found');
      return Response.json(
        { error: 'No access token available', needs_auth: true }, 
        { status: 401 }
      );
    }

    const meliUserId = storedTokens.meli_user_id;
    
    // 2. TRY TO GET USER DATA FROM DATABASE FIRST
    let userData = null;
    try {
      const supabase = await createAuthenticatedClient();
      const organization_id = await getUserInfo(supabase);
      
      const { data: existingAccount, error: dbError } = await supabase
        .from('meli_accounts')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('meli_user_id', meliUserId)
        .single();
      
      if (existingAccount && !dbError) {
        console.log('User data found in database');
        
        // Convert stored data back to API format
        userData = {
          id: existingAccount.meli_user_id,
          nickname: existingAccount.nickname,
          permalink: existingAccount.permalink,
          thumbnail: existingAccount.thumbnail_url ? {
            picture_url: existingAccount.thumbnail_url
          } : null,
          first_name: existingAccount.first_name,
          last_name: existingAccount.last_name,
          country_id: existingAccount.country_id,
          site_id: existingAccount.site_id,
          user_type: existingAccount.user_type,
          seller_reputation: (existingAccount.seller_level_id || existingAccount.power_seller_status) ? {
            level_id: existingAccount.seller_level_id,
            power_seller_status: existingAccount.power_seller_status
          } : null
        };
      }
    } catch (dbError) {
      console.log('Database lookup failed, will fetch from API:', dbError.message);
    }

    // 3. IF NOT IN DATABASE, FETCH FROM MERCADOLIBRE API
    if (!userData) {
      console.log('Fetching user data from MercadoLibre API...');
      
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

      userData = await response.json();
      
      // 4. STORE THE FETCHED DATA IN DATABASE
      try {
        console.log('Storing user data in database...');
        const { error: storeError } = await storeMeliAccounts(userData);
        
        if (storeError) {
          console.error('Failed to store account info:', storeError);
          // Continue anyway since user data fetch succeeded
        } else {
          console.log('User data stored successfully');
        }
      } catch (storeError) {
        console.error('Error storing account info:', storeError);
        // Continue anyway since user data fetch succeeded
      }
    }

    // 5. FORMAT AND RETURN USER INFO
    const userInfo = {
      id: userData.id,
      nickname: userData.nickname,
      permalink: userData.permalink,
      thumbnail: userData.thumbnail ? {
        picture_id: userData.thumbnail.picture_id,
        picture_url: userData.thumbnail.picture_url
      } : null,
      first_name: userData.first_name,
      last_name: userData.last_name,
      country_id: userData.country_id,
      site_id: userData.site_id,
      user_type: userData.user_type,
      seller_reputation: userData.seller_reputation ? {
        level_id: userData.seller_reputation.level_id,
        power_seller_status: userData.seller_reputation.power_seller_status
      } : null,
      // Add metadata about data source
      _source: userData._source || 'api' // 'database' or 'api'
    };

    // Add source metadata
    if (userData._source !== 'api') {
      userInfo._source = 'database';
    }

    return Response.json(userInfo);

  } catch (error) {
    console.error('User endpoint error:', error);
    
    return Response.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}