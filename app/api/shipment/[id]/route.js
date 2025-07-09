import { NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.mercadolibre.com';

// Get access token from environment variables
const accessToken = process.env.ACCESS_TOKEN;

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

// Get shipment items data from MercadoLibre API
async function getShipmentData(shipmentId) {
  try {
    const url = `${API_BASE_URL}/shipments/${shipmentId}/items`;
    return await apiRequest(url);
  } catch (error) {
    console.error('Error fetching shipment items data:', error);
    throw error;
  }
}

// Get variation data for a specific item
async function getItemVariation(itemId, variationId) {
  try {
    const url = `${API_BASE_URL}/items/${itemId}/variations/${variationId}`;
    return await apiRequest(url);
  } catch (error) {
    console.error(`Error fetching variation data for item ${itemId}, variation ${variationId}:`, error);
    throw error;
  }
}

// Get item details (for thumbnail and title)
async function getItemDetails(itemId) {
  try {
    const url = `${API_BASE_URL}/items/${itemId}`;
    return await apiRequest(url);
  } catch (error) {
    console.error(`Error fetching item details for item ${itemId}:`, error);
    throw error;
  }
}

// Get both shipment items and their variations data
async function getShipmentWithItems(shipmentId) {
  try {
    const shipmentItems = await getShipmentData(shipmentId);
    
    // Fetch variation data and item details for each item
    const itemsWithVariations = await Promise.all(
      shipmentItems.map(async (shipmentItem) => {
        try {
          const [variationData, itemDetails] = await Promise.all([
            shipmentItem.variation_id ? getItemVariation(shipmentItem.item_id, shipmentItem.variation_id) : null,
            getItemDetails(shipmentItem.item_id)
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
    const shipmentItemsData = await getShipmentWithItems(shipmentId);
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
      const thumbnail = itemDetails?.thumbnail || null;
      
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
    
    // Check if access token is configured
    if (!accessToken) {
      console.error('MERCADOLIBRE_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }
    
    // Extract shipment information
    const shipmentInfo = await extractShipmentInfo(id);
    
    return NextResponse.json(shipmentInfo);
    
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