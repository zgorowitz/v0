// scripts/fetch_shipments.mjs
// Fetch shipment status for meli orders

import { createClient, getMeliUsers } from '../../lib/supabase/script-client.js'
import { apiRequest } from '../../lib/utils.js'
// API request with auth and x-format-new header

// Get time filter based on HOURS_AGO environment variable
function getTimeFilter() {
  const hoursAgo = parseInt(process.env.HOURS_AGO) || 24
  const timeAgo = new Date()
  timeAgo.setHours(timeAgo.getHours() - hoursAgo)
  return timeAgo.toISOString()
}

// Parse shipment costs data - 20 fields total
function parseCost(costData, shipmentId, meliUserId) {
  const sender = costData.senders?.[0] || {}
  const senderDiscount = sender.discounts?.[0] || {}
  const receiverDiscount = costData.receiver?.discounts?.[0] || {}

  return {
    // Root level - 1 field
    gross_amount: costData.gross_amount,

    // Receiver - 7 fields
    // receiver_compensations: costData.receiver?.compensations,
    receiver_cost: costData.receiver?.cost,
    receiver_discount_rate: receiverDiscount.rate,
    receiver_discount_type: receiverDiscount.type,
    receiver_discount_promoted_amount: receiverDiscount.promoted_amount,
    receiver_user_id: costData.receiver?.user_id,
    // receiver_cost_details: costData.receiver?.cost_details,
    receiver_save: costData.receiver?.save,
    // receiver_compensation: costData.receiver?.compensation,

    // Sender fields - 9 fields
    sender_compensations: sender.compensations,
    sender_charge_flex: sender.charges?.charge_flex,
    sender_cost: sender.cost,
    sender_discount_rate: senderDiscount.rate,
    sender_discount_type: senderDiscount.type,
    sender_discount_promoted_amount: senderDiscount.promoted_amount,
    sender_user_id: sender.user_id,
    sender_save: sender.save,
    sender_compensation: sender.compensation,

    // Metadata - 3 fields
    shipment_id: shipmentId,
    meli_user_id: meliUserId,
    created_at: new Date().toISOString()
  }
}

// Parse shipment items data - 19 fields total per item
function parseItems(itemsData, shipmentId, meliUserId) {
  return itemsData.map(item => ({
    shipment_id: shipmentId,
    meli_user_id: meliUserId,

    // manufacturing_time: item.manufacturing_time,
    quantity: item.quantity,
    item_id: item.item_id,
    // dimensions_source: item.dimensions_source,
    // description: item.description,
    user_product_id: item.user_product_id,
    // sender_id: item.sender_id,
    // domain_id: item.domain_id,
    variation_id: item.variation_id,
    order_id: item.order_id,
    bundle: item.bundle,

    dimension_width: item.dimensions?.width,
    dimension_length: item.dimensions?.length,
    dimension_weight: item.dimensions?.weight,
    dimension_height: item.dimensions?.height,
    created_at: new Date().toISOString()
  }))
}

// Get shipment IDs to be fetched
async function getShipmentsToFetch(supabase) {
  const timeFilter = getTimeFilter()

  // Get shipment IDs with meli_user_id from meli_orders where fulfilled = false and updated in last 6 hours
  const { data: orderShipments, error: orderError } = await supabase
    .from('ml_orders_v2')
    .select('shipping, meli_user_id')
    // .eq('fulfilled', false)
    .gte('last_updated', timeFilter)
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
  const meliUsers = await getMeliUsers()
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
  const apiTimings = []

  // Process shipments grouped by user
  for (const [meliUserId, shipmentIds] of shipmentsByUser) {
    const user = meliUsers.find(u => u.meli_user_id === meliUserId)
    console.log(`Processing ${shipmentIds.length} shipments for user ${meliUserId}`)

    // Mercado Libre rate limit: 10 requests/second
    // We make 2 requests per shipment (costs + items), so process 5 shipments per second
    const BATCH_SIZE = 20
    const DELAY_MS = 1000 // 1 second delay between batches

    const results = []

    try {
      // Process shipments in batches to respect rate limits
      for (let i = 0; i < shipmentIds.length; i += BATCH_SIZE) {
        const batch = shipmentIds.slice(i, i + BATCH_SIZE)

        // Fetch both endpoints for each shipment in the batch
        const shipmentPromises = batch.map(shipmentId => {
          const startTime = performance.now()

          return Promise.all([
            apiRequest(`https://api.mercadolibre.com/shipments/${shipmentId}/costs`, user.access_token),
            apiRequest(`https://api.mercadolibre.com/shipments/${shipmentId}/items`, user.access_token)
          ])
            .then(([costsData, itemsData]) => {
              const duration = performance.now() - startTime
              apiTimings.push({ shipmentId, duration, success: true })
              console.log(`✓ Shipment ${shipmentId}: ${duration.toFixed(2)}ms`)
              return { shipmentId, costsData, itemsData, success: true }
            })
            .catch(error => {
              const duration = performance.now() - startTime
              apiTimings.push({ shipmentId, duration, success: false })
              console.log(`✗ Shipment ${shipmentId}: ${duration.toFixed(2)}ms (failed)`)
              return { shipmentId, error, success: false }
            })
        })

        const batchResults = await Promise.all(shipmentPromises)
        results.push(...batchResults)

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < shipmentIds.length) {
          console.log(`Rate limit: waiting ${DELAY_MS}ms before next batch...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_MS))
        }
      }

      const costs = []
      const items = []

      for (const result of results) {
        if (!result.success) {
          console.error(`Error fetching shipment ${result.shipmentId}:`, result.error)
          errorCount++
          continue
        }

        costs.push(parseCost(result.costsData, result.shipmentId, meliUserId))
        items.push(...parseItems(result.itemsData, result.shipmentId, meliUserId))
        totalShipments++
      }

      // Batch upsert
      const dbStart = performance.now()
      for (let i = 0; i < costs.length; i += 300) {
        await supabase.from('ml_shipment_costs').upsert(costs.slice(i, i + 300), { onConflict: ['shipment_id', 'meli_user_id'] })
      }

      for (let i = 0; i < items.length; i += 300) {
        await supabase.from('ml_shipment_items').upsert(items.slice(i, i + 300), { onConflict: ['shipment_id', 'item_id', 'variation_id'] })
      }
      const dbDuration = performance.now() - dbStart
      console.log(`DB upsert: ${dbDuration.toFixed(2)}ms`)

    } catch (error) {
      console.error(`Error processing batch for user ${meliUserId}:`, error)
    }

  }

  // Calculate timing statistics
  const successfulTimings = apiTimings.filter(t => t.success).map(t => t.duration)
  const avgTime = successfulTimings.length > 0
    ? (successfulTimings.reduce((a, b) => a + b, 0) / successfulTimings.length).toFixed(2)
    : 0
  const minTime = successfulTimings.length > 0 ? Math.min(...successfulTimings).toFixed(2) : 0
  const maxTime = successfulTimings.length > 0 ? Math.max(...successfulTimings).toFixed(2) : 0

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total shipments processed: ${totalShipments}`)
  console.log(`Total errors: ${errorCount}`)
  console.log(`\n=== API TIMING STATS ===`)
  console.log(`Total API calls: ${apiTimings.length}`)
  console.log(`Average time: ${avgTime}ms`)
  console.log(`Min time: ${minTime}ms`)
  console.log(`Max time: ${maxTime}ms`)
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
