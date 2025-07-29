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
    status: item.status || 'unknown'
  }
}

// Parse variation data
function parseVariation(itemId, variation, index = 0) {
  // Handle both old format (variations array) and new format (user_product_id)
  const variationId = variation.user_product_id || `${itemId}_var_${index}`
  
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
    // Handle old format
    attributes = variation.attributes
  }
  
  // Get first picture URL if available
  let pictureUrl = null
  if (variation.picture_ids && variation.picture_ids.length > 0) {
    const pictureId = variation.picture_ids[0]
    pictureUrl = `https://http2.mlstatic.com/D_${pictureId}.jpg`
  }
  
  return {
    item_id: itemId,
    variation_id: variationId,
    price: variation.price || 0,
    available_quantity: variation.available_quantity || 0,
    sold_quantity: variation.sold_quantity || 0,
    picture_url: pictureUrl,
    attributes: attributes
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
  
  // Get all meli users
  const { data: meliUsers, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  
  if (error) throw error
  
  let totalItems = 0
  let totalVariations = 0
  
  for (const user of meliUsers) {
    
    try {
      // Use paginated fetch
      const itemIds = await fetchAllItemIdsForUser(user.meli_user_id, user.access_token)
      
      if (itemIds.length === 0) {
        continue
      }
      
      for (const itemId of itemIds) {
        // Get detailed item (without variations first)
        const itemDetail = await apiRequest(
          `https://api.mercadolibre.com/items/${itemId}`,
          user.access_token
        )
        
        // Debug: Check if itemDetail has expected structure
        if (!itemDetail.id) {
          continue
        }
        
        // Store item
        const itemData = parseItem(itemDetail, user.meli_user_id)
        
        const { error: itemError } = await supabase.from('meli_items').upsert(itemData, { onConflict: ['id'] })
        
        if (itemError) {
          continue
        }
        
        totalItems++
        
        // Now get variations separately
        try {
          const variationsResponse = await apiRequest(
            `https://api.mercadolibre.com/items/${itemId}?attributes=variations`,
            user.access_token
          )
          
          if (variationsResponse.variations && variationsResponse.variations.length > 0) {
            const variations = variationsResponse.variations.map((variation, index) => 
              parseVariation(itemId, variation, index)
            )
            
            const { error: variationError } = await supabase.from('meli_variations').upsert(variations, { 
              onConflict: ['item_id', 'variation_id'] 
            })
            
            if (variationError) {
            } else {
              totalVariations += variations.length
            }
          }
        } catch (variationError) {
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
    } catch (error) {
      continue
    }
  }
  
}

// Fetch items for specific user
export async function fetchUserItems(meliUserId) {
  const supabase = createClient()
  
  const { data: userToken } = await supabase
    .from('meli_tokens')
    .select('access_token')
    .eq('meli_user_id', meliUserId)
    .single()
  
  if (!userToken) throw new Error('User token not found')
  
  // Use paginated fetch
  const itemIds = await fetchAllItemIdsForUser(meliUserId, userToken.access_token)
  
  for (const itemId of itemIds) {
    // Get main item first
    const itemDetail = await apiRequest(
      `https://api.mercadolibre.com/items/${itemId}`,
      userToken.access_token
    )
    
    const itemData = parseItem(itemDetail, meliUserId)
    await supabase.from('meli_items').upsert(itemData, { onConflict: ['id'] })
    
    // Get variations separately
    try {
      const variationsResponse = await apiRequest(
        `https://api.mercadolibre.com/items/${itemId}?attributes=variations`,
        userToken.access_token
      )
      
      if (variationsResponse.variations?.length > 0) {
        const variations = variationsResponse.variations.map((variation, index) => 
          parseVariation(itemId, variation, index)
        )
        
        await supabase.from('meli_variations').upsert(variations, { 
          onConflict: ['item_id', 'variation_id'] 
        })
      }
    } catch (variationError) {
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllItems()
    .then(() => {
      process.exit(0)
    })
    .catch(console.error)
}