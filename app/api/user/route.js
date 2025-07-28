// app/api/user/route.js

import { getMeliTokens, storeMeliAccounts } from '@/lib/meliTokens'

export async function GET(request) {
  try {
    // 1. GET ACCESS TOKEN FROM STORAGE
    const storedTokens = await getMeliTokens()
    if (!storedTokens || !storedTokens.access_token) {
      console.log('No access token found')
      return Response.json(
        { error: 'No access token available', needs_auth: true }, 
        { status: 401 }
      )
    }
    // 2. FETCH FROM MERCADOLIBRE API
    console.log('Fetching user data from MercadoLibre API...')
    const response = await fetch('https://api.mercadolibre.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storedTokens.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('MercadoLibre API error:', response.status)
      
      if (response.status === 401) {
        return Response.json(
          { error: 'Invalid access token', needs_auth: true }, 
          { status: 401 }
        )
      }
      
      return Response.json(
        { error: 'Failed to fetch user data', status: response.status }, 
        { status: response.status }
      )
    }

    const userData = await response.json()
    
    // 3. STORE THE FETCHED DATA IN DATABASE
    try {
      console.log('Storing user data in database...')
      const { error: storeError } = await storeMeliAccounts(userData)
      
      if (storeError) {
        console.error('Failed to store account info:', storeError)
        // Continue anyway since user data fetch succeeded
      } else {
        console.log('User data stored successfully')
      }
    } catch (storeError) {
      console.error('Error storing account info:', storeError)
      // Continue anyway since user data fetch succeeded
    }

    // 4. FORMAT AND RETURN USER INFO
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
      _source: 'api'
    }

    return Response.json(userInfo)

  } catch (error) {
    console.error('User endpoint error:', error)
      return error
  }
}