// scripts/test_single_order.mjs
// Test script to process a single order and show full API response + formatted data

import { getMeliUsers } from '../../lib/supabase/script-client.js'
import { apiRequest } from '../../lib/utils.js'
import dotenv from 'dotenv'

dotenv.config()


async function testSingleOrder(orderId = '2000012319786940') {  
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
  

  
  // Print full API response
  console.log(`\n📋 FULL API RESPONSE`)
  console.log(`${'='.repeat(80)}`)
  console.log(JSON.stringify(foundOrder, null, 2))
  
}

// Allow passing order ID as command line argument
const orderId = process.argv[2] || '2000012319786940'

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