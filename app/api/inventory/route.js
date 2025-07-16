// app/api/inventory/route.js

import { NextResponse } from 'next/server';
// import { kv } from '@vercel/kv';
import { getMeliTokens, storeMeliTokens } from '@/lib/meliTokens';

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get valid access token with detailed error handling
async function getValidAccessToken() {
  try {
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;
    
    console.log('Getting tokens from KV...');
    const storedTokens = await getMeliTokens();
    
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
        client_id: process.env.MERCADO_LIBRE_APP_ID,
        client_secret: process.env.MERCADO_LIBRE_CLIENT_SECRET,
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
    await storeMeliTokens({ tokens: newTokens });

    console.log('Tokens refreshed successfully');
    return newTokens;

  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// Utility function for API requests with better error handling
async function apiRequest(url, accessToken) {
  try {
    console.log(`📡`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      throw new Error(`API_ERROR_${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    throw error;
  }
}

// Simplified function to get orders with proper validation
async function getOrders(accessToken, daysBack = 30) {
  try {
    const userResponse = await apiRequest(`${API_BASE_URL}/users/me`, accessToken);
    const sellerId = userResponse.id;
    console.log(`✅ Seller ID: ${sellerId}`);

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const fromISO = fromDate.toISOString().replace('Z', '-00:00');
    const toISO = toDate.toISOString().replace('Z', '-00:00');
    
    console.log(`📅 Date range: ${daysBack} days (${fromISO} to ${toISO})`);

    let allOrders = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const ordersUrl = `${API_BASE_URL}/orders/search?seller=${sellerId}&order.date_created.from=${fromISO}&order.date_created.to=${toISO}&limit=${limit}&offset=${offset}`;
      
      const response = await apiRequest(ordersUrl, accessToken);
      const orders = response.results || [];
      
      if (orders.length === 0) {
        break;
      }

      // Clean and validate order data
      const validOrders = orders
        .filter(order => order.order_items && order.order_items.length > 0)
        .map(order => {
          const item = order.order_items[0]; // Take first item for simplicity
          return {
            id: order.id,
            date_created: order.date_created,
            status: order.status,
            item_id: item.item?.id,
            variation_id: item.item?.variation_id,
            seller_sku: item.item?.seller_sku,
            title: item.item?.title,
            quantity: item.quantity || 0
          };
        })
        .filter(order => order.item_id); // Only keep orders with valid item_id

      allOrders = allOrders.concat(validOrders);
      
      console.log(`📦 Page ${allOrders.length}`);
      
      hasMore = orders.length === limit;
      offset += limit;
      
      // Safety break
      if (offset > 10000) {
        console.warn('⚠️ Reached safety limit, stopping pagination');
        break;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Total orders: ${allOrders.length}`);
    return allOrders;

  } catch (error) {
    console.error('❌ Error getting orders:', error.message);
    throw error;
  }
}

// Simplified function to get item data
async function getItemsData(accessToken, itemIds) {
  if (!itemIds || itemIds.length === 0) {
    console.log('⚠️ No item IDs to fetch');
    return new Map();
  }

  const validItemIds = itemIds.filter(id => id && id.toString().trim());
  if (validItemIds.length === 0) {
    console.log('⚠️ No valid item IDs found');
    return new Map();
  }

  
  const itemsData = new Map();
  const batchSize = 20;
  
  // Process in batches
  for (let i = 0; i < validItemIds.length; i += batchSize) {
    const batch = validItemIds.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    
    try {
      console.log(`📦 Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} items`);
      
      const url = `${API_BASE_URL}/items?ids=${idsParam}&attributes=id,title,available_quantity,status`;
      const response = await apiRequest(url, accessToken);
      
      // Handle response format
      const items = Array.isArray(response) ? response : [response];
      
      items.forEach(item => {
        const itemData = item.body || item;
        if (itemData && itemData.id) {
          itemsData.set(itemData.id, {
            id: itemData.id,
            title: itemData.title || 'Unknown Title',
            available_quantity: itemData.available_quantity || 0,
            status: itemData.status || 'unknown'
          });
        }
      });
      
      // Rate limiting between batches
      if (i + batchSize < validItemIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error fetching batch starting at index ${i}:`, error.message);
      // Continue with other batches
    }
  }  
  return itemsData;
}

// Simplified analytics function
async function generateAnalytics(accessToken, orders) {  
  // Filter orders by time periods
  const now = Date.now();
  const orders7d = orders.filter(order => {
    const orderDate = new Date(order.date_created).getTime();
    return (now - orderDate) <= (7 * 24 * 60 * 60 * 1000);
  });
  
  const orders30d = orders.filter(order => {
    const orderDate = new Date(order.date_created).getTime();
    return (now - orderDate) <= (30 * 24 * 60 * 60 * 1000);
  });
  
  console.log(`----------------------- Orders: 7d = ${orders7d.length}, 30d = ${orders30d.length} -------------------------`);
  
  // Get unique item IDs
  const uniqueItemIds = [...new Set(orders30d.map(order => order.item_id))];
  console.log(`----------------------- ${uniqueItemIds.length} unique items --------------------------`);
  
  // Fetch item data
  const itemsData = await getItemsData(accessToken, uniqueItemIds);
  
  // Group orders by item
  const itemAnalytics = new Map();
  
  orders30d.forEach(order => {
    const itemId = order.item_id;
    
    if (!itemAnalytics.has(itemId)) {
      itemAnalytics.set(itemId, {
        itemId,
        title: itemsData.get(itemId)?.title || 'Unknown Item',
        available_quantity: itemsData.get(itemId)?.available_quantity || 0,
        orders30d: [],
        orders7d: []
      });
    }
    
    itemAnalytics.get(itemId).orders30d.push(order);
  });
  
  // Add 7d orders
  orders7d.forEach(order => {
    const itemId = order.item_id;
    if (itemAnalytics.has(itemId)) {
      itemAnalytics.get(itemId).orders7d.push(order);
    }
  });
  
  // Calculate metrics
  const results = [];
  
  itemAnalytics.forEach((data, itemId) => {
    const qty30d = data.orders30d.reduce((sum, order) => sum + order.quantity, 0);
    const qty7d = data.orders7d.reduce((sum, order) => sum + order.quantity, 0);
    const avgPerDay30d = qty30d / 30;
    const avgPerDay7d = qty7d / 7;
    const daysInStock = avgPerDay30d > 0 ? data.available_quantity / avgPerDay30d : 999;
    
    results.push({
      itemId,
      title: data.title,
      metrics: {
        qty30d,
        qty7d,
        avgPerDay30d: Math.round(avgPerDay30d * 100) / 100,
        avgPerDay7d: Math.round(avgPerDay7d * 100) / 100,
        availableQty: data.available_quantity,
        daysInStock: Math.round(daysInStock)
      }
    });
  });
  
  // Sort by 30d quantity
  results.sort((a, b) => b.metrics.qty30d - a.metrics.qty30d);
  
  console.log(`✅ Analytics complete for ${results.length} items`);
  return results;
}

// Function to restructure analytics by variations/SKUs
function groupByVariations(analytics, orders) {
  const now = Date.now();
  
  // Filter orders by time periods
  const orders7d = orders.filter(order => {
    const orderDate = new Date(order.date_created).getTime();
    return (now - orderDate) <= (7 * 24 * 60 * 60 * 1000);
  });
  
  const orders30d = orders.filter(order => {
    const orderDate = new Date(order.date_created).getTime();
    return (now - orderDate) <= (30 * 24 * 60 * 60 * 1000);
  });

  return analytics.map(item => {
    // Get all orders for this item
    const itemOrders30d = orders30d.filter(order => order.item_id === item.itemId);
    const itemOrders7d = orders7d.filter(order => order.item_id === item.itemId);
    
    // Group orders by variation_id/seller_sku
    const variationGroups = new Map();
    
    // Process 30d orders to create variation groups
    itemOrders30d.forEach(order => {
      const key = order.variation_id || order.seller_sku || 'no_variation';
      
      if (!variationGroups.has(key)) {
        variationGroups.set(key, {
          variationId: order.variation_id,
          seller_sku: order.seller_sku,
          orders30d: [],
          orders7d: []
        });
      }
      
      variationGroups.get(key).orders30d.push(order);
    });
    
    // Add 7d orders to existing variations
    itemOrders7d.forEach(order => {
      const key = order.variation_id || order.seller_sku || 'no_variation';
      
      if (variationGroups.has(key)) {
        variationGroups.get(key).orders7d.push(order);
      }
    });
    
    // Calculate metrics for each variation
    const children = [];
    let totals = {
      qty7d: 0,
      avgPerDay7d: 0,
      qty30d: 0,
      avgPerDay30d: 0,
      availableQty: item.metrics.availableQty,
      daysInStock: 0
    };
    
    variationGroups.forEach((variation, key) => {
      const qty30d = variation.orders30d.reduce((sum, order) => sum + order.quantity, 0);
      const qty7d = variation.orders7d.reduce((sum, order) => sum + order.quantity, 0);
      const avgPerDay30d = Math.round((qty30d / 30) * 100) / 100;
      const avgPerDay7d = Math.round((qty7d / 7) * 100) / 100;
      
      // Add child variation
      children.push({
        variationId: variation.variationId,
        seller_sku: variation.seller_sku,
        qty7d,
        avgPerDay7d,
        qty30d,
        avgPerDay30d
      });
      
      // Add to totals
      totals.qty7d += qty7d;
      totals.qty30d += qty30d;
    });
    
    // Calculate final totals
    totals.avgPerDay7d = Math.round((totals.qty7d / 7) * 100) / 100;
    totals.avgPerDay30d = Math.round((totals.qty30d / 30) * 100) / 100;
    totals.daysInStock = totals.avgPerDay30d > 0 ? Math.round(totals.availableQty / totals.avgPerDay30d) : 999;
    
    // Sort children by qty30d descending
    children.sort((a, b) => b.qty30d - a.qty30d);
    
    return {
      itemId: item.itemId,
      title: item.title,
      totals,
      children
    };
  });
}

// Main function
async function runOrderAnalytics(accessToken, daysBack = 30) {
  try {

    // Get orders
    const orders = await getOrders(accessToken, daysBack);
    
    // Generate analytics
    const analytics = await generateAnalytics(accessToken, orders);
    const groupedAnalytics = groupByVariations(analytics, orders);

    // Display results
    console.log('='.repeat(60));    
    // console.log(JSON.stringify(groupedAnalytics[0], null, 2));

    return groupedAnalytics;
    
  } catch (error) {
    console.error('❌Analytics failed:', error.message);
    throw error;
  }
}

// Main API route handler
export async function GET(request) {
  try {
    console.log('Orders API called');

    // Check environment variables
    if (!process.env.MERCADO_LIBRE_APP_ID || !process.env.MERCADO_LIBRE_CLIENT_SECRET) {
      console.error('Missing OAuth credentials');
      return NextResponse.json({ 
        error: 'MISSING_CREDENTIALS',
        message: 'OAuth credentials not configured'
      }, { status: 500 });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken();
    
    // Get orders
    // const orders = await getOrders(accessToken)
    
    // Process into analytics
    const analytics = await runOrderAnalytics(accessToken);
    
    console.log(`Successfully processed ${analytics.length} items`);

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        total_items: analytics.length,
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