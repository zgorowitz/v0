import { NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get access token from environment variables
const accessToken = process.env.MERCADOLIBRE_ACCESS_TOKEN;

// Reusable fetch function with authentication
async function apiRequest(url) {
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

// Get shipment data from MercadoLibre API
async function getShipmentData(shipmentId) {
  try {
    const url = `${API_BASE_URL}/shipments/${shipmentId}`;
    return await apiRequest(url);
  } catch (error) {
    console.error('Error fetching shipment data:', error);
    throw error;
  }
}

// Get both shipment and items data
async function getShipmentWithItems(shipmentId) {
  try {
    const shipmentData = await getShipmentData(shipmentId);
    
    // Extract unique item IDs
    const itemIds = [...new Set(shipmentData.shipping_items.map(item => item.id))];
    
    // Fetch items data with required attributes
    const itemIdsString = itemIds.join(',');
    const url = `${API_BASE_URL}/items?ids=${itemIdsString}&attributes=id,title,thumbnail,pictures,seller_custom_field`;
    const itemsData = await apiRequest(url);
    
    return { shipmentData, itemsData };
  } catch (error) {
    console.error('Error fetching items data:', error);
    throw error;
  }
}

// Extract and format shipment information
async function extractShipmentInfo(shipmentId) {
  try {
    const { shipmentData, itemsData } = await getShipmentWithItems(shipmentId);
    console.log('---------  shipmentData', shipmentData);
    console.log('---------  itemsData', itemsData); 
    
    // Create lookup map for item details
    const itemsMap = new Map();
    itemsData.forEach(item => {
      if (item.body) {
        itemsMap.set(item.body.id, item.body);
      }
    });
    
    // Process each shipping item
    return shipmentData.shipping_items.map(shippingItem => {
      const itemDetails = itemsMap.get(shippingItem.id);
      console.log('---------  success', itemDetails?.id);
      return {
        order_id: shipmentData.order_id,
        item_id: shippingItem.id,
        sku: itemDetails?.seller_custom_field || null,
        quantity: shippingItem.quantity,
        image: itemDetails?.thumbnail || null,
        title: itemDetails?.title || shippingItem.description
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
    
    // Check if access token is configured
    if (!accessToken) {
      console.error('MERCADOLIBRE_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }
    
    // Extract shipment information
    const shipmentInfo = await extractShipmentInfo(id);
    
    // Return the first item (or modify as needed for multiple items)
    const result = shipmentInfo.length > 0 ? shipmentInfo[0] : null;
    
    if (!result) {
      return NextResponse.json({ error: 'No shipment data found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error.message.includes('status: 404')) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    
    if (error.message.includes('status: 401') || error.message.includes('status: 403')) {
      return NextResponse.json({ error: 'Authentication failed - check API credentials' }, { status: 401 });
    }
    
    if (error.message.includes('status: 429')) {
      return NextResponse.json({ error: 'Rate limit exceeded - please try again later' }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 });
  }
}

// const API_BASE_URL = 'https://api.mercadolibre.com';

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

// // Get shipment data from MercadoLibre API
// async function getShipmentData(shipmentId) {
//   try {
//     const url = `${API_BASE_URL}/shipments/${shipmentId}`;
//     return await apiRequest(url, accessToken);
//   } catch (error) {
//     console.error('Error fetching shipment data:', error);
//     throw error;
//   }
// }

// // Get both shipment and items data
// async function getShipmentWithItems(shipmentId) {
//   try {
//     const shipmentData = await getShipmentData(shipmentId, accessToken);
    
//     // Extract unique item IDs
//     const itemIds = [...new Set(shipmentData.shipping_items.map(item => item.id))];
    
//     // Fetch items data with required attributes
//     const itemIdsString = itemIds.join(',');
//     const url = `${API_BASE_URL}/items?ids=${itemIdsString}&attributes=id,title,thumbnail,pictures,seller_custom_field`;
//     const itemsData = await apiRequest(url, accessToken);
    
//     return { shipmentData, itemsData };
//   } catch (error) {
//     console.error('Error fetching items data:', error);
//     throw error;
//   }
// }

// // Extract and format shipment information
// export async function extractShipmentInfo(shipmentId) {
//   try {
//     const { shipmentData, itemsData } = await getShipmentWithItems(shipmentId, accessToken);
//     console.log('---------  shipmentData', shipmentData);
//     console.log('---------  itemsData', itemsData); 
//     // Create lookup map for item details
//     const itemsMap = new Map();
//     itemsData.forEach(item => {
//       if (item.body) {
//         itemsMap.set(item.body.id, item.body);
//       }
//     });
    
//     // Process each shipping item
//     return shipmentData.shipping_items.map(shippingItem => {
//       const itemDetails = itemsMap.get(shippingItem.id);
//       console.log('---------  success', itemDetails.id);
//       return {
//         order_id: shipmentData.order_id,
//         item_id: shippingItem.id,
//         sku: itemDetails?.seller_custom_field || null,
//         quantity: shippingItem.quantity,
//         image: itemDetails?.thumbnail || null,
//         title: itemDetails?.title || shippingItem.description
//       };
//     });
//   } catch (error) {
//     console.error('Error extracting shipment info:', error);
//     throw error;
//   }
// }

// Export other functions if needed elsewhere
// export { getShipmentData, getShipmentWithItems, apiRequest };
// const shipmentId = '45129712335'; 
// extractShipmentInfo(shipmentId);