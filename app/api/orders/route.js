// app/api/orders/route.js

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get valid access token (same pattern as other routes)
async function getValidAccessToken() {
  try {
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;
    
    const storedTokens = await kv.hgetall(tokenKey);
    
    if (!storedTokens || !storedTokens.access_token) {
      throw new Error('No access token found - please authenticate first');
    }

    const expiresAt = parseInt(storedTokens.expires_at);
    const now = Date.now();
    const isExpired = now >= expiresAt;

    if (!isExpired) {
      return storedTokens.access_token;
    }

    // Auto-refresh logic (same as other routes)
    if (!storedTokens.refresh_token) {
      throw new Error('Access token expired and no refresh token available');
    }

    const newTokens = await refreshTokensInternal(storedTokens.refresh_token, userId);
    return newTokens.access_token;

  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

// Refresh tokens helper (same as other routes)
async function refreshTokensInternal(refreshToken, userId) {
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
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();
  
  const newTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken,
    expires_in: tokenData.expires_in || 3600,
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
  };

  await kv.hset(`oauth_tokens:${userId}`, {
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    expires_at: newTokens.expires_at.toString(),
    token_type: 'Bearer'
  });

  const ttlSeconds = Math.floor((newTokens.expires_at - Date.now()) / 1000) + 300;
  await kv.expire(`oauth_tokens:${userId}`, ttlSeconds);
  
  return newTokens;
}

// API request helper
async function apiRequest(url, accessToken) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} - ${url}`);
  }

  return response.json();
}

// Get all orders (paginated)
async function getAllOrders(accessToken, daysBack = 30) {
  const orders = [];
  let offset = 0;
  const limit = 50;
  
  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();
  
  try {
    while (true) {
      const url = `${API_BASE_URL}/orders/search?seller_id=me&order.date_created.from=${fromISO}&order.date_created.to=${toISO}&offset=${offset}&limit=${limit}`;
      const response = await apiRequest(url, accessToken);
      
      if (!response.results || response.results.length === 0) {
        break;
      }
      
      orders.push(...response.results);
      offset += limit;
      
      // Prevent infinite loop
      if (offset >= response.paging.total || orders.length >= 1000) {
        break;
      }
    }
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

// Get item details with variations
async function getItemWithVariations(itemId, accessToken) {
  try {
    const [itemDetails, variationsResponse] = await Promise.all([
      apiRequest(`${API_BASE_URL}/items/${itemId}`, accessToken),
      apiRequest(`${API_BASE_URL}/items/${itemId}/variations`, accessToken)
    ]);
    
    return {
      item: itemDetails,
      variations: variationsResponse || []
    };
  } catch (error) {
    console.error(`Error fetching item ${itemId} with variations:`, error);
    return { item: null, variations: [] };
  }
}

// Calculate analytics for each item/variation
async function calculateAnalytics(orders, accessToken, daysBack = 30) {
  console.log(`Processing ${orders.length} orders from last ${daysBack} days`);
  
  // Group orders by item_id and variation_id
  const itemStats = {};
  
  orders.forEach(order => {
    if (!order.order_items) return;
    
    order.order_items.forEach(item => {
      const itemId = item.item.id;
      const variationId = item.item.variation_id || 'no_variation';
      const key = `${itemId}_${variationId}`;
      
      if (!itemStats[key]) {
        itemStats[key] = {
          item_id: itemId,
          variation_id: variationId === 'no_variation' ? null : variationId,
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
  
  // Get unique item IDs
  const uniqueItemIds = [...new Set(Object.values(itemStats).map(stat => stat.item_id))];
  
  // Fetch item details for all unique items
  const itemDetails = {};
  await Promise.all(
    uniqueItemIds.map(async (itemId) => {
      itemDetails[itemId] = await getItemWithVariations(itemId, accessToken);
    })
  );
  
  // Calculate analytics for each variation
  const analytics = [];
  
  for (const [key, stats] of Object.entries(itemStats)) {
    const itemData = itemDetails[stats.item_id];
    const item = itemData?.item;
    const variations = itemData?.variations || [];
    
    if (!item) continue;
    
    // Find the specific variation
    const variation = stats.variation_id 
      ? variations.find(v => v.id === stats.variation_id)
      : null;
    
    // Calculate velocity (orders per day)
    const avgOrdersPerDay = stats.total_quantity / daysBack;
    
    // Get current inventory
    const availableQuantity = variation?.available_quantity || item.available_quantity || 0;
    
    // Calculate days left in inventory
    const daysLeft = avgOrdersPerDay > 0 ? Math.floor(availableQuantity / avgOrdersPerDay) : 999;
    
    // Extract attributes
    const attributes = variation?.attributes || item.attributes || [];
    const attributeCombinations = variation?.attribute_combinations || [];
    
    const sellerSku = attributes.find(attr => attr.id === 'SELLER_SKU')?.value_name || null;
    const color = attributeCombinations.find(attr => attr.id === 'COLOR')?.value_name || null;
    const size = attributeCombinations.find(attr => attr.id === 'SIZE')?.value_name || null;
    
    // Get last sale date
    const lastSaleDate = stats.orders.length > 0 
      ? new Date(Math.max(...stats.orders.map(o => new Date(o.date).getTime())))
      : null;
    
    // Stock status
    let stockStatus = 'good';
    if (availableQuantity === 0) stockStatus = 'out_of_stock';
    else if (daysLeft <= 7) stockStatus = 'low_stock';
    else if (daysLeft <= 30) stockStatus = 'moderate_stock';
    
    analytics.push({
      item_id: stats.item_id,
      variation_id: stats.variation_id,
      seller_sku: sellerSku,
      title: item.title,
      color: color,
      size: size,
      thumbnail: variation?.picture_ids?.[0] 
        ? `https://http2.mlstatic.com/D_NQ_NP_${variation.picture_ids[0]}-O.jpg`
        : item.thumbnail,
      category: item.category_id,
      condition: item.condition,
      listing_status: item.status,
      available_quantity: availableQuantity,
      total_sales_quantity: stats.total_quantity,
      avg_orders_per_day: Math.round(avgOrdersPerDay * 100) / 100,
      days_left_inventory: daysLeft,
      stock_status: stockStatus,
      last_sale_date: lastSaleDate?.toISOString() || null,
      days_since_last_sale: lastSaleDate 
        ? Math.floor((new Date() - lastSaleDate) / (1000 * 60 * 60 * 24))
        : null
    });
  }
  
  return analytics.sort((a, b) => b.avg_orders_per_day - a.avg_orders_per_day);
}

// Main API route handler
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days')) || 30;
    
    console.log(`Generating analytics for last ${daysBack} days`);
    
    // Get valid access token
    const accessToken = await getValidAccessToken();
    
    // Get all orders
    const orders = await getAllOrders(accessToken, daysBack);
    
    // Calculate analytics
    const analytics = await calculateAnalytics(orders, accessToken, daysBack);
    
    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        total_items: analytics.length,
        days_analyzed: daysBack,
        total_orders: orders.length,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Analytics API Error:', error);
    
    if (error.message.includes('No access token found') || error.message.includes('please authenticate first')) {
      return NextResponse.json({ 
        error: 'Not authenticated - please connect to MercadoLibre first', 
        needs_auth: true 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate analytics', 
      details: error.message 
    }, { status: 500 });
  }
}