import { supabase } from "../supabase/client";

export async function get_packing(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('shipment_packing')
      .select('*')
      .eq('shipment_id', shipmentId)
      .maybeSingle();

    if (error) {
      console.error('Error getting packing status:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error getting packing status:', err);
    return null;
  }
}

export async function pack_shipment(shipmentId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Debes estar autenticado para empacar");
    }

    const { data, error } = await supabase
      .from('shipment_packing')
      .insert({
        shipment_id: shipmentId,
        packed_by_user_id: user.id,
        packed_by_name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
        packed_by_email: user.email
      })
      .select()
      .single();

    if (error) throw error;

    // Add success vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return data;
  } catch (err) {
    console.error('Packing error:', err);
    throw new Error(`Error al empacar: ${err.message}`);
  }
}

export async function repack_shipment(shipmentId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Debes estar autenticado para reempacar");
    }

    const { data, error } = await supabase
      .from('shipment_packing')
      .update({
        packed_by_user_id: user.id,
        packed_by_name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
        packed_by_email: user.email,
        updated_at: new Date().toISOString()
      })
      .eq('shipment_id', shipmentId)
      .select('*')
      .single();

    if (error) throw error;

    // If update succeeded but no data returned, fetch the record
    if (!data) {
      const { data: fetchedData, error: fetchError } = await supabase
        .from('shipment_packing')
        .select('*')
        .eq('shipment_id', shipmentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Add success vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      return fetchedData;
    }

    // Add success vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return data;
  } catch (err) {
    console.error('Repacking error:', err);
    throw new Error(`Error al reempacar: ${err.message}`);
  }
}

// Group shipment data by shipment_id (same logic as shipments page)
const groupShipmentData = (data) => {
  const shipmentMap = new Map();
  const allItems = [];
  
  data.forEach(item => {
    const shipmentId = item.shipment_id;
    
    // Create shipment summary
    if (!shipmentMap.has(shipmentId)) {
      const packingInfo = item.shipment_packing?.[0]; // Get first packing record
      shipmentMap.set(shipmentId, {
        shipment_id: shipmentId,
        shipment_status: item.shipment_status,
        shipment_updated: item.shipment_last_updated,
        account: item.nickname,
        total_orders: item.total_orders,
        total_items: item.total_items,
        category: item.name,
        shipment_created: item.shipment_created,
        sku_list: [item.seller_sku],
        packed_by_name: packingInfo?.packed_by_name || null,
        packed_at: packingInfo?.created_at || null,
        is_packed: !!packingInfo
      });
    } else {
      const existing = shipmentMap.get(shipmentId);
      if (!existing.sku_list.includes(item.seller_sku)) {
        existing.sku_list.push(item.seller_sku);
      }
    }
    
    // Add to items list
    allItems.push({
      sku: item.seller_sku,
      seller_sku: item.seller_sku,
      shipment_id: shipmentId,
      order_id: item.order_id,
      item_id: item.item_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      available_quantity: item.available_quantity,
      unit_price: item.unit_price,
      currency_id: item.currency_id,
      title: item.item_title,
      item_title: item.item_title,
      item_full_title: item.item_full_title,
      thumbnail: item.picture_url,
      item_thumbnail: item.picture_url,
      variation_attributes: item.variation_attributes,
      talle: (() => {
        if (!item.variation_attributes) return null;
        
        // Handle both array and object formats
        if (Array.isArray(item.variation_attributes)) {
          return item.variation_attributes.find(attr => 
            ['SIZE', 'TALLE', 'Talle', 'Size'].includes(attr.id || attr.name)
          )?.value_name || null;
        }
        
        // Handle object format (like in shipments page)
        if (typeof item.variation_attributes === 'object') {
          return Object.values(item.variation_attributes).find(attr => 
            attr && typeof attr === 'object' && attr.value_name &&
            ['SIZE', 'TALLE', 'Talle', 'Size'].includes(attr.name || attr.id)
          )?.value_name || null;
        }
        
        return null;
      })(),
      color: (() => {
        if (!item.variation_attributes) return null;
        
        // Handle both array and object formats  
        if (Array.isArray(item.variation_attributes)) {
          return item.variation_attributes.find(attr => 
            ['COLOR', 'Color', 'Colour', 'COLOUR'].includes(attr.id || attr.name)
          )?.value_name || null;
        }
        
        // Handle object format (like in shipments page)
        if (typeof item.variation_attributes === 'object') {
          return Object.values(item.variation_attributes).find(attr => 
            attr && typeof attr === 'object' && attr.value_name &&
            ['COLOR', 'Color', 'Colour', 'COLOUR'].includes(attr.name || attr.id)
          )?.value_name || null;
        }
        
        return null;
      })()
    });
  });

  return {
    shipments: Array.from(shipmentMap.values()),
    allItems
  };
};

// Get shipment data from views with fallback to API
export async function getShipmentData(shipmentId) {
  try {
    // First try to get from shipments_packing_view (same as shipments page)
    const { data: viewData, error: viewError } = await supabase
      .from('shipments_packing_view')
      .select('*')
      .eq('shipment_id', shipmentId);

    if (!viewError && viewData && viewData.length > 0) {
      console.log('✅ Database data found for shipment:', shipmentId, '- Items count:', viewData.length);
      
      // Use the same grouping logic as shipments page
      const { shipments, allItems } = groupShipmentData(viewData);
      
      return {
        source: 'database',
        items: allItems,
        shipmentInfo: shipments[0] || null
      };
    }

    // Log when database query fails or returns no data
    if (viewError) {
      console.log('Database query error:', viewError.message);
    } else if (!viewData || viewData.length === 0) {
      console.log('Database query returned no results for shipment:', shipmentId);
    }

    // Fallback to API if not found in views
    console.log('Falling back to API for shipment:', shipmentId);
    const { extractShipmentInfo } = await import('../api/index.js');
    const apiData = await extractShipmentInfo(shipmentId);
    
    return {
      source: 'api',
      items: apiData,
      shipmentInfo: null
    };
  } catch (err) {
    console.error('Error getting shipment data:', err);
    throw err;
  }
}