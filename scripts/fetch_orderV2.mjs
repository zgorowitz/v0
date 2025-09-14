// scripts/fetch_orders.mjs
// Fetch orders for all meli users with daily incremental updates

import { createClient, refreshAllTokens } from '../lib/supabase/script-client.js'
import { paginateV2 } from '../lib/scripts/utils.js'



function parseOrder(order, meliUserId) {
  return {
    id: order.id,
    meli_user_id: meliUserId,
    date_created: order.date_created,
    last_updated: order.last_updated,
    date_closed: order.date_closed,
    pack_id: order.pack_id,
    fulfilled: order.fulfilled,
    buying_mode: order.buying_mode,
    shipping_cost: order.shipping_cost,
    total_amount: order.total_amount,
    paid_amount: order.paid_amount,
    currency_id: order.currency_id,
    status: order.status,
    status_detail: order.status_detail,
    manufacturing_ending_date: order.manufacturing_ending_date,
    
    // JSONB fields (complex objects and arrays)
    mediations: order.mediations || [],
    order_items: order.order_items || [],
    payments: order.payments || [],
    shipping: order.shipping || {},
    tags: order.tags || [],
    internal_tags: order.internal_tags || [],
    static_tags: order.static_tags || [],
    feedback: order.feedback || {},
    context: order.context || {},
    seller: order.seller || {},
    buyer: order.buyer || {},
    taxes: order.taxes || {},
    cancel_detail: order.cancel_detail || null,
    order_request: order.order_request || {}
  };
}

function parseOrderItems(orderItems, orderId, meli_user_id) {
  if (!orderItems || !Array.isArray(orderItems)) return []
  
  return orderItems.map(orderItem => ({
    // Order reference
    order_id: orderId,
    meli_user_id: meli_user_id,
    // Item level fields (from nested item object)
    item_id: orderItem.item?.id || null,
    title: orderItem.item?.title || null,
    category_id: orderItem.item?.category_id || null,
    variation_id: orderItem.item?.variation_id || null,
    seller_custom_field: orderItem.item?.seller_custom_field || null,
    warranty: orderItem.item?.warranty || null,
    condition: orderItem.item?.condition || null,
    seller_sku: orderItem.item?.seller_sku || null,
    global_price: orderItem.item?.global_price || null,
    net_weight: orderItem.item?.net_weight || null,
    user_product_id: orderItem.item?.user_product_id || null,
    release_date: orderItem.item?.release_date || null,
    
    // Order item level fields
    quantity: orderItem.quantity || 0,
    picked_quantity: typeof orderItem.picked_quantity === 'object' && orderItem.picked_quantity?.value  
    ? orderItem.picked_quantity.value                                                                                                                                                                 
    : orderItem.picked_quantity || null, 
    unit_price: orderItem.unit_price || 0,
    full_unit_price: orderItem.full_unit_price || 0,
    full_unit_price_currency_id: orderItem.full_unit_price_currency_id || null,
    currency_id: orderItem.currency_id || null,
    manufacturing_days: orderItem.manufacturing_days || null,
    sale_fee: orderItem.sale_fee || 0,
    listing_type_id: orderItem.listing_type_id || null,
    base_exchange_rate: orderItem.base_exchange_rate || null,
    base_currency_id: orderItem.base_currency_id || null,
    element_id: orderItem.element_id || null,
    compat_id: orderItem.compat_id || null,
    kit_instance_id: orderItem.kit_instance_id || null,
    
    // Complex fields stored as JSONB
    variation_attributes: orderItem.item?.variation_attributes || [],
    requested_quantity: orderItem.requested_quantity || null,
    discounts: orderItem.discounts || null,
    bundle: orderItem.bundle || null,
    stock: orderItem.stock || null
  }))
}

function getLast24HoursFilter() {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 12)
  return twentyFourHoursAgo.toISOString()
}

export async function fetchOrders(options = {}) {
  const { 
    fromDate = getLast24HoursFilter(),
    toDate = new Date().toISOString(),
    // refreshTokens = true
  } = options
  
  const supabase = createClient()
  
  // Refresh tokens before fetching orders
  
  const { data: meliUsers, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
    // .eq('organization_id', '629103a0-db2d-47d2-96dc-8071ca0027f0')
  if (error) throw error
  
  let totalOrders = 0
  let totalOrderItems = 0
  
  for (const user of meliUsers) {
    console.log(`User: ${user.meli_user_id}`)
    
    try {
      const apiUrl = `https://api.mercadolibre.com/orders/search?seller=${user.meli_user_id}&order.date_last_updated.from=${fromDate}&order.date_last_updated.to=${toDate}`
      const orders = await paginateV2(apiUrl, user.access_token)
      console.log(`Found ${orders.length} orders for user ${user.meli_user_id}`)
      
      // Collect all orders and items for batch processing
      const batchOrders = []
      const batchOrderItems = []
      const orderIds = []
      
      for (const order of orders) {
        const orderData = parseOrder(order, user.meli_user_id)
        batchOrders.push(orderData)
        orderIds.push(order.id)
        
        if (order.order_items && order.order_items.length > 0) {
          const orderItems = parseOrderItems(order.order_items, order.id, user.meli_user_id)
          batchOrderItems.push(...orderItems)
        }
      }
      
      // Batch upsert all orders
      if (batchOrders.length > 0) {
        // Dedupe keeping latest date
        const deduped = new Map()
        batchOrders.forEach(o => {
          if (!deduped.has(o.id) || new Date(o.last_updated) > new Date(deduped.get(o.id).last_updated)) {
            deduped.set(o.id, o)
          }
        })
        
        const { error: ordersError } = await supabase
          .from('ml_orders_v2')
          .upsert([...deduped.values()], { onConflict: ['id'] })
        
        if (ordersError) {
          console.error(`Error batch inserting orders:`, ordersError.message)
        } else {
          totalOrders += deduped.size
        }
      }
      
      // Batch handle order items
      if (batchOrderItems.length > 0) {
        // Delete existing items for all orders in this batch
        const { error: deleteError } = await supabase
          .from('ml_order_items_v2')
          .delete()
          .in('order_id', orderIds)
        
        if (deleteError) {
          console.error(`Error deleting existing order items:`, deleteError.message)
        }
        
        // Insert all new items
        const { error: itemsError } = await supabase
          .from('ml_order_items_v2')
          .insert(batchOrderItems)
        
        if (itemsError) {
          console.error(`Error batch inserting order items:`, itemsError.message)
        } else {
          totalOrderItems += batchOrderItems.length
        }
      }
      
      console.log(`Completed user ${user.meli_user_id}`)
      
    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error.message)
      continue
    }
  }
  
  console.log(`Summary:`)
  console.log(`Total orders processed: ${totalOrders}`)
  console.log(`Total order items processed: ${totalOrderItems}`)
  
}

export async function fetchDailyOrders() {
  console.log('Starting DAILY orders sync (last 24 hours)...')
  return fetchOrders({ fromDate: getLast24HoursFilter() })
}

export async function fetchOrdersFromDate(fromDate, toDate = null) {
  console.log(`--------------- ${fromDate}${toDate ? ` to ${toDate}` : ''}...`)
  
  let options = { fromDate, toDate }
  
  return fetchOrders(options)
}

async function fetchOrdersByChunks(startDate, endDate) {
  // const allOrders = []

  // if (refreshTokens) {
    try {
      await refreshAllTokens()
    } catch (error) {
      console.warn(error.message)
    }
  // }
  const start = new Date(startDate)
  const end = new Date(endDate)

  let currentStart = new Date(start)

  while (currentStart < end) {
    let currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + 1) // 30 days chunk (0-29)

    if (currentEnd > end) {
      currentEnd = end
    }

    const orders = await fetchOrdersFromDate(
      currentStart.toISOString(), 
      currentEnd.toISOString()
    )

    // allOrders.push(...orders)

    currentStart = new Date(currentEnd)
  }

  // return allOrders
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOrdersByChunks('2025-09-09T00:00:00.000Z', new Date().toISOString())
    .then(() => {
      console.log('Daily orders sync completed successfully')
      process.exit(0)
    })
    .catch(console.error)
}