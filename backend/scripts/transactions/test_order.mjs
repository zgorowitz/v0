// scripts/test_single_order.mjs
// Test script to process a single order and show full API response + formatted data

import { createClient, getMeliUsers } from '../../lib/supabase/script-client.js'
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
    pack_id: order.pack_id || null
  }
}

function parseOrderItems(orderId, orderItems) {
  if (!orderItems || !Array.isArray(orderItems)) return []
  
  return orderItems.map((orderItem, index) => {
    const item = orderItem.item
    if (!item) return null
    
    let variationId = null
    let userProductId = null
    let scenario = 'unknown'
    
    if (item.user_product_id) {
      variationId = item.user_product_id
      userProductId = item.user_product_id
      scenario = 'user_products_model'
    } else if (item.variation_id) {
      variationId = item.variation_id
      userProductId = null
      scenario = 'legacy_model'
    } else {
      variationId = null
      userProductId = null
      scenario = 'no_variation'
    }
    
    return {
      order_id: orderId,
      item_id: item.id,
      variation_id: variationId,
      user_product_id: userProductId,
      quantity: orderItem.quantity || 1,
      unit_price: orderItem.unit_price || 0,
      full_unit_price: orderItem.full_unit_price || 0,
      sale_fee: orderItem.sale_fee || 0,
      currency_id: orderItem.currency_id || null,
      listing_type_id: orderItem.listing_type_id || null,
      warranty: item.warranty || null,
      manufacturing_days: orderItem.manufacturing_days || null,
      variation_attributes: item.variation_attributes || [],
      seller_sku: item.seller_sku || null,
      scenario: scenario,
      // Additional debug info
      original_variation_id: item.variation_id,
      original_user_product_id: item.user_product_id,
      item_index: index
    }
  }).filter(item => item !== null)
}

function printTable(title, data) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${title.toUpperCase()}`)
  console.log(`${'='.repeat(80)}`)
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No data found')
      return
    }
    
    console.table(data)
  } else {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`${key}: ${JSON.stringify(value, null, 2)}`)
      } else {
        console.log(`${key}: ${value}`)
      }
    })
  }
}

async function testSingleOrder(orderId = '2000013047409832') {
  const supabase = createClient()
  
  console.log(`🔍 Testing Order ID: ${orderId}`)
  console.log(`${'='.repeat(80)}`)
  
  // Get all meli users to find the right one
  const meliUsers = await getMeliUsers()
  
  let foundOrder = null
  let orderOwner = null
  
  // Search for the order across all users
  for (const user of meliUsers) {
    try {
      console.log(`🔎 Searching in user: ${user.meli_user_id}`)
      
      // Try to get the specific order
      const apiUrl = `https://api.mercadolibre.com/orders/${orderId}`
      
      try {
        const orderResponse = await apiRequest(apiUrl, user.access_token)
        foundOrder = orderResponse
        orderOwner = user
        console.log(`✅ Found order in user: ${user.meli_user_id}`)
        break
      } catch (error) {
        if (error.message.includes('404')) {
          console.log(`❌ Order not found in user: ${user.meli_user_id}`)
          continue
        } else {
          throw error
        }
      }
      
    } catch (error) {
      console.log(`⚠️  Error checking user ${user.meli_user_id}: ${error.message}`)
      continue
    }
  }
  
  if (!foundOrder || !orderOwner) {
    console.log(`❌ Order ${orderId} not found in any user account`)
    return
  }
  
  // Print full API response
  console.log(`\n📋 FULL API RESPONSE`)
  console.log(`${'='.repeat(80)}`)
  console.log(JSON.stringify(foundOrder, null, 2))
  
  // Parse the order data
  const orderData = parseOrder(foundOrder, orderOwner.meli_user_id)
  const orderItems = parseOrderItems(foundOrder.id, foundOrder.order_items)
  
  // Print formatted order data
  printTable('PARSED ORDER DATA', orderData)
  
  // Print formatted order items
  printTable('PARSED ORDER ITEMS', orderItems)
  
  // Print variation ID analysis
  console.log(`\n🔍 VARIATION ID ANALYSIS`)
  console.log(`${'='.repeat(80)}`)
  
  if (orderItems.length > 0) {
    orderItems.forEach((item, index) => {
      // console.log(`\nItem ${index + 1}:`)
      // console.log(`  Item ID: ${item.item_id}`)
      // console.log(`  Original variation_id: ${item.original_variation_id}`)
      // console.log(`  Original user_product_id: ${item.original_user_product_id}`)
      // console.log(`  Final variation_id (used): ${item.variation_id}`)
      // console.log(`  Scenario: ${item.scenario}`)
      // console.log(`  Seller SKU: ${item.seller_sku}`)
      
      if (item.variation_attributes && item.variation_attributes.length > 0) {
        console.log(`  Variation Attributes:`)
        item.variation_attributes.forEach(attr => {
          console.log(`    ${attr.name}: ${attr.value_name}`)
        })
      }
    })
  } else {
    console.log('No order items found')
  }
  
  // // Summary
  // console.log(`\n📊 SUMMARY`)
  // console.log(`${'='.repeat(80)}`)
  // console.log(`Order ID: ${foundOrder.id}`)
  // console.log(`Owner: ${orderOwner.meli_user_id}`)
  // console.log(`Status: ${foundOrder.status}`)
  // console.log(`Total Items: ${orderItems.length}`)
  
  const scenarioCounts = orderItems.reduce((acc, item) => {
    acc[item.scenario] = (acc[item.scenario] || 0) + 1
    return acc
  }, {})
  
  // console.log(`Scenario Breakdown:`)
  // Object.entries(scenarioCounts).forEach(([scenario, count]) => {
  //   console.log(`  ${scenario}: ${count}`)
  // })
  
  return {
    order: foundOrder,
    orderData,
    orderItems,
    owner: orderOwner
  }
}

// Allow passing order ID as command line argument
const orderId = process.argv[2] || '2000013000884856'

if (import.meta.url === `file://${process.argv[1]}`) {
  testSingleOrder(orderId)
    .then((result) => {
      if (result) {
        console.log(`\n✅ Test completed successfully`)
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error(`❌ Test failed:`, error)
      process.exit(1)
    })
}