import { supabase } from "../supabase/client";

// ============================================================================
// SCAN SESSION TRACKING
// ============================================================================

export async function track_scan_session(shipmentId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Debes estar autenticado para rastrear escaneos");
    }

    const { data, error } = await supabase
      .from('scan_sessions')
      .insert({
        shipment_id: shipmentId,
        user_id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
        email: user.email
      })
      .select()
      .single();

    if (error) {
      // If shipment already scanned by this or another user, ignore the error
      if (error.code === '23505') { // unique constraint violation
        console.log(`Shipment ${shipmentId} already scanned`);
        return null;
      }
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Scan session tracking error:', err);
    // Don't throw error to avoid breaking the scan flow
    return null;
  }
}

export async function track_multiple_scan_sessions(shipmentIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Debes estar autenticado para rastrear escaneos");
    }

    const scanSessions = shipmentIds.map(shipmentId => ({
      shipment_id: shipmentId,
      user_id: user.id,
      name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
      email: user.email
    }));

    const { data, error } = await supabase
      .from('scan_sessions')
      .insert(scanSessions)
      .select();

    if (error) {
      console.error('Multiple scan session tracking error:', error);
      // Don't throw error to avoid breaking the scan flow
      return null;
    }

    return data;
  } catch (err) {
    console.error('Multiple scan session tracking error:', err);
    return null;
  }
}

export async function get_scan_sessions(userId = null) {
  try {
    let query = supabase
      .from('scan_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting scan sessions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting scan sessions:', err);
    return [];
  }
}

// ============================================================================
// PACKING FUNCTIONS
// ============================================================================

export async function get_packing(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('shipment_packing')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false })
      .limit(1)
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

export async function get_multiple_packing(shipmentIds) {
  try {
    const { data, error } = await supabase
      .from('shipment_packing')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting multiple packing status:', error);
      return {};
    }

    // Create a map with the latest packing info for each shipment
    const packingMap = {};
    data?.forEach(record => {
      if (!packingMap[record.shipment_id]) {
        packingMap[record.shipment_id] = record;
      }
    });

    return packingMap;
  } catch (err) {
    console.error('Error getting multiple packing status:', err);
    return {};
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

    if (error) {
      if (error.code === '23505') {
        // Already packed, get existing data
        return await get_packing(shipmentId);
      }
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Packing error:', err);
    throw new Error(`Error al empacar: ${err.message}`);
  }
}

export async function pack_multiple_shipments(shipmentIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Debes estar autenticado para empacar");
    }

    const packingData = shipmentIds.map(shipmentId => ({
      shipment_id: shipmentId,
      packed_by_user_id: user.id,
      packed_by_name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
      packed_by_email: user.email
    }));

    const { data, error } = await supabase
      .from('shipment_packing')
      .insert(packingData)
      .select();

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Multiple packing error:', err);
    throw new Error(`Error al empacar múltiples envíos: ${err.message}`);
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
      })(),
      // Add order notes from the view
      order_notes: item.order_notes || null,
      notes_count: item.notes_count || 0,
      latest_note_date: item.latest_note_date || null,
      user_product_id: item.user_product_id
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