// scripts/fetch_order.mjs
// Fetch orders for all meli users with daily incremental updates

import { createClient, refreshAllTokens } from '../lib/supabase/script-client.js'
import dotenv from 'dotenv'

dotenv.config()

async function apiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function parseOrder(order, meliUserId) {
  return {
    id: order.id,
    meli_user_id: meliUserId,
    status: order.status,
    status_detail: order.status_detail || null,
    buying_mode: order.buying_mode || null,
    fulfilled: order.fulfilled || false,
    total_amount: order.total_amount || 0,
    paid_amount: order.paid_amount || 0,
    shipping_cost: order.shipping_cost || 0,
    currency_id: order.currency_id || null,
    buyer_id: order.buyer?.id || null,
    seller_id: order.seller?.id || null,
    date_created: order.date_created ? new Date(order.date_created).toISOString() : null,
    date_closed: order.date_closed ? new Date(order.date_closed).toISOString() : null,
    date_last_updated: order.date_last_updated ? new Date(order.date_last_updated).toISOString() : null,
    payments: order.payments || [],
    shipping_id: order.shipping?.id || null,
    shipping: order.shipping || {},
    feedback: order.feedback || {},
    mediations: order.mediations || [],
    coupon: order.coupon || {},
    taxes: order.taxes || {},
    tags: order.tags || [],
    comments: order.comments || null,
    pack_id: order.pack_id || null,
    order_request: order.order_request || {},
    manufacturing_ending_date: order.manufacturing_ending_date ? new Date(order.manufacturing_ending_date).toISOString() : null,
    last_updated: order.last_updated ? new Date(order.last_updated).toISOString() : null
  }
}

function parseOrderItems(orderId, orderItems) {
  if (!orderItems || !Array.isArray(orderItems)) return []
  
  return orderItems.map(item => ({
    order_id: orderId,
    item_id: item.item?.id || null,
    variation_id: item.item?.variation_id || null,
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0,
    full_unit_price: item.full_unit_price || 0,
    sale_fee: item.sale_fee || 0,
    currency_id: item.currency_id || null,
    listing_type_id: item.listing_type_id || null,
    warranty: item.item?.warranty || null,
    manufacturing_days: item.manufacturing_days || null,
    variation_attributes: item.item?.variation_attributes || [],
    seller_custom_field: item.item?.seller_custom_field || null,
    condition: item.item?.condition || null,
    category_id: item.item?.category_id || null,
    title: item.item?.title || null,
    seller_sku: item.item?.seller_sku || null,
    differential_pricing_id: item.differential_pricing_id || null,
    base_currency_id: item.base_currency_id || null,
    base_exchange_rate: item.base_exchange_rate || null
  }))
}

function getLast24HoursFilter() {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 6)
  return twentyFourHoursAgo.toISOString()
}

export async function fetchOrders(options = {}) {
  const { 
    fromDate = getLast24HoursFilter(),
    fullSync = false,
    refreshTokens = true
  } = options
  
  const supabase = createClient()
  
  // Refresh tokens before fetching orders
  if (refreshTokens) {
    try {
      await refreshAllTokens()
    } catch (error) {
      console.warn(error.message)
    }
  }
  
  const { data: meliUsers, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  
  if (error) throw error
  
  let totalOrders = 0
  let totalOrderItems = 0
  
  for (const user of meliUsers) {
    console.log(`Processing orders for user: ${user.meli_user_id}`)
    
    try {
      let offset = 0
      let hasMore = true
      const limit = 50
      
      while (hasMore) {
        let apiUrl = `https://api.mercadolibre.com/orders/search?seller=${user.meli_user_id}&offset=${offset}&limit=${limit}`
        
        if (!fullSync && fromDate) {
          apiUrl += `&order.date_last_updated.from=${fromDate}`
        }
        
        const ordersResponse = await apiRequest(apiUrl, user.access_token)
        
        console.log(`Page ${Math.floor(offset/limit) + 1}: Found ${ordersResponse.results?.length || 0} orders`)
        
        if (!ordersResponse.results || ordersResponse.results.length === 0) {
          hasMore = false
          break
        }
        
        // Collect all orders and items for batch processing
        const batchOrders = []
        const batchOrderItems = []
        const orderIds = []
        
        for (const order of ordersResponse.results) {
          const orderData = parseOrder(order, user.meli_user_id)
          batchOrders.push(orderData)
          orderIds.push(order.id)
          
          if (order.order_items && order.order_items.length > 0) {
            const orderItems = parseOrderItems(order.id, order.order_items)
            batchOrderItems.push(...orderItems)
          }
        }
        
        // Batch upsert all orders
        if (batchOrders.length > 0) {
          const { error: ordersError } = await supabase
            .from('meli_orders')
            .upsert(batchOrders, { onConflict: ['id'] })
          
          if (ordersError) {
            console.error(`Error batch inserting orders:`, ordersError.message)
          } else {
            totalOrders += batchOrders.length
          }
        }
        
        // Batch handle order items
        if (batchOrderItems.length > 0) {
          // Delete existing items for all orders in this batch
          const { error: deleteError } = await supabase
            .from('meli_order_items')
            .delete()
            .in('order_id', orderIds)
          
          if (deleteError) {
            console.error(`Error deleting existing order items:`, deleteError.message)
          }
          
          // Insert all new items
          const { error: itemsError } = await supabase
            .from('meli_order_items')
            .insert(batchOrderItems)
          
          if (itemsError) {
            console.error(`Error batch inserting order items:`, itemsError.message)
          } else {
            totalOrderItems += batchOrderItems.length
          }
        }
        
        // Rate limit only applies to API calls, not DB operations
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (ordersResponse.paging) {
          const totalResults = ordersResponse.paging.total
          const currentOffset = ordersResponse.paging.offset
          const currentLimit = ordersResponse.paging.limit
          
          hasMore = (currentOffset + currentLimit) < totalResults
          offset = currentOffset + currentLimit
          
          console.log(`Progress: ${Math.min(currentOffset + currentLimit, totalResults)}/${totalResults} orders`)
        } else {
          hasMore = ordersResponse.results.length === limit
          offset += limit
        }
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
            
    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error.message)
      continue
    }
  }
  
  console.log(`Summary:`)
  console.log(`Total orders processed: ${totalOrders}`)
  console.log(`Date filter: ${fullSync ? 'Full sync (no filter)' : `Since ${fromDate}`}`)
}

export async function fetchAllOrders() {
  console.log('Starting FULL orders sync (all orders)...')
  return fetchOrders({ fullSync: true })
}

export async function fetchDailyOrders() {
  console.log('Starting DAILY orders sync (last 24 hours)...')
  return fetchOrders({ fromDate: getLast24HoursFilter() })
}

export async function fetchOrdersFromDate(fromDate, toDate = null) {
  console.log(`Starting orders sync from ${fromDate}${toDate ? ` to ${toDate}` : ''}...`)
  
  let options = { fromDate, fullSync: false }
  if (toDate) {
    console.warn('toDate parameter not implemented - fetching from date onwards')
  }
  
  return fetchOrders(options)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchDailyOrders()
    .then(() => {
      console.log('Daily orders sync completed successfully')
      process.exit(0)
    })
    .catch(console.error)
}