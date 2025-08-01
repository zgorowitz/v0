// scripts/fetch_items.mjs
// Fetch all items and variations for all meli users
// Updated to handle User Products model (user_product_id and family_name)

// import { createClient as createSupabaseClient } from '@supabase/supabase-js'
// import dotenv from 'dotenv'

// dotenv.config()

// // Create Supabase client
// function createClient() {
//   return createSupabaseClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY
//   )
// }

// // API request with auth
// async function apiRequest(url, accessToken) {
//   const response = await fetch(url, {
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
//     }
//   })
//   if (!response.ok) {
//     throw new Error(`API request failed: ${response.status} ${response.statusText}`)
//   }
//   console.log("api")
//   return response.json()
// }

// // Parse item data - Updated to include family_name and user_product_id
// function parseItem(item, meliUserId) {
//   // Defensive parsing - ensure required fields exist
//   if (!item.id) {
//     throw new Error(`Item missing required ID field: ${JSON.stringify(item)}`)
//   }
  
//   return {
//     id: item.id,
//     meli_user_id: meliUserId,
//     title: item.title || 'Untitled',
//     category_id: item.category_id || null,
//     price: item.price || 0,
//     condition: item.condition || null,
//     available_quantity: item.available_quantity || 0,
//     sold_quantity: item.sold_quantity || 0,
//     thumbnail: item.thumbnail || null,
//     permalink: item.permalink || null,
//     listing_type: item.listing_type_id || null,
//     status: item.status || 'unknown',
//     family_name: item.family_name || null,
//     user_product_id: item.user_product_id || null
//   }
// }

// // Parse variation data - Updated to handle User Products model
// function parseVariation(itemId, variation, index = 0, itemHasFamilyName = false, itemUserProductId = null) {
//   // Determine variation_id based on new User Products model logic:
//   // 1. If variation has user_product_id, use it
//   // 2. If item has family_name but no variations with user_product_id, use item's user_product_id
//   // 3. Fallback to old variation.id or generated ID
  
//   let variationId
//   let userProductId = null
  
//   if (variation.user_product_id) {
//     // New model: variation has its own user_product_id
//     variationId = variation.user_product_id
//     userProductId = variation.user_product_id
//   } else if (itemHasFamilyName && itemUserProductId) {
//     // New model: item has family_name, use item's user_product_id for variation
//     variationId = itemUserProductId
//     userProductId = itemUserProductId
//   } else if (variation.id) {
//     // Old model: use variation.id
//     variationId = variation.id
//   } else {
//     // Fallback: generate ID
//     variationId = `${itemId}_var_${index}`
//   }
  
//   // Convert attribute_combinations to simpler attributes object
//   let attributes = {}
//   if (variation.attribute_combinations) {
//     variation.attribute_combinations.forEach(attr => {
//       attributes[attr.id] = {
//         name: attr.name,
//         value_id: attr.value_id,
//         value_name: attr.value_name,
//         value_type: attr.value_type
//       }
//     })
//   } else if (variation.attributes) {
//     // Handle old format
//     attributes = variation.attributes
//   }
  
//   // Get first picture URL if available
//   let pictureUrl = null
//   if (variation.picture_ids && variation.picture_ids.length > 0) {
//     const pictureId = variation.picture_ids[0]
//     pictureUrl = `https://http2.mlstatic.com/D_${pictureId}.jpg`
//   }
  
//   // Extract seller SKU from attributes
//   const sellerSku = 
//     variation.attributes?.find(attr => attr.id === 'SELLER_SKU')?.value_name ||
//     null
  
//   console.log(`Variation ID: ${variationId}, User Product ID: ${userProductId}, Seller SKU: ${sellerSku}`)
  
//   return {
//     item_id: itemId,
//     variation_id: variationId,
//     user_product_id: userProductId, // Add this field to track user product ID
//     price: variation.price || 0,
//     available_quantity: variation.available_quantity || 0,
//     sold_quantity: variation.sold_quantity || 0,
//     picture_url: pictureUrl,
//     attributes: attributes,
//     seller_sku: sellerSku
//   }
// }

// // Create a variation from item data when item has family_name but no variations
// function createVariationFromItem(item, meliUserId) {
//   // This handles items that have been migrated to User Products model
//   // but don't have explicit variations array
  
//   const userProductId = item.user_product_id
//   if (!userProductId) {
//     return null // Can't create variation without user_product_id
//   }
  
//   return {
//     item_id: item.id,
//     variation_id: userProductId,
//     user_product_id: userProductId,
//     price: item.price || 0,
//     available_quantity: item.available_quantity || 0,
//     sold_quantity: item.sold_quantity || 0,
//     picture_url: item.thumbnail || null,
//     attributes: {}, // Items don't have variation-specific attributes
//     seller_sku: null // Items don't have seller SKU at this level
//   }
// }

// // Add this helper function after your imports and before your main functions
// async function fetchAllItemIdsForUser(meliUserId, accessToken) {
//   let allItemIds = []
//   let offset = 0
//   const limit = 50 // MercadoLibre API default/max

//   while (true) {
//     const url = `https://api.mercadolibre.com/users/${meliUserId}/items/search?offset=${offset}&limit=${limit}`
//     const itemsResponse = await apiRequest(url, accessToken)
//     const results = itemsResponse.results || []
//     allItemIds.push(...results)
//     if (results.length < limit) break // No more pages
//     offset += limit
//   }
//   return allItemIds
// }

// // Main function - TESTING MODE: Only fetch MLA1510507335
// export async function fetchAllItems() {
//   const supabase = createClient()
  
//   // Get all meli users
//   const { data: meliUsers, error } = await supabase
//     .from('meli_tokens')
//     .select('meli_user_id, access_token')
  
//   if (error) throw error
  
//   const TEST_ITEM_ID = 'MLA1510507335'
  
//   for (const user of meliUsers) {
//     try {
//       console.log(`\n=== TESTING WITH USER ${user.meli_user_id} ===`)
      
//       // Get specific test item
//       const itemDetail = await apiRequest(
//         `https://api.mercadolibre.com/items/${TEST_ITEM_ID}?include_attributes=all`,
//         user.access_token
//       )
      
//       console.log('\n📄 FULL API RESPONSE:')
//       console.log('=====================')
//       console.log(JSON.stringify(itemDetail, null, 2))
//       console.log('=====================\n')
      
//       // Debug: Check if itemDetail has expected structure
//       if (!itemDetail.id) {
//         console.log('❌ Item missing ID, skipping')
//         continue
//       }
      
//       // Parse and show what goes into items table
//       const itemData = parseItem(itemDetail, user.meli_user_id)
//       console.log('📊 DATA FOR meli_items TABLE:')
//       console.log('=============================')
//       console.log(JSON.stringify(itemData, null, 2))
//       console.log('=============================\n')
      
//       // Store item
//       const { error: itemError } = await supabase.from('meli_items').upsert(itemData, { onConflict: ['id'] })
      
//       if (itemError) {
//         console.error('❌ Error storing item:', itemError)
//         continue
//       }
      
//       console.log('✅ Item stored successfully')
      
//       // Handle variations based on User Products model
//       const hasFamilyName = itemDetail.family_name !== null && itemDetail.family_name !== undefined
//       const hasVariations = itemDetail.variations && itemDetail.variations.length > 0
//       const itemUserProductId = itemDetail.user_product_id
      
//       console.log(`\n🔍 ITEM ANALYSIS:`)
//       console.log(`   family_name: ${itemDetail.family_name}`)
//       console.log(`   user_product_id: ${itemUserProductId}`)
//       console.log(`   has variations: ${hasVariations}`)
//       console.log(`   variations count: ${hasVariations ? itemDetail.variations.length : 0}`)
      
//       let variationsToStore = []
      
//       if (hasVariations) {
//         console.log('\n📋 PROCESSING VARIATIONS:')
//         // Item has explicit variations - process them
//         variationsToStore = itemDetail.variations.map((variation, index) => {
//           console.log(`\n   Variation ${index + 1}:`)
//           console.log(`   Raw variation data:`, JSON.stringify(variation, null, 4))
          
//           const parsedVariation = parseVariation(TEST_ITEM_ID, variation, index, hasFamilyName, itemUserProductId)
//           console.log(`   Parsed variation:`, JSON.stringify(parsedVariation, null, 4))
          
//           return parsedVariation
//         })
//       } else if (hasFamilyName && itemUserProductId) {
//         console.log('\n🔄 CREATING SYNTHETIC VARIATION (family_name exists, no explicit variations):')
//         // Item has family_name but no explicit variations
//         const syntheticVariation = createVariationFromItem(itemDetail, user.meli_user_id)
//         if (syntheticVariation) {
//           console.log('   Synthetic variation:', JSON.stringify(syntheticVariation, null, 4))
//           variationsToStore.push(syntheticVariation)
//         }
//       } else {
//         console.log('\n📝 NO VARIATIONS TO CREATE (old model, single item)')
//       }
      
//       console.log('\n📊 DATA FOR meli_variations TABLE:')
//       console.log('==================================')
//       if (variationsToStore.length > 0) {
//         variationsToStore.forEach((variation, index) => {
//           console.log(`Variation ${index + 1}:`)
//           console.log(JSON.stringify(variation, null, 2))
//           console.log('---')
//         })
//       } else {
//         console.log('No variations to store')
//       }
//       console.log('==================================\n')
      
//       // Store variations if any
//       if (variationsToStore.length > 0) {
//         const { error: variationError } = await supabase.from('meli_variations').upsert(variationsToStore, { 
//           onConflict: ['item_id', 'variation_id'] 
//         })
        
//         if (variationError) {
//           console.error(`❌ Error storing variations:`, variationError)
//         } else {
//           console.log(`✅ Stored ${variationsToStore.length} variations successfully`)
//         }
//       }
      
//       // Only test with first user that works
//       console.log('\n🎉 TEST COMPLETED SUCCESSFULLY')
//       return
      
//     } catch (error) {
//       console.error(`❌ Error processing user ${user.meli_user_id}:`, error)
//       console.log('Trying next user...\n')
//       continue
//     }
//   }
  
//   console.log('❌ No users were able to fetch the test item')
// }

// // Fetch items for specific user
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
//     await supabase.from('meli_items').upsert(itemData, { onConflict: ['id'] })
    
//     // Handle variations based on User Products model
//     const hasFamilyName = itemDetail.family_name !== null && itemDetail.family_name !== undefined
//     const hasVariations = itemDetail.variations && itemDetail.variations.length > 0
//     const itemUserProductId = itemDetail.user_product_id
    
//     let variationsToStore = []
    
//     if (hasVariations) {
//       // Item has explicit variations - process them
//       variationsToStore = itemDetail.variations.map((variation, index) => 
//         parseVariation(itemId, variation, index, hasFamilyName, itemUserProductId)
//       )
//     } else if (hasFamilyName && itemUserProductId) {
//       // Item has family_name but no explicit variations
//       const syntheticVariation = createVariationFromItem(itemDetail, meliUserId)
//       if (syntheticVariation) {
//         variationsToStore.push(syntheticVariation)
//       }
//     }
    
//     // Store variations if any
//     if (variationsToStore.length > 0) {
//       await supabase.from('meli_variations').upsert(variationsToStore, { 
//         onConflict: ['item_id', 'variation_id'] 
//       })
//     }
    
//     await new Promise(resolve => setTimeout(resolve, 100))
//   }
// }

// // Standalone runner
// if (import.meta.url === `file://${process.argv[1]}`) {
//   fetchAllItems()
//     .then(() => {
//       console.log('Fetch completed successfully')
//       process.exit(0)
//     })
//     .catch((error) => {
//       console.error('Fetch failed:', error)
//       process.exit(1)
//     })
// }