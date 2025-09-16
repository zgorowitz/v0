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

function generateDailyRanges(days = 7) {
  const ranges = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(today.getDate() - i)
    const dateString = date.toISOString().split('T')[0]

    ranges.push({
      date_from: dateString,
      date_to: dateString
    })
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

async function fetchItemVisits(options = {}) {
  const { days = 7 } = options

  const supabase = createClient()
  const tokens = await getTokens()
  const dailyRanges = generateDailyRanges(days)

  console.log(`Fetching item visits data for ${days} days (${dailyRanges.length} separate API calls)`)

  for (const { meli_user_id, access_token } of tokens) {
    console.log(`Processing visits for user: ${meli_user_id}`)
    const items = await getItemsForUser(meli_user_id)
    console.log(`Found ${items.length} items for user ${meli_user_id}`)

    for (const { item_id } of items) {
      console.log(`Fetching visits for item: ${item_id}`)

      for (const { date_from, date_to } of dailyRanges) {
        console.log(`  Fetching data for ${date_from}`)
        try {
          const url = `https://api.mercadolibre.com/items/visits?ids=${item_id}&date_from=${date_from}&date_to=${date_to}`
          const visitsData = await apiRequest(url, access_token)

          if (visitsData && visitsData.length > 0) {
            const parsedData = parseVisitsData(visitsData[0], meli_user_id)
            const { error: insertError } = await supabase
              .from('ml_item_visits_v2')
              .upsert(parsedData, {
                onConflict: ['item_id', 'date_from', 'date_to']
              })

            if (insertError) {
              console.error(`    Error storing visits for ${item_id}:`, insertError.message)
            } else {
              console.log(`    Stored visits for item ${item_id} on ${date_from}`)
            }
          } else {
            console.log(`    No visits data for item ${item_id} on ${date_from}`)
          }
        } catch (error) {
          console.error(`  Error fetching visits for ${item_id} on ${date_from}:`, error.message)
        }

        // Rate limiting between days
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  console.log(`Item visits fetch completed for ${days} days`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchItemVisits().catch(console.error)
}