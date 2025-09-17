// scripts/fetch_orders.mjs
// Fetch orders for all meli users with daily incremental updates

import { createClient, refreshAllTokens, getMeliUsers } from '../../lib/supabase/script-client.js'
import { paginateV2 } from '../../lib/utils.js'



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
    // order_items: order.order_items || [],
    // payments: order.payments || [],
    shipping: order.shipping?.id || null,
    tags: order.tags || [],
    internal_tags: order.internal_tags || [],
    static_tags: order.static_tags || [],
    feedback: order.feedback || {},
    context: order.context || {},
    // seller: order.seller || {},
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

function parseOrderPayments(paymentsArray, orderId, meli_user_id) {
  if (!paymentsArray || !Array.isArray(paymentsArray)) return []
  return paymentsArray.map(payment => ({
      id: payment.id,
      order_id: orderId,
      meli_user_id: meli_user_id,
      reason: payment.reason,
      status: payment.status,
      card_id: payment.card_id,
      site_id: payment.site_id,
      payer_id: payment.payer_id,
      collector_id: payment.collector?.id,
      coupon_id: payment.coupon_id,
      issuer_id: payment.issuer_id,
      currency_id: payment.currency_id,
      status_code: payment.status_code,
      date_created: payment.date_created,
      installments: payment.installments,
      payment_type: payment.payment_type,
      taxes_amount: payment.taxes_amount, // Convert from cents
      coupon_amount: payment.coupon_amount,
      date_approved: payment.date_approved,
      shipping_cost: payment.shipping_cost,
      status_detail: payment.status_detail,
      activation_uri: payment.activation_uri,
      operation_type: payment.operation_type,
      deferred_period: payment.deferred_period,
      overpaid_amount: payment.overpaid_amount,
      available_actions: JSON.stringify(payment.available_actions),
      payment_method_id: payment.payment_method_id,
      total_paid_amount: payment.total_paid_amount,
      authorization_code: payment.authorization_code,
      date_last_modified: payment.date_last_modified,
      installment_amount: payment.installment_amount ? payment.installment_amount : null,
      transaction_amount: payment.transaction_amount,
      transaction_order_id: payment.transaction_order_id,
      atm_transfer_reference: JSON.stringify(payment.atm_transfer_reference),
      transaction_amount_refunded: payment.transaction_amount_refunded
  }));
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
  } = options
  
  const supabase = createClient()
  
  const meliUsers = await getMeliUsers()
  
  let totalOrders = 0
  let totalOrderItems = 0
  let totalOrderPayments = 0
  
  for (const user of meliUsers) {
    console.log(`User: ${user.meli_user_id}`)
    
    try {
      const apiUrl = `https://api.mercadolibre.com/orders/search?seller=${user.meli_user_id}&order.date_last_updated.from=${fromDate}&order.date_last_updated.to=${toDate}`
      const orders = await paginateV2(apiUrl, user.access_token)
      console.log(`Found ${orders.length} orders for user ${user.meli_user_id}`)
      
      // FIXED: Deduplicate orders FIRST, before processing items
      const orderMap = new Map()
      
      // First pass: deduplicate orders keeping the latest version
      for (const order of orders) {
        if (!orderMap.has(order.id) || 
            new Date(order.last_updated) > new Date(orderMap.get(order.id).last_updated)) {
          orderMap.set(order.id, order)
        }
      }
      
      // Now process only the deduplicated orders
      const batchOrders = []
      const batchOrderItems = []
      const batchOrderPayments = []
      const orderIds = []
      
      // Process only unique orders
      for (const order of orderMap.values()) {
        const orderData = parseOrder(order, user.meli_user_id)
        batchOrders.push(orderData)
        orderIds.push(order.id)

        if (order.order_items && order.order_items.length > 0) {
          const orderItems = parseOrderItems(order.order_items, order.id, user.meli_user_id)
          batchOrderItems.push(...orderItems)
        }
        
        if (order.payments && order.payments.length > 0) {
          const orderPayments = parseOrderPayments(order.payments, order.id, user.meli_user_id)
          batchOrderPayments.push(...orderPayments)
        }
      }
      
      // Batch upsert all orders
      if (batchOrders.length > 0) {
        const { error: ordersError } = await supabase
          .from('ml_orders_v2')
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

      if (batchOrderPayments.length > 0) {
        // Delete existing payments for all orders in this batch
        const { error: deleteError } = await supabase
          .from('ml_order_payments_v2')
          .delete()
          .in('order_id', orderIds)
        
        if (deleteError) {
          console.error(`Error deleting existing order payments:`, deleteError.message)
        }
        
        // Insert all new payments
        const { error: paymentsError } = await supabase
          .from('ml_order_payments_v2')
          .insert(batchOrderPayments)
        
        if (paymentsError) {
          console.error(`Error inserting payments:`, paymentsError.message)
        } else {
          totalOrderPayments += batchOrderPayments.length
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
  console.log(`Total order payments processed: ${totalOrderPayments}`)
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
  fetchOrdersByChunks('2025-05-01T00:00:00.000-04:00', new Date().toISOString())
    .then(() => {
      console.log('Daily orders sync completed successfully')
      process.exit(0)
    })
    .catch(console.error)
}