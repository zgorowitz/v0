// scripts/fetch_order_notes.mjs
// Fetch order notes for meli orders

import { createClient, refreshAllTokens, getMeliUsers } from '../../lib/supabase/script-client.js'
import dotenv from 'dotenv'

dotenv.config()

// API request with auth and x-format-new header
async function apiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-format-new': 'true',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  // console.log(`API response for ${url}:`, JSON.stringify(data, null, 2))
  return data
}

// Parse order notes data
function parseOrderNotes(notesData, orderId, meliUserId) {
  
  if (!notesData || !Array.isArray(notesData)) {
    return []
  }
  
  const allNotes = []
  
  notesData.forEach(noteWrapper => {
    if (noteWrapper.results && Array.isArray(noteWrapper.results)) {
      noteWrapper.results.forEach(note => {
        console.log(`Processing note:`, { id: note.id, note: note.note })
        allNotes.push({
          id: note.id,
          order_id: orderId,
          meli_user_id: meliUserId,
          note: note.note || null,
          date_created: note.date_created || null,
          date_last_updated: note.date_last_updated || null
        })
      })
    }
  })
  
  console.log(`Parsed ${allNotes.length} notes for order ${orderId}`)
  return allNotes
}

// Get order IDs that need notes to be fetched
async function getOrdersToFetch(supabase) {
  const twentyFourHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  
  // Get order IDs from meli_orders where fulfilled = false and updated in last 24 hours
  const { data: orders, error } = await supabase
    .from('meli_orders')
    .select('id, meli_user_id')
    .eq('fulfilled', false)
    .gte('date_last_updated', twentyFourHoursAgo)
  
  if (error) throw error
  
  // Convert to map for easy lookup
  const ordersMap = new Map()
  orders?.forEach(order => {
    ordersMap.set(order.id, order.meli_user_id)
  })
  
  return ordersMap
}

// Main function
export async function fetchOrderNotes(options = {}) {
  const { refreshTokens = true } = options
  
  const supabase = createClient()
  const BATCH_SIZE = 20 // Batch size for API calls
  
  // Refresh tokens before fetching order notes
  if (refreshTokens) {
    console.log('🔄 Refreshing tokens before fetching order notes...')
    try {
      await refreshAllTokens()
    } catch (error) {
      console.warn('⚠️  Token refresh failed, continuing with existing tokens:', error.message)
    }
  }
  
  // Get all meli users with their tokens
  const meliUsers = await getMeliUsers()
  
  // Get orders that need notes to be fetched
  const ordersMap = await getOrdersToFetch(supabase)
  
  if (ordersMap.size === 0) {
    console.log('No orders to fetch notes for')
    return
  }
  
  console.log(`Fetching notes for ${ordersMap.size} orders`)
  
  // Group orders by meli_user_id
  const ordersByUser = new Map()
  
  for (const [orderId, meliUserId] of ordersMap) {
    if (!meliUserId) {
      console.warn(`Order ${orderId} has no meli_user_id, skipping`)
      continue
    }
    
    if (!ordersByUser.has(meliUserId)) {
      ordersByUser.set(meliUserId, [])
    }
    ordersByUser.get(meliUserId).push(orderId)
  }
  
  let totalNotes = 0
  let errorCount = 0
  
  // Process orders grouped by user
  for (const [meliUserId, orderIds] of ordersByUser) {
    const user = meliUsers.find(u => u.meli_user_id === meliUserId)
    if (!user) {
      console.warn(`Token not found for user ${meliUserId}, skipping ${orderIds.length} orders`)
      errorCount += orderIds.length
      continue
    }
    
    console.log(`Processing notes for ${orderIds.length} orders for user ${meliUserId}`)
    
    // Process in batches of 20
    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE)
      
      try {
        // Fetch order notes in parallel for this batch
        const notesPromises = batch.map(orderId => 
          apiRequest(`https://api.mercadolibre.com/orders/${orderId}/notes`, user.access_token)
            .then(notesData => ({ orderId, notesData, success: true }))
            .catch(error => ({ orderId, error, success: false }))
        )
        
        const results = await Promise.all(notesPromises)
        
        // Process results
        for (const result of results) {
          if (result.success) {
            try {
              const parsedNotes = parseOrderNotes(result.notesData, result.orderId, meliUserId)
              
              // Only insert if there are notes
              if (parsedNotes.length > 0) {
                const { error: notesError } = await supabase
                  .from('meli_order_notes')
                  .upsert(parsedNotes)
                
                if (notesError) {
                  console.error(`Error storing notes for order ${result.orderId}:`, notesError)
                  errorCount++
                } else {
                  totalNotes += parsedNotes.length
                  // console.log(`${parsedNotes.length} notes for order ${result.orderId} fetched successfully`)
                }
              }
            } catch (error) {
              console.error(`Error parsing notes for order ${result.orderId}:`, error)
              errorCount++
            }
          } else {
            console.error(`Failed to fetch notes for order ${result.orderId}:`, result.error.message)
            errorCount++
          }
        }
        
      } catch (error) {
        console.error(`Error processing batch for user ${meliUserId}:`, error)
        errorCount += batch.length
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total notes processed: ${totalNotes}`)
  console.log(`Total errors: ${errorCount}`)
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOrderNotes()
    .then(() => {
      console.log('Order notes fetch completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Order notes fetch failed:', error)
      process.exit(1)
    })
}