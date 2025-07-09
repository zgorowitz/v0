// app/api/orders/route.js

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get valid access token with detailed error handling
async function getValidAccessToken() {
  try {
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;
    
    console.log('Getting tokens from KV...');
    const storedTokens = await kv.hgetall(tokenKey);
    
    if (!storedTokens || !storedTokens.access_token) {
      throw new Error('NO_TOKEN_FOUND');
    }

    const expiresAt = parseInt(storedTokens.expires_at);
    const now = Date.now();
    const isExpired = now >= expiresAt;

    console.log(`Token expires at: ${new Date(expiresAt)}, Expired: ${isExpired}`);

    if (!isExpired) {
      return storedTokens.access_token;
    }

    // Token expired - try refresh
    console.log('Token expired, attempting refresh...');
    
    if (!storedTokens.refresh_token) {
      throw new Error('TOKEN_EXPIRED_NO_REFRESH');
    }

    const newTokens = await refreshTokensInternal(storedTokens.refresh_token, userId);
    return newTokens.access_token;

  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Refresh tokens
async function refreshTokensInternal(refreshToken, userId) {
  try {
    console.log('Refreshing tokens...');
    
    const tokenEndpoint = 'https://api.mercadolibre.com/oauth/token';
    
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

    const response = await fetch(tokenEndpoint, refreshRequest);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      throw new Error(`REFRESH_FAILED_${response.status}`);
    }

    const tokenData = await response.json();
    
    const newTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      expires_in: tokenData.expires_in || 3600,
      expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
    };

    // Store new tokens
    await kv.hset(`oauth_tokens:${userId}`, {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at.toString(),
      token_type: 'Bearer'
    });

    const ttlSeconds = Math.floor((newTokens.expires_at - Date.now()) / 1000) + 300;
    await kv.expire(`oauth_tokens:${userId}`, ttlSeconds);
    
    console.log('Tokens refreshed successfully');
    return newTokens;

  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// API request helper with detailed error handling
async function apiRequest(url, accessToken) {
  try {
    console.log(`Making API request: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`API Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      throw new Error(`API_ERROR_${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Get orders for last 30 days - SINGLE REQUEST
async function getOrders(accessToken) {
  try {
    // Get seller ID first
    console.log('Getting seller ID...');
    const userResponse = await apiRequest(`${API_BASE_URL}/users/me`, accessToken);
    const sellerId = userResponse.id;
    
    console.log(`Seller ID: ${sellerId}`);

    // Calculate date range - last 30 days
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Format dates exactly like the curl example
    const fromISO = fromDate.toISOString().replace('Z', '-00:00');
    const toISO = toDate.toISOString().replace('Z', '-00:00');
    
    console.log(`Date range: ${fromISO} to ${toISO}`);

    // Single request with exact URL format
    const ordersUrl = `${API_BASE_URL}/orders/search?seller=${sellerId}&order.date_created.from=${fromISO}&order.date_created.to=${toISO}`;
    
    const ordersResponse = await apiRequest(ordersUrl, accessToken);
    
    console.log(`Found ${ordersResponse.results?.length || 0} orders`);
    
    return ordersResponse.results || [];

  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

// Process orders into simple analytics
async function processOrdersData(orders, accessToken) {
  try {
    console.log(`Processing ${orders.length} orders...`);
    
    // Group by item_id and variation_id
    const itemStats = {};
    
    orders.forEach(order => {
      if (!order.order_items) return;
      
      order.order_items.forEach(item => {
        const itemId = item.item.id;
        const variationId = item.item.variation_id || null;
        const key = `${itemId}_${variationId || 'no_var'}`;
        
        if (!itemStats[key]) {
          itemStats[key] = {
            item_id: itemId,
            variation_id: variationId,
            title: item.item.title,
            seller_sku: item.item.seller_sku,
            orders: [],
            total_quantity: 0
          };
        }
        
        itemStats[key].orders.push({
          date: order.date_created,
          quantity: item.quantity
        });
        
        itemStats[key].total_quantity += item.quantity;
      });
    });

    console.log(`Grouped into ${Object.keys(itemStats).length} unique items`);

    // Convert to simple array
    const analytics = Object.values(itemStats).map(stats => {
      const avgOrdersPerDay = stats.total_quantity / 30; // 30 days
      const lastSaleDate = stats.orders.length > 0 
        ? new Date(Math.max(...stats.orders.map(o => new Date(o.date).getTime())))
        : null;

      return {
        item_id: stats.item_id,
        variation_id: stats.variation_id,
        title: stats.title,
        seller_sku: stats.seller_sku,
        total_sales_quantity: stats.total_quantity,
        avg_orders_per_day: Math.round(avgOrdersPerDay * 100) / 100,
        last_sale_date: lastSaleDate?.toISOString() || null,
        days_since_last_sale: lastSaleDate 
          ? Math.floor((new Date() - lastSaleDate) / (1000 * 60 * 60 * 24))
          : null
      };
    });

    // Sort by highest sales velocity
    return analytics.sort((a, b) => b.avg_orders_per_day - a.avg_orders_per_day);

  } catch (error) {
    console.error('Error processing orders:', error);
    throw error;
  }
}

// Main API route handler
export async function GET(request) {
  try {
    console.log('Orders API called');

    // Check environment variables
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      console.error('Missing OAuth credentials');
      return NextResponse.json({ 
        error: 'MISSING_CREDENTIALS',
        message: 'OAuth credentials not configured'
      }, { status: 500 });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken();
    
    // Get orders
    const orders = await getOrders(accessToken);
    
    // Process into analytics
    const analytics = await processOrdersData(orders, accessToken);
    
    console.log(`Successfully processed ${analytics.length} items`);

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        total_items: analytics.length,
        total_orders: orders.length,
        days_analyzed: 30,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Orders API Error:', error.message);
    
    // Detailed error responses
    if (error.message === 'NO_TOKEN_FOUND') {
      return NextResponse.json({ 
        error: 'NO_AUTHENTICATION',
        message: 'No access token found - please connect to MercadoLibre first',
        needs_auth: true 
      }, { status: 401 });
    }
    
    if (error.message === 'TOKEN_EXPIRED_NO_REFRESH') {
      return NextResponse.json({ 
        error: 'SESSION_EXPIRED',
        message: 'Session expired and cannot refresh - please reconnect to MercadoLibre',
        needs_auth: true 
      }, { status: 401 });
    }
    
    if (error.message.startsWith('REFRESH_FAILED_')) {
      return NextResponse.json({ 
        error: 'REFRESH_FAILED',
        message: 'Could not refresh access token - please reconnect to MercadoLibre',
        needs_auth: true 
      }, { status: 401 });
    }
    
    if (error.message.startsWith('API_ERROR_401')) {
      return NextResponse.json({ 
        error: 'INVALID_TOKEN',
        message: 'Access token is invalid - please reconnect to MercadoLibre',
        needs_auth: true 
      }, { status: 401 });
    }
    
    if (error.message.startsWith('API_ERROR_403')) {
      return NextResponse.json({ 
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access token does not have required permissions for orders',
        needs_auth: true 
      }, { status: 403 });
    }
    
    if (error.message.startsWith('API_ERROR_')) {
      return NextResponse.json({ 
        error: 'MERCADOLIBRE_API_ERROR',
        message: `MercadoLibre API error: ${error.message}`,
        details: error.message
      }, { status: 502 });
    }
    
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Internal server error while processing orders',
      details: error.message
    }, { status: 500 });
  }
}