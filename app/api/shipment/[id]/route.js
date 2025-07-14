import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get access token from Vercel KV with validation and auto-refresh
async function getValidAccessToken() {
  try {
    const userId = 'default_user';
    const tokenKey = `oauth_tokens:${userId}`;
    
    // 1. GET TOKENS FROM STORAGE
    const storedTokens = await kv.hgetall(tokenKey);
    
    if (!storedTokens || !storedTokens.access_token) {
      throw new Error('No access token found in storage - please authenticate first');
    }

    // 2. CHECK TOKEN EXPIRATION
    const expiresAt = parseInt(storedTokens.expires_at);
    const now = Date.now();
    const isExpired = now >= expiresAt;

    // 3. IF TOKEN NOT EXPIRED, RETURN IT
    if (!isExpired) {
      return storedTokens.access_token;
    }

    // 4. TOKEN IS EXPIRED - TRY TO REFRESH
    console.log('Access token expired, attempting refresh...');
    
    if (!storedTokens.refresh_token) {
      throw new Error('Access token expired and no refresh token available - please re-authenticate');
    }

    // 5. REFRESH TOKEN
    const newTokens = await refreshTokensInternal(storedTokens.refresh_token, userId);
    console.log('Token refresh successful');
    
    return newTokens.access_token;

  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

// INTERNAL HELPER: Refresh tokens (same logic as refresh route)
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
      client_id: process.env.MERCADO_LIBRE_APP_ID,
      client_secret: process.env.MERCADO_LIBRE_CLIENT_SECRET,
      refresh_token: refreshToken
    })
  };

  const response = await fetch(tokenEndpoint, refreshRequest);
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();
  
  if (!tokenData.access_token) {
    throw new Error('No access token in refresh response');
  }

  const newTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken,
    expires_in: tokenData.expires_in || 3600,
    token_type: tokenData.token_type || 'Bearer',
    expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000)
  };

  // Store new tokens
  await storeTokensInKV(userId, newTokens);
  
  return newTokens;
}

// HELPER: Store tokens in Vercel KV
async function storeTokensInKV(userId, tokens) {
  const key = `oauth_tokens:${userId}`;
  
  await kv.hset(key, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at.toString(),
    token_type: tokens.token_type
  });
  
}

// Reusable fetch function with authentication
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

// Get shipment items data from MercadoLibre API
async function getShipmentData(shipmentId, accessToken) {
  try {
    const url = `${API_BASE_URL}/shipments/${shipmentId}/items`;
    return await apiRequest(url, accessToken);
  } catch (error) {
    console.error('Error fetching shipment items data:', error);
    throw error;
  }
}

// Get variation data for a specific item
async function getItemVariation(itemId, variationId, accessToken) {
  try {
    const url = `${API_BASE_URL}/items/${itemId}/variations/${variationId}`;
    return await apiRequest(url, accessToken);
  } catch (error) {
    console.error(`Error fetching variation data for item ${itemId}, variation ${variationId}:`, error);
    throw error;
  }
}

// Get item details (for thumbnail and title)
async function getItemDetails(itemId, accessToken) {
  try {
    const url = `${API_BASE_URL}/items/${itemId}`;
    return await apiRequest(url, accessToken);
  } catch (error) {
    console.error(`Error fetching item details for item ${itemId}:`, error);
    throw error;
  }
}

// Get both shipment items and their variations data
async function getShipmentWithItems(shipmentId, accessToken) {
  try {
    const shipmentItems = await getShipmentData(shipmentId, accessToken);
    
    // Fetch variation data and item details for each item
    const itemsWithVariations = await Promise.all(
      shipmentItems.map(async (shipmentItem) => {
        try {
          const [variationData, itemDetails] = await Promise.all([
            shipmentItem.variation_id ? getItemVariation(shipmentItem.item_id, shipmentItem.variation_id, accessToken) : null,
            getItemDetails(shipmentItem.item_id, accessToken)
          ]);
          
          return {
            ...shipmentItem,
            variationData,
            itemDetails
          };
        } catch (error) {
          console.error(`Error fetching data for item ${shipmentItem.item_id}:`, error);
          return {
            ...shipmentItem,
            variationData: null,
            itemDetails: null
          };
        }
      })
    );
    
    return itemsWithVariations;
  } catch (error) {
    console.error('Error fetching shipment with items data:', error);
    throw error;
  }
}

// Extract and format shipment information
async function extractShipmentInfo(shipmentId) {
  try {
    // Get VALID access token from KV storage (with auto-refresh)
    const accessToken = await getValidAccessToken();
    
    const shipmentItemsData = await getShipmentWithItems(shipmentId, accessToken);
    console.log('---------  shipmentItemsData', shipmentItemsData);
    
    // Process each shipping item
    return shipmentItemsData.map(shipmentItem => {
      const variation = shipmentItem.variationData;
      const itemDetails = shipmentItem.itemDetails;
      
      console.log('---------  processing item', shipmentItem.item_id);
      
      // Extract seller_sku from attributes array
      const sellerSku = variation?.attributes?.find(attr => attr.id === 'SELLER_SKU')?.value_name || null;
      
      // Extract color from attribute_combinations array
      const color = variation?.attribute_combinations?.find(attr => attr.id === 'COLOR')?.value_name || null;
      
      // Extract talle (size) from attribute_combinations array
      const talle = variation?.attribute_combinations?.find(attr => attr.id === 'SIZE')?.value_name || null;
      
      // Extract fabric_type from attribute_combinations array (FABRIC_DESIGN)
      const fabricType = variation?.attribute_combinations?.find(attr => attr.id === 'FABRIC_DESIGN')?.value_name || null;
      
      // Get thumbnail from item details only
    //   const thumbnail = itemDetails?.thumbnail || null;
      const firstPictureId = variation.picture_ids[0];
      const thumbnail = itemDetails.pictures.find(pic => pic.id === firstPictureId)?.url;
  
      
      return {
        order_id: shipmentItem.order_id,
        item_id: shipmentItem.item_id,
        variation_id: shipmentItem.variation_id,
        seller_sku: sellerSku,
        color: color,
        talle: talle,
        available_quantity: variation?.available_quantity || 0,
        fabric_type: fabricType,
        thumbnail: thumbnail,
        title: itemDetails?.title || shipmentItem.description || null,
        quantity: shipmentItem.quantity
      };
    });
  } catch (error) {
    console.error('Error extracting shipment info:', error);
    throw error;
  }
}

// API Route Handler
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Validate shipment ID
    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }
    
    // Extract shipment information (access token validation and refresh handled inside)
    const shipmentInfo = await extractShipmentInfo(id);
    
    return NextResponse.json(shipmentInfo);
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error.message.includes('status: 404')) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    
    if (error.message.includes('status: 401') || error.message.includes('status: 403')) {
      return NextResponse.json({ error: 'Autenticación fallida: El token puede estar expirado, el ID de envío puede ser incorrecto o el envío puede pertenecer a una cuenta de Mercado Libre diferente a la actualmente autenticada.' }, { status: 401 });
    }
    
    if (error.message.includes('status: 429')) {
      return NextResponse.json({ error: 'Rate limit exceeded - please try again later' }, { status: 429 });
    }
    
    // Handle authentication errors
    if (error.message.includes('No access token found') || error.message.includes('please authenticate first')) {
      return NextResponse.json({ error: 'Not authenticated - please connect to MercadoLibre first', needs_auth: true }, { status: 401 });
    }
    
    if (error.message.includes('Token refresh failed') || error.message.includes('please re-authenticate')) {
      return NextResponse.json({ error: 'Session expired - please reconnect to MercadoLibre', needs_auth: true }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 });
  }
}
// import { NextResponse } from 'next/server'

// const API_BASE_URL = 'https://api.mercadolibre.com';

// // Get access token from environment variables
// const accessToken = process.env.ACCESS_TOKEN;

// // Reusable fetch function with authentication
// async function apiRequest(url) {
//   const response = await fetch(url, {
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     }
//   });

//   if (!response.ok) {
//     throw new Error(`HTTP error! status: ${response.status} - ${url}`);
//   }

//   return response.json();
// }

// // Get shipment items data from MercadoLibre API
// async function getShipmentData(shipmentId) {
//   try {
//     const url = `${API_BASE_URL}/shipments/${shipmentId}/items`;
//     return await apiRequest(url);
//   } catch (error) {
//     console.error('Error fetching shipment items data:', error);
//     throw error;
//   }
// }

// // Get variation data for a specific item
// async function getItemVariation(itemId, variationId) {
//   try {
//     const url = `${API_BASE_URL}/items/${itemId}/variations/${variationId}`;
//     return await apiRequest(url);
//   } catch (error) {
//     console.error(`Error fetching variation data for item ${itemId}, variation ${variationId}:`, error);
//     throw error;
//   }
// }

// // Get item details (for thumbnail and title)
// async function getItemDetails(itemId) {
//   try {
//     const url = `${API_BASE_URL}/items/${itemId}`;
//     return await apiRequest(url);
//   } catch (error) {
//     console.error(`Error fetching item details for item ${itemId}:`, error);
//     throw error;
//   }
// }

// // Get both shipment items and their variations data
// async function getShipmentWithItems(shipmentId) {
//   try {
//     const shipmentItems = await getShipmentData(shipmentId);
    
//     // Fetch variation data and item details for each item
//     const itemsWithVariations = await Promise.all(
//       shipmentItems.map(async (shipmentItem) => {
//         try {
//           const [variationData, itemDetails] = await Promise.all([
//             shipmentItem.variation_id ? getItemVariation(shipmentItem.item_id, shipmentItem.variation_id) : null,
//             getItemDetails(shipmentItem.item_id)
//           ]);
          
//           return {
//             ...shipmentItem,
//             variationData,
//             itemDetails
//           };
//         } catch (error) {
//           console.error(`Error fetching data for item ${shipmentItem.item_id}:`, error);
//           return {
//             ...shipmentItem,
//             variationData: null,
//             itemDetails: null
//           };
//         }
//       })
//     );
    
//     return itemsWithVariations;
//   } catch (error) {
//     console.error('Error fetching shipment with items data:', error);
//     throw error;
//   }
// }

// // Extract and format shipment information
// async function extractShipmentInfo(shipmentId) {
//   try {
//     const shipmentItemsData = await getShipmentWithItems(shipmentId);
//     console.log('---------  shipmentItemsData', shipmentItemsData);
    
//     // Process each shipping item
//     return shipmentItemsData.map(shipmentItem => {
//       const variation = shipmentItem.variationData;
//       const itemDetails = shipmentItem.itemDetails;
      
//       console.log('---------  processing item', shipmentItem.item_id);
      
//       // Extract seller_sku from attributes array
//       const sellerSku = variation?.attributes?.find(attr => attr.id === 'SELLER_SKU')?.value_name || null;
      
//       // Extract color from attribute_combinations array
//       const color = variation?.attribute_combinations?.find(attr => attr.id === 'COLOR')?.value_name || null;
      
//       // Extract talle (size) from attribute_combinations array
//       const talle = variation?.attribute_combinations?.find(attr => attr.id === 'SIZE')?.value_name || null;
      
//       // Extract fabric_type from attribute_combinations array (FABRIC_DESIGN)
//       const fabricType = variation?.attribute_combinations?.find(attr => attr.id === 'FABRIC_DESIGN')?.value_name || null;
      
//       // Get thumbnail from item details only
//       const thumbnail = itemDetails?.thumbnail || null;
      
//       return {
//         order_id: shipmentItem.order_id,
//         item_id: shipmentItem.item_id,
//         variation_id: shipmentItem.variation_id,
//         seller_sku: sellerSku,
//         color: color,
//         talle: talle,
//         available_quantity: variation?.available_quantity || 0,
//         fabric_type: fabricType,
//         thumbnail: thumbnail,
//         title: itemDetails?.title || shipmentItem.description || null,
//         quantity: shipmentItem.quantity
//       };
//     });
//   } catch (error) {
//     console.error('Error extracting shipment info:', error);
//     throw error;
//   }
// }

// // API Route Handler
// export async function GET(request, { params }) {
//   try {
//     const { id } = params;
    
//     // Validate shipment ID
//     if (!id) {
//       return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
//     }
    
//     // Check if access token is configured
//     if (!accessToken) {
//       console.error('MERCADOLIBRE_ACCESS_TOKEN not configured');
//       return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
//     }
    
//     // Extract shipment information
//     const shipmentInfo = await extractShipmentInfo(id);
    
//     return NextResponse.json(shipmentInfo);
    
//   } catch (error) {
//     console.error('API Error:', error);
    
//     // Handle specific error types
//     if (error.message.includes('status: 404')) {
//       return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
//     }
    
//     if (error.message.includes('status: 401') || error.message.includes('status: 403')) {
//       return NextResponse.json({ error: 'Authentication failed - check API credentials' }, { status: 401 });
//     }
    
//     if (error.message.includes('status: 429')) {
//       return NextResponse.json({ error: 'Rate limit exceeded - please try again later' }, { status: 429 });
//     }
    
//     return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 });
//   }
// }