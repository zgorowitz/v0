// scripts/fetch_ads.mjs
// Fetch advertising data for all meli users with daily incremental updates

import { createClient, getMeliUsers } from '../lib/supabase/script-client.js'
import { apiRequest, apiRequestV2, paginateV2 } from '../lib/utils.js'

function parseAdvertiser(advertiser, meli_user_id) {
  return {
    advertiser_id: advertiser.advertiser_id,
    name: advertiser.advertiser_name || null,
    account_name: advertiser.account_name || null,
    site_id: advertiser.site_id || null,
    meli_user_id: meli_user_id || null,

  }
}

function hasSignificantMetrics(metrics) {
  // Check if item has any significant advertising activity
  const clicks = metrics.clicks || 0
  const prints = metrics.prints || 0
  const cost = metrics.cost || 0

  return clicks > 0 || prints > 0 || cost > 0
}

function parseAdItem(item, meliUserId, date) {
  const metrics = item.metrics || {}

  return {
    meli_user_id: meliUserId,
    item_id: item.item_id,
    date: date,

    // Click and impression metrics
    clicks: metrics.clicks || 0,
    prints: metrics.prints || 0,
    cost: metrics.cost || 0.00,
    cpc: metrics.cpc || 0.0000,

    // Sales amount metrics
    direct_amount: metrics.direct_amount || 0.00,
    indirect_amount: metrics.indirect_amount || 0.00,
    total_amount: metrics.total_amount || 0.00,

    // Units quantity metrics
    direct_units_quantity: metrics.direct_units_quantity || 0,
    indirect_units_quantity: metrics.indirect_units_quantity || 0,
    units_quantity: metrics.units_quantity || 0,

    // Items quantity metrics
    direct_items_quantity: metrics.direct_items_quantity || 0,
    indirect_items_quantity: metrics.indirect_items_quantity || 0,
    advertising_items_quantity: metrics.advertising_items_quantity || 0,

    // Organic metrics
    organic_units_quantity: metrics.organic_units_quantity || 0,
    organic_items_quantity: metrics.organic_items_quantity || 0,
    organic_units_amount: metrics.organic_units_amount || 0.00,

    // Performance ratios
    acos: metrics.acos || 0.0000,
    sov: metrics.sov || 0.0000,
    ctr: metrics.ctr || 0.000000,
    cvr: metrics.cvr || 0.000000,
    roas: metrics.roas || 0.0000
  }
}

function getDailyDateRanges(days = 7) {
  const ranges = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(today.getDate() - i)
    const dateString = date.toISOString().split('T')[0]

    ranges.push({
      dateFrom: dateString,
      dateTo: dateString
    })
  }

  return ranges
}

async function fetchAdvertisers(accessToken) {
  try {
    const response = await apiRequest(
      'https://api.mercadolibre.com/advertising/advertisers?product_id=PADS',
      accessToken,
    )
    return response.advertisers || []
  } catch (error) {
    console.error(error.message)
    return []
  }
}

async function fetchAllAdvertizers() {
  const supabase = createClient()
  const meliUsers = await getMeliUsers()

  let totalAdvertisers = 0

  for (const user of meliUsers) {
    try {
      const advertisers = await fetchAdvertisers(user.access_token)

      for (const advertiser of advertisers) {
        const advertiserData = parseAdvertiser(advertiser, user.meli_user_id)

        const { error: advertiserError } = await supabase
          .from('ml_advertisers_v2')
          .upsert(advertiserData, { onConflict: ['advertiser_id'] })

        if (advertiserError) {
          console.error(`Error inserting advertiser ${advertiser.advertiser_id}:`, advertiserError.message)
          continue
        }

        totalAdvertisers++
      }
    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error.message)
      continue
    }
  }

  console.log(`Total advertisers processed: ${totalAdvertisers}`)
  console.log(`Users processed: ${meliUsers.length}`)
}

async function fetchAdvertiserItems(advertiserId, accessToken, dateFrom, dateTo) {
  try {
    const metricsFields = 'clicks,prints,ctr,cost,cpc,acos,organic_units_quantity,organic_units_amount,organic_items_quantity,direct_items_quantity,indirect_items_quantity,advertising_items_quantity,cvr,roas,sov,direct_units_quantity,indirect_units_quantity,units_quantity,direct_amount,indirect_amount,total_amount'
    const baseUrl = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/items?date_from=${dateFrom}&date_to=${dateTo}&metrics=${metricsFields}&metrics_summary=true`

    return await paginateV2(baseUrl, accessToken)
  } catch (error) {
    console.error(`Error fetching items for advertiser ${advertiserId}:`, error.message)
    return []
  }
}

export async function fetchAllAdvertiserItems(options = {}) {
  const {
    days = 2,
  } = options

  const supabase = createClient()
  const dateRanges = getDailyDateRanges(days)

  console.log(`Fetching advertiser items data for ${days} days (${dateRanges.length} separate API calls)`)

  const meliUsers = await getMeliUsers()

  let totalItems = 0
  const itemsToInsert = []
  let totalProcessed = 0
  let totalSkipped = 0

  for (const user of meliUsers) {
    console.log(`Processing items for user: ${user.meli_user_id}`)

    try {
      // Fetch advertisers for this user
      const { data: advertisers, error } = await supabase
        .from('ml_advertisers_v2')
        .select('meli_user_id, advertiser_id')
        .eq('meli_user_id', user.meli_user_id)

      if (error) throw error

      if (!advertisers || advertisers.length === 0) {
        console.log(`No advertisers found for user ${user.meli_user_id}`)
        continue
      }

      console.log(`Found ${advertisers.length} advertisers for user ${user.meli_user_id}`)

      for (const advertiser of advertisers) {
        console.log(`Fetching items for advertiser: ${advertiser.advertiser_id}`)

        // Process each day separately
        for (const dateRange of dateRanges) {
          console.log(`  Fetching data for ${dateRange.dateFrom}`)

          try {
            // Fetch items for this advertiser for this specific day
            const items = await fetchAdvertiserItems(advertiser.advertiser_id, user.access_token, dateRange.dateFrom, dateRange.dateTo)
            console.log(`  Found ${items.length} items for advertiser ${advertiser.advertiser_id} on ${dateRange.dateFrom}`)

            totalItems += items.length

            // Process items and add to batch (only items with significant metrics)
            for (const item of items) {
              try {
                // Skip items with no significant advertising activity
                if (!hasSignificantMetrics(item.metrics || {})) {
                  totalSkipped++
                  continue
                }

                const adItemData = parseAdItem(item, user.meli_user_id, dateRange.dateFrom)
                itemsToInsert.push(adItemData)
                totalProcessed++

              } catch (error) {
                console.error(`    Error processing item ${item.item_id}:`, error.message)
                continue
              }
            }

            // Process in batches of 50 for database insertion
            if (itemsToInsert.length >= 50) {
              try {
                // Deduplicate items before insertion based on composite key
                const deduplicatedItems = Array.from(
                  new Map(
                    itemsToInsert.map(item => [
                      `${item.meli_user_id}-${item.item_id}-${item.date}`,
                      item
                    ])
                  ).values()
                )

                const { error: insertError } = await supabase
                  .from('ml_ads_v2')
                  .upsert(deduplicatedItems, {
                    onConflict: ['meli_user_id', 'item_id', 'date']
                  })

                if (insertError) {
                  console.error(`    Error batch storing items:`, insertError.message)
                } else {
                  console.log(`    Batch stored ${deduplicatedItems.length} advertising items`)
                }
              } catch (error) {
                console.error(`    Error in batch insert:`, error.message)
              }

              itemsToInsert.length = 0 // Clear the array
            }

            // Rate limiting between days
            await new Promise(resolve => setTimeout(resolve, 200))

          } catch (error) {
            console.error(`  Error fetching items for advertiser ${advertiser.advertiser_id} on ${dateRange.dateFrom}:`, error.message)
            continue
          }
        }
      }

    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error.message)
      continue
    }
  }

  // Insert remaining items if any
  if (itemsToInsert.length > 0) {
    try {
      // Deduplicate items before final insertion based on composite key
      const deduplicatedItems = Array.from(
        new Map(
          itemsToInsert.map(item => [
            `${item.meli_user_id}-${item.item_id}-${item.date}`,
            item
          ])
        ).values()
      )

      const { error: insertError } = await supabase
        .from('ml_ads_v2')
        .upsert(deduplicatedItems, {
          onConflict: ['meli_user_id', 'item_id', 'date']
        })

      if (insertError) {
        console.error(`Error storing final items batch:`, insertError.message)
      } else {
        console.log(`Stored final ${deduplicatedItems.length} advertising items`)
      }
    } catch (error) {
      console.error(`Error in final batch insert:`, error.message)
    }
  }

  console.log(`Summary:`)
  console.log(`Total items fetched: ${totalItems}`)
  console.log(`Items with activity stored: ${totalProcessed}`)
  console.log(`Items with no activity skipped: ${totalSkipped}`)
  console.log(`Date ranges processed: ${dateRanges.length} days`)
  console.log(`Users processed: ${meliUsers.length}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
    fetchAllAdvertiserItems()

    .then(() => {
      console.log('Daily ads sync completed successfully')
      process.exit(0)
    })
    .catch(console.error)
}

