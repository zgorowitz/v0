// scripts/meli_shipments.mjs
// Daily script to populate shipments that need to be packed
// Based on orders that are paid but not fulfilled

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Create Supabase client
function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Main function to populate packing shipments
export async function populatePackingShipments() {
  const supabase = createClient()
  
  console.log('Starting daily shipments packing update...')
  
  try {
    // Clear existing data (daily regeneration)
    console.log('Clearing existing packing data...')
    const { error: clearError } = await supabase
      .from('meli_shipments')
      .delete()
      .neq('shipment_id', 0) // Delete all records
    
    if (clearError) throw clearError
    
    // Get orders that need packing
    console.log('Finding orders that need packing...')
    
    const { data: ordersToPack, error: ordersError } = await supabase
      .from('meli_orders')
      .select(`
        id,
        meli_user_id,
        shipping_id,
        status,
        total_amount,
        currency_id,
        date_created
      `)
      .eq('fulfilled', false)
      .not('shipping_id', 'is', null)
      .in('status', ['paid', 'confirmed'])
    
    if (ordersError) throw ordersError
    
    if (!ordersToPack || ordersToPack.length === 0) {
      console.log('No orders need packing at this time')
      return
    }
    
    console.log(`Found ${ordersToPack.length} orders that need packing`)
    
    // Group orders by shipment_id
    const shipmentSummaries = new Map()
    
    ordersToPack.forEach(order => {
      const shipmentId = order.shipping_id
      if (!shipmentSummaries.has(shipmentId)) {
        shipmentSummaries.set(shipmentId, {
          shipment_id: shipmentId,
          meli_user_id: order.meli_user_id,
          total_orders: 0,
          total_items: 0
        })
      }
      
      const summary = shipmentSummaries.get(shipmentId)
      summary.total_orders++
    })
    
    console.log(`Processing ${shipmentSummaries.size} unique shipments`)
    
    // Get all order items
    const allOrderIds = ordersToPack.map(o => o.id)
    console.log('Getting order items...')
    
    const { data: orderItems, error: itemsError } = await supabase
      .from('meli_order_items')
      .select(`
        order_id,
        item_id,
        variation_id,
        quantity,
        unit_price,
        currency_id,
        variation_attributes
      `)
      .in('order_id', allOrderIds)
    
    if (itemsError) throw itemsError
    
    console.log(`Found ${orderItems.length} items across all orders`)
    
    // Count total items per shipment
    const itemCounts = new Map()
    orderItems.forEach(item => {
      const order = ordersToPack.find(o => o.id === item.order_id)
      if (order) {
        const shipmentId = order.shipping_id
        itemCounts.set(shipmentId, (itemCounts.get(shipmentId) || 0) + item.quantity)
      }
    })
    
    // Update total_items in summaries
    for (const [shipmentId, summary] of shipmentSummaries) {
      summary.total_items = itemCounts.get(shipmentId) || 0
    }
    
    // Get variation attributes
    const variationIds = orderItems
      .filter(item => item.variation_id)
      .map(item => ({ item_id: item.item_id, variation_id: item.variation_id }))
    
    let variationAttributesMap = new Map()
    
    if (variationIds.length > 0) {
      console.log('Getting variation attributes...')
      
      const uniqueItemIds = [...new Set(variationIds.map(v => v.item_id))]
      
      const { data: variations, error: variationsError } = await supabase
        .from('meli_variations')
        .select('item_id, variation_id, attributes')
        .in('item_id', uniqueItemIds)
      
      if (!variationsError && variations) {
        variations.forEach(variation => {
          const key = `${variation.item_id}-${variation.variation_id}`
          variationAttributesMap.set(key, variation.attributes || {})
        })
      }
    }
    
    // Get item titles
    const uniqueItemIds = [...new Set(orderItems.map(item => item.item_id))]
    const { data: items, error: itemsTitleError } = await supabase
      .from('meli_items')
      .select('id, title')
      .in('id', uniqueItemIds)
    
    const itemTitlesMap = new Map()
    if (!itemsTitleError && items) {
      items.forEach(item => {
        itemTitlesMap.set(item.id, item.title)
      })
    }
    
    // Insert shipment summaries
    console.log('Inserting shipment summaries...')
    const shipmentsToInsert = Array.from(shipmentSummaries.values())
    
    const { error: shipmentInsertError } = await supabase
      .from('meli_shipments')
      .insert(shipmentsToInsert)
    
    if (shipmentInsertError) throw shipmentInsertError
    
    // Prepare shipment items
    console.log('Preparing shipment items...')
    const shipmentItems = []
    
    orderItems.forEach(item => {
      const order = ordersToPack.find(o => o.id === item.order_id)
      if (!order) return
      
      const variationKey = `${item.item_id}-${item.variation_id}`
      const variationAttributes = item.variation_id 
        ? (variationAttributesMap.get(variationKey) || {})
        : {}
      
      const finalAttributes = {
        ...variationAttributes,
        ...(item.variation_attributes || {})
      }
      
      shipmentItems.push({
        shipment_id: order.shipping_id,
        order_id: item.order_id,
        item_id: item.item_id,
        variation_id: item.variation_id,
        user_product_id: null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id,
        variation_attributes: finalAttributes,
        item_title: itemTitlesMap.get(item.item_id) || 'Unknown Item'
      })
    })
    
    // Insert shipment items in batches
    console.log(`Inserting ${shipmentItems.length} shipment items...`)
    const batchSize = 100
    
    for (let i = 0; i < shipmentItems.length; i += batchSize) {
      const batch = shipmentItems.slice(i, i + batchSize)
      const { error: itemsInsertError } = await supabase
        .from('meli_shipment_pack_items')
        .insert(batch)
      
      if (itemsInsertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, itemsInsertError)
        throw itemsInsertError
      }
    }
    
    console.log('Shipments packing data updated successfully')
    console.log(`Summary: ${shipmentSummaries.size} shipments, ${ordersToPack.length} orders, ${shipmentItems.length} items`)
    
    return {
      shipments: shipmentSummaries.size,
      orders: ordersToPack.length,
      items: shipmentItems.length
    }
    
  } catch (error) {
    console.error('Error updating packing shipments:', error)
    throw error
  }
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  populatePackingShipments()
    .then((result) => {
      console.log('Packing shipments update completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}