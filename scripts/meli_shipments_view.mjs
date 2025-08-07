// scripts/meli_shipments_view.mjs
// Daily script to create/update views for shipments that need to be packed
// Based on orders that are paid but not fulfilled, excluding delivered/closed shipments

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

// Main function to create/update shipments views
export async function createShipmentsViews() {
  const supabase = createClient()
  
  console.log('Creating/updating shipments views...')
  
  try {
    console.log('Note: Creating views using alternative approach since direct SQL execution may be limited.')
    console.log('You may need to run these SQL commands manually in your Supabase SQL editor:')
    
    console.log('\n-- Drop existing views:')
    console.log('DROP VIEW IF EXISTS meli_shipments_view CASCADE;')
    console.log('DROP VIEW IF EXISTS meli_shipment_pack_items_view CASCADE;')
    
    console.log('\n-- Create main shipments view:')
    const shipmentsViewSQL = `CREATE VIEW meli_shipments_view AS
SELECT 
  o.shipping_id as shipment_id,
  o.meli_user_id,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(oi.quantity), 0) as total_items,
  s.status as shipment_status,
  s.last_updated as shipment_last_updated,
  s.tracking_number,
  s.tracking_method
FROM meli_orders o
LEFT JOIN meli_order_items oi ON o.id = oi.order_id
LEFT JOIN meli_shipment_status s ON o.shipping_id = s.id AND o.meli_user_id = s.meli_user_id
WHERE 
  o.fulfilled = false
  AND o.shipping_id IS NOT NULL
  AND o.status IN ('paid', 'confirmed')
  AND (s.status IS NULL OR s.status NOT IN ('delivered', 'closed', 'Delivered', 'Closed'))
GROUP BY 
  o.shipping_id, 
  o.meli_user_id,
  s.status,
  s.last_updated,
  s.tracking_number,
  s.tracking_method
ORDER BY o.shipping_id;`
    
    console.log(shipmentsViewSQL)
    
    console.log('\n-- Create shipment pack items view:')
    const packItemsViewSQL = `CREATE VIEW meli_shipment_pack_items_view AS
SELECT 
  o.shipping_id as shipment_id,
  oi.order_id,
  oi.item_id,
  oi.variation_id,
  NULL as user_product_id,
  oi.quantity,
  oi.unit_price,
  oi.currency_id,
  COALESCE(
    oi.variation_attributes,
    v.attributes,
    '{}'::jsonb
  ) as variation_attributes,
  COALESCE(i.title, 'Unknown Item') as item_title,
  s.status as shipment_status,
  s.last_updated as shipment_last_updated
FROM meli_orders o
JOIN meli_order_items oi ON o.id = oi.order_id
LEFT JOIN meli_items i ON oi.item_id = i.id
LEFT JOIN meli_variations v ON oi.item_id = v.item_id AND oi.variation_id = v.variation_id
LEFT JOIN meli_shipment_status s ON o.shipping_id = s.id AND o.meli_user_id = s.meli_user_id
WHERE 
  o.fulfilled = false
  AND o.shipping_id IS NOT NULL
  AND o.status IN ('paid', 'confirmed')
  AND (s.status IS NULL OR s.status NOT IN ('delivered', 'closed', 'Delivered', 'Closed'))
ORDER BY o.shipping_id, oi.order_id, oi.item_id;`
    
    console.log(packItemsViewSQL)
    
    console.log('\n=== Manual SQL Commands to Execute ===')
    console.log('Please copy and execute these commands in your Supabase SQL editor:')
    console.log('\n1. Drop existing views:')
    console.log('DROP VIEW IF EXISTS meli_shipments_view CASCADE;')
    console.log('DROP VIEW IF EXISTS meli_shipment_pack_items_view CASCADE;')
    console.log('\n2. Create views:')
    console.log(shipmentsViewSQL)
    console.log('\n')
    console.log(packItemsViewSQL)
    
    console.log('\n=== INSTRUCTIONS ===')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL commands above')
    console.log('4. Execute them to create the views')
    console.log('5. The views will automatically update when underlying data changes')
    
    console.log('\nView creation script completed.')
    console.log('Views will filter out:')
    console.log('- Orders with fulfilled = true')
    console.log('- Shipments with status = delivered, closed, Delivered, or Closed')
    
    return {
      status: 'sql_generated',
      message: 'SQL commands generated for manual execution',
      views: ['meli_shipments_view', 'meli_shipment_pack_items_view']
    }
    
  } catch (error) {
    console.error('Error creating shipments views:', error)
    throw error
  }
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  createShipmentsViews()
    .then((result) => {
      console.log('Shipments views creation completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}