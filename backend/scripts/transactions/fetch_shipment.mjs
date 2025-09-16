// scripts/fetch_shipments.mjs
// Fetch shipment status for meli orders

import { createClient, getMeliUsers } from '../../lib/supabase/script-client.js'

// API request with auth and x-format-new header
async function apiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-format-new': 'true',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Parse shipment data
function parseShipment(shipment, meliUserId) {
  if (!shipment.id) {
    throw new Error(`Shipment missing required ID field: ${JSON.stringify(shipment)}`)
  }
  
  return {
    id: shipment.id,
    meli_user_id: meliUserId,
    status: shipment.status || null,
    substatus: shipment.substatus || null,
    tracking_number: shipment.tracking_number || null,
    tracking_method: shipment.tracking_method || null,
    date_created: shipment.date_created || null,
    last_updated: shipment.last_updated || null,
    declared_value: shipment.declared_value || 0,
    logistic_mode: shipment.logistic?.mode || null,
    logistic_type: shipment.logistic?.type || null,
    logistic_direction: shipment.logistic?.direction || null,
    priority_class_id: shipment.priority_class?.id || null,
    origin_node: shipment.origin?.node || null,
    origin_sender_id: shipment.origin?.sender_id || null,
    origin_type: shipment.origin?.type || null,
    origin_address: shipment.origin?.shipping_address || null,
    destination_receiver_id: shipment.destination?.receiver_id || null,
    destination_receiver_name: shipment.destination?.receiver_name || null,
    destination_receiver_phone: shipment.destination?.receiver_phone || null,
    destination_type: shipment.destination?.type || null,
    destination_address: shipment.destination?.shipping_address || null,
    source_site_id: shipment.source?.site_id || null,
    source_market_place: shipment.source?.market_place || null,
    tags: shipment.tags || null,
    items_types: shipment.items_types || null,
    lead_time: shipment.lead_time || null,
    dimensions: shipment.dimensions || null,
    snapshot_packing: shipment.snapshot_packing || null,
    sibling: shipment.sibling || null,
    external_reference: shipment.external_reference || null,
    quotation: shipment.quotation || null
  }
}

// Get shipment IDs with meli_user_id that need to be fetched
async function getShipmentsToFetch(supabase) {
  const sixHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Get shipment IDs with meli_user_id from meli_orders where fulfilled = false and updated in last 6 hours
  const { data: orderShipments, error: orderError } = await supabase
    .from('meli_orders')
    .select('shipping_id, meli_user_id')
    .eq('fulfilled', false)
    .gte('date_last_updated', sixHoursAgo)
    .not('shipping_id', 'is', null)

  if (orderError) throw orderError

  // Convert to Map for shipment ID -> meli_user_id mapping
  const shipments = new Map()

  orderShipments?.forEach(row => {
    if (row.shipping_id) {
      shipments.set(row.shipping_id, row.meli_user_id)
    }
  })

  return shipments
}

// Main function
export async function fetchShipments() {

  const supabase = createClient()
  const BATCH_SIZE = 50 // Batch size for API calls

  // Get all meli users with their tokens
  const meliUsers = await getMeliUsers()
  
  // Get shipments that need to be fetched with their meli_user_id
  const shipmentsMap = await getShipmentsToFetch(supabase)
  
  console.log(`Fetching ${shipmentsMap.size} shipments`)
  
  // Group shipments by meli_user_id
  const shipmentsByUser = new Map()
  
  for (const [shipmentId, meliUserId] of shipmentsMap) {
    if (!meliUserId) {
      // If no meli_user_id, we'll try all users (fallback behavior)
      continue
    }
    
    if (!shipmentsByUser.has(meliUserId)) {
      shipmentsByUser.set(meliUserId, [])
    }
    shipmentsByUser.get(meliUserId).push(shipmentId)
  }
  
  // Collect shipments without meli_user_id for fallback processing
  const unknownUserShipments = []
  for (const [shipmentId, meliUserId] of shipmentsMap) {
    if (!meliUserId) {
      unknownUserShipments.push(shipmentId)
    }
  }
  
  let totalShipments = 0
  let errorCount = 0
  
  // Process shipments grouped by user
  for (const [meliUserId, shipmentIds] of shipmentsByUser) {
    const user = meliUsers.find(u => u.meli_user_id === meliUserId)
    
    console.log(`Processing ${shipmentIds.length} shipments for user ${meliUserId}`)
    
    // Process in batches of 50
    for (let i = 0; i < shipmentIds.length; i += BATCH_SIZE) {
      const batch = shipmentIds.slice(i, i + BATCH_SIZE)
      
      try {
        // Fetch shipments in parallel for this batch
        const shipmentPromises = batch.map(shipmentId => 
          apiRequest(`https://api.mercadolibre.com/shipments/${shipmentId}`, user.access_token)
            .then(shipmentData => ({ shipmentId, shipmentData, success: true }))
            .catch(error => ({ shipmentId, error, success: false }))
        )
        
        const results = await Promise.all(shipmentPromises)
        console.log(`Fetched batch of ${batch.length} shipments for user ${meliUserId}`)
        // Process results
        for (const result of results) {
          if (result.success) {
            try {
              const parsedShipment = parseShipment(result.shipmentData, meliUserId)
              
              const { error: shipmentError } = await supabase
                .from('meli_shipment_status')
                .upsert(parsedShipment)
              
              if (shipmentError) {
                console.error(`Error storing shipment ${result.shipmentId}:`, shipmentError)
                errorCount++
              } else {
                totalShipments++
                // console.log(`Shipment ${result.shipmentId} fetched successfully`)
              }
            } catch (error) {
              console.error(`Error parsing shipment ${result.shipmentId}:`, error)
              errorCount++
            }
          } else {
            console.error(`Failed to fetch shipment ${result.shipmentId}:`, result.error.message)
            errorCount++
          }
        }
        
      } catch (error) {
        console.error(`Error processing batch for user ${meliUserId}:`, error)
        errorCount += batch.length
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  
  // Process shipments without known meli_user_id (fallback to trying all users)
  if (unknownUserShipments.length > 0) {
    console.log(`Processing ${unknownUserShipments.length} shipments with unknown user IDs`)
  }
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total shipments processed: ${totalShipments}`)
  console.log(`Total errors: ${errorCount}`)
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchShipments()
    .then(() => {
      console.log('Shipment fetch completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Shipment fetch failed:', error)
      process.exit(1)
    })
}