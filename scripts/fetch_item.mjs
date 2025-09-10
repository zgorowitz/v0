// scripts/fetch_items.mjs
// Fetch all items and variations for all meli users

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

// API request with auth
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

// Parse item data
function parseItem(item, meliUserId) {
  // Defensive parsing - ensure required fields exist
  if (!item.id) {
    throw new Error(`Item missing required ID field: ${JSON.stringify(item)}`)
  }
  
  return {
    id: item.id,
    meli_user_id: meliUserId,
    title: item.title || 'Untitled',
    category_id: item.category_id || null,
    price: item.price || 0,
    condition: item.condition || null,
    available_quantity: item.available_quantity || 0,
    sold_quantity: item.sold_quantity || 0,
    thumbnail: item.thumbnail || null,
    permalink: item.permalink || null,
    listing_type: item.listing_type_id || null,
    status: item.status || 'unknown',
    family_name: item.family_name || null,
    // family_id: item.family_id || null,
    user_product_id: item.user_product_id || null
  }
}

// Extract seller SKU from attributes array
function extractSellerSku(attributes) {
  if (!attributes || !Array.isArray(attributes)) return null
  
  const skuAttribute = attributes.find(attr => attr.id === 'SELLER_SKU')
  return skuAttribute?.value_name || null
}

// Parse variation data - Updated to handle all 4 scenarios
function parseVariation(itemId, variation, index = 0, item = null) {
  let userProductId = null
  let sellerSku = null

    // SKU from variation attributes
    sellerSku = extractSellerSku(variation.attributes)
  
  // Convert attribute_combinations to simpler attributes object
  let attributes = {}
  if (variation.attribute_combinations) {
    variation.attribute_combinations.forEach(attr => {
      attributes[attr.id] = {
        name: attr.name,
        value_id: attr.value_id,
        value_name: attr.value_name,
        value_type: attr.value_type
      }
    })
  } else if (variation.attributes) {
    // Handle old format - convert attributes array to object
    variation.attributes.forEach(attr => {
      attributes[attr.id] = {
        name: attr.name,
        value_id: attr.value_id,
        value_name: attr.value_name,
        value_type: attr.value_type
      }
    })
  }
  
  // Get first picture URL if available
  let pictureUrl = null
  if (variation.picture_ids && variation.picture_ids.length > 0) {
    const pictureId = variation.picture_ids[0]
    pictureUrl = `https://http2.mlstatic.com/D_${pictureId}-O.jpg`
  }
      
  return {
    item_id: itemId,
    variation_id: variation.id || null,
    user_product_id: variation.user_product_id || null,
    price: variation.price || 0,
    available_quantity: variation.available_quantity || 0,
    sold_quantity: variation.sold_quantity || 0,
    picture_url: pictureUrl,
    attributes: attributes,
    seller_sku: sellerSku
  }
}

// SCENARIO 2: Create a variation from item data when item has family_name but empty variations
function createVariationFromItem(item) {
  const userProductId = item.user_product_id
  if (!userProductId) {
    return null
  }
  
  // SKU from item attributes (not variation attributes)
  const sellerSku = extractSellerSku(item.attributes)
    
  return {
    item_id: item.id,
    variation_id: userProductId,
    user_product_id: userProductId,
    price: item.price || 0,
    available_quantity: item.available_quantity || 0,
    sold_quantity: item.sold_quantity || 0,
    picture_url: item.thumbnail || null,
    attributes: item.attributes, // Items don't have variation-specific attributes
    seller_sku: sellerSku
  }
}

// Add this helper function after your imports and before your main functions
async function fetchAllItemIdsForUser(meliUserId, accessToken) {
  let allItemIds = []
  let offset = 0
  const limit = 50 // MercadoLibre API default/max

  while (true) {
    const url = `https://api.mercadolibre.com/users/${meliUserId}/items/search?offset=${offset}&limit=${limit}`
    const itemsResponse = await apiRequest(url, accessToken)
    const results = itemsResponse.results || []
    allItemIds.push(...results)
    if (results.length < limit) break // No more pages
    offset += limit
  }
  return allItemIds
}

// Main function
export async function fetchAllItems() {
  const supabase = createClient()
  const BATCH_SIZE = 30 // MercadoLibre's multiget limit
  
  // Get all meli users
  const { data: meliUsers, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  
  if (error) throw error
  
  let totalItems = 0
  let totalVariations = 0
  let scenarioCounts = { scenario1: 0, scenario2: 0, scenario3: 0, scenario4: 0 }
  
  for (const user of meliUsers) {
    try {
      const itemIds = await fetchAllItemIdsForUser(user.meli_user_id, user.access_token)
      console.log(`Fetching items for user: ${user.meli_user_id} (${itemIds.length} items)`)
      
      if (itemIds.length === 0) continue
      
      // Process items in batches
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE)
        const itemsQuery = batch.join('&ids=')
        // Fetch multiple items at once
        const itemsDetail = await apiRequest(
          `https://api.mercadolibre.com/items?ids=${itemsQuery}&include_attributes=all`,
          user.access_token
        )
        
        // Process each item in the batch
        for (const response of itemsDetail) {
          if (response.code !== 200 || !response.body?.id) continue
          
          const itemDetail = response.body
          const itemData = parseItem(itemDetail, user.meli_user_id)
          
          const { error: itemError } = await supabase.from('meli_items').upsert(itemData)
          
          if (itemError) {
            console.error(`Error storing item ${itemDetail.id}:`, itemError)
            continue
          }
          
          totalItems++
          console.log(totalItems)

          // Analyze item structure for scenario detection
          const hasFamilyName = itemDetail.family_name !== null && itemDetail.family_name !== undefined
          const hasVariations = itemDetail.variations && itemDetail.variations.length > 0
          const itemUserProductId = itemDetail.user_product_id
          
          let variationsToStore = []
          
          if (hasVariations) {
            // SCENARIO 1 or SCENARIO 3: Item has explicit variations
            variationsToStore = itemDetail.variations.map((variation, index) => {
              const parsedVariation = parseVariation(itemDetail.id, variation, index, itemDetail)
              
              // Count scenarios
              if (variation.user_product_id) {
                scenarioCounts.scenario1++
              } else if (variation.id) {
                scenarioCounts.scenario3++
              } else {
                scenarioCounts.scenario4++
              }
              
              return parsedVariation
            })
          } else if (hasFamilyName && itemUserProductId) {
            // SCENARIO 2: Item has family_name and user_product_id but no explicit variations
            const syntheticVariation = createVariationFromItem(itemDetail)
            if (syntheticVariation) {
              variationsToStore.push(syntheticVariation)
              scenarioCounts.scenario2++
            }
          }
          
          // Store variations if any
          if (variationsToStore.length > 0) {
            const { error: variationError } = await supabase.from('meli_variations').upsert(variationsToStore)
            
            if (variationError) {
              console.error(`Error storing variations for item ${itemDetail.id}:`, variationError)
            } else {
              totalVariations += variationsToStore.length
            }
          }
        }
        
        // Rate limiting between batches
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      console.log(`User ${user.meli_user_id} - Items processed: ${totalItems}`);

    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error)
      continue
    }
  }
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total items processed: ${totalItems}`)
  console.log(`Total variations processed: ${totalVariations}`)
  console.log(`Scenario 1 (New Model with Variations): ${scenarioCounts.scenario1}`)
  console.log(`Scenario 2 (End State - Single Variant): ${scenarioCounts.scenario2}`)
  console.log(`Scenario 3 (Old Model with Variations): ${scenarioCounts.scenario3}`)
  console.log(`Scenario 4 (Fallback): ${scenarioCounts.scenario4}`)
}

// Fetch items for specific user
// export async function fetchUserItems(meliUserId) {
//   const supabase = createClient()
  
//   const { data: userToken } = await supabase
//     .from('meli_tokens')
//     .select('access_token')
//     .eq('meli_user_id', meliUserId)
//     .single()
  
//   if (!userToken) throw new Error('User token not found')
  
//   // Use paginated fetch
//   const itemIds = await fetchAllItemIdsForUser(meliUserId, userToken.access_token)
  
//   for (const itemId of itemIds) {
//     // Get complete item data including all attributes for variations
//     const itemDetail = await apiRequest(
//       `https://api.mercadolibre.com/items/${itemId}?include_attributes=all`,
//       userToken.access_token
//     )
    
//     const itemData = parseItem(itemDetail, meliUserId)
//     await supabase.from('meli_items').upsert(itemData)
    
//     // Handle variations based on all scenarios
//     const hasFamilyName = itemDetail.family_name !== null && itemDetail.family_name !== undefined
//     const hasVariations = itemDetail.variations && itemDetail.variations.length > 0
//     const itemUserProductId = itemDetail.user_product_id
    
//     let variationsToStore = []
    
//     if (hasVariations) {
//       // SCENARIO 1 or SCENARIO 3: Item has explicit variations
//       variationsToStore = itemDetail.variations.map((variation, index) => 
//         parseVariation(itemId, variation, index, itemDetail)
//       )
//     } else if (hasFamilyName && itemUserProductId) {
//       // SCENARIO 2: Item has family_name and user_product_id but no explicit variations
//       const syntheticVariation = createVariationFromItem(itemDetail)
//       if (syntheticVariation) {
//         variationsToStore.push(syntheticVariation)
//       }
//     }
    
//     // Store variations if any
//     if (variationsToStore.length > 0) {
//       await supabase.from('meli_variations').upsert(variationsToStore)
//     }
    
//     await new Promise(resolve => setTimeout(resolve, 100))
//   }
// }

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllItems()
    .then(() => {
      console.log('Fetch completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fetch failed:', error)
      process.exit(1)
    })
}