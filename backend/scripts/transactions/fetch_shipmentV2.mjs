// scripts/fetch_shipments.mjs
// Fetch shipment status for meli orders

import { date } from 'zod'
import { createClient, getMeliUsers } from '../../lib/supabase/script-client.js'
import { apiRequest } from '../../lib/utils.js'
// API request with auth and x-format-new header

// Parse shipment data
function parseShipment(shipment, meliUserId) {
  return {
    shipment_id: shipment.id,
    meli_user_id: meliUserId,
    substatus_history: shipment.substatus_history || null,
    snapshot_packing: shipment.snapshot_packing || null,
    base_cost: shipment.base_cost || 0,
    status_history: shipment.status_history || null,
    type: shipment.type || null,
    return_details: shipment.return_details || null,
    mode: shipment.mode || null,
    order_cost: shipment.order_cost || 0,
    priority_class: shipment.priority_class || null,
    service_id: shipment.service_id || null,
    tracking_number: shipment.tracking_number || null,
    cost_components: shipment.cost_components || null,
    tracking_method: shipment.tracking_method || null,
    last_updated: shipment.last_updated || null,
    items_type: shipment.items_type || null,
    comments: shipment.comments || null,
    status: shipment.status || null,
    date_created: shipment.date_created || null,
    date_first_printed: shipment.date_first_printed || null,
    created_by: shipment.created_by || null,
    application_id: shipment.application_id || null,
    shipping_option: shipment.shipping_option || null,
    tags: shipment.tags || null,
    sender_address: shipment.sender_address || null,
    siblings: shipment.siblings || null,
    return_tracking_number: shipment.return_tracking_number || null,
    site_id: shipment.site_id || null,
    carrier_info: shipment.carrier_info || null,
    receiver_address: shipment.receiver_address || null,
    customer_id: shipment.customer_id || null,
    order_id: shipment.order_id || null,
    quotation: shipment.quotation || null,
    status: shipment.status || null,
    logistic_type: shipment.logistic_type || null
  }
}

// Get shipment IDs with meli_user_id that need to be fetched
async function getShipmentsToFetch(supabase) {
  const sixHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get shipment IDs with meli_user_id from meli_orders where fulfilled = false and updated in last 6 hours
  const { data: orderShipments, error: orderError } = await supabase
    .from('ml_orders_v2')
    .select('shipping, meli_user_id')
    // .eq('fulfilled', false)
    .eq('shipping', '45518690257')
    // .gte('last_updated', sixHoursAgo)
    .not('shipping', 'is', null)
    // .limit(1)

  if (orderError) throw orderError

  // Convert to Map for shipment ID -> meli_user_id mapping
  const shipments = new Map()

  orderShipments?.forEach(row => {
    if (row.shipping) {
      shipments.set(row.shipping, row.meli_user_id)
    }
  })

  return shipments
}

// Main function
export async function fetchShipments() {

  const supabase = createClient()
  const BATCH_SIZE = 50 

  // Get all meli users with their tokens
  const meliUsers = await getMeliUsers()
  
  // Get shipments that need to be fetched with their meli_user_id
  const shipmentsMap = await getShipmentsToFetch(supabase)
  console.log(`Fetching ${shipmentsMap.size} shipments`)  
  const shipmentsByUser = new Map()
  for (const [shipmentId, meliUserId] of shipmentsMap) {
    if (!shipmentsByUser.has(meliUserId)) {
      shipmentsByUser.set(meliUserId, [])
    }
    shipmentsByUser.get(meliUserId).push(shipmentId)
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
        // Fetch shipments
        const shipmentPromises = batch.map(shipmentId => 
          apiRequest(`https://api.mercadolibre.com/shipments/${shipmentId}`, user.access_token)
            .then(shipmentData => ({ shipmentId, shipmentData, success: true }))
            .catch(error => ({ shipmentId, error, success: false }))
        )
        const results = await Promise.all(shipmentPromises)
        console.log(`Fetched batch of ${batch.length} shipments for user ${meliUserId}`)
        console.log(results)
        // Process results
        // for (const result of results) {
        //     try {
        //       const parsedShipment = parseShipment(result.shipmentData, meliUserId)
              
        //       const { error: shipmentError } = await supabase
        //         .from('ml_shipments_v2')
        //         .upsert(parsedShipment)
        //         totalShipments++
        //     } catch (error) {
        //       console.error(`Error parsing shipment ${result.shipmentId}:`, error)
        //       errorCount++
        //     }
        // }
        
      } catch (error) {
        console.error(`Error processing batch for user ${meliUserId}:`, error)
        errorCount += batch.length
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 5))
    }
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