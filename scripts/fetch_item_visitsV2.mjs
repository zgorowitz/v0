import { createClient } from '../lib/supabase/script-client.js'
import { apiRequest } from '../lib/scripts/utils.js'

async function getTokens() {
  const supabase = createClient()
  const { data } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  return data || []
}

async function getItemsForUser(meliUserId) {
  const supabase = createClient()
  const { data } = await supabase
    .from('ml_items_v2')
    .select('item_id')
    .eq('meli_user_id', meliUserId)
  return data || []
}

function generateMonthlyRanges() {
  const ranges = []
  const start = new Date('2024-01-01')
  const now = new Date()
  
  // Stop at last complete month (previous month)
  const lastCompleteMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  let current = new Date(start)
  
  while (current <= lastCompleteMonth) {
    const dateFrom = new Date(current.getFullYear(), current.getMonth(), 1)
    const dateTo = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    
    ranges.push({
      date_from: dateFrom.toISOString().split('T')[0],
      date_to: dateTo.toISOString().split('T')[0]
    })
    
    current.setMonth(current.getMonth() + 1)
  }
  
  return ranges
}

function parseVisitsData(visitsData, meliUserId) {
  return {
    item_id: visitsData.item_id,
    date_from: visitsData.date_from,
    date_to: visitsData.date_to,
    total_visits: visitsData.total_visits,
    visits_detail: visitsData.visits_detail,
    meli_user_id: meliUserId
  }
}

async function fetchItemVisits() {
  const supabase = createClient()
  const tokens = await getTokens()
  const monthlyRanges = generateMonthlyRanges()
  
  for (const { meli_user_id, access_token } of tokens) {
    const items = await getItemsForUser(meli_user_id)
    
    for (const { item_id } of items) {
      for (const { date_from, date_to } of monthlyRanges) {
        try {
          const url = `https://api.mercadolibre.com/items/visits?ids=${item_id}&date_from=${date_from}&date_to=${date_to}`
          const visitsData = await apiRequest(url, access_token)
          
          if (visitsData && visitsData.length > 0) {
            const parsedData = parseVisitsData(visitsData[0], meli_user_id)
            await supabase.from('ml_item_visits_v2').upsert(parsedData)
          }
        } catch (error) {
          console.error(`Error fetching visits for ${item_id} (${date_from} to ${date_to}):`, error.message)
          console.error(`URL: https://api.mercadolibre.com/items/visits?ids=${item_id}&date_from=${date_from}&date_to=${date_to}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchItemVisits().catch(console.error)
}