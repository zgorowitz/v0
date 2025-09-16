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
    const metricsFields = 'clicks, prints, ctr, cost, cpc, acos, organic_units_quantity, organic_units_amount, organic_items_quantity, direct_items_quantity, indirect_items_quantity, advertising_items_quantity, cvr, roas, sov, direct_units_quantity, indirect_units_quantity, units_quantity, direct_amount, indirect_amount, total_amount'
    const baseUrl = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/items?date_from=${dateFrom}&date_to=${dateTo}&metrics=${metricsFields}`

    return await paginateV2(baseUrl, accessToken)
  } catch (error) {
    console.error(`Error fetching items for advertiser ${advertiserId}:`, error.message)
    return []
  }
}

export async function fetchAllAdvertiserItems(options = {}) {
  const {
    days = 65,
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
                const { error: insertError } = await supabase
                  .from('ml_ads_v2')
                  .upsert(itemsToInsert, {
                    onConflict: ['meli_user_id', 'item_id', 'date']
                  })

                if (insertError) {
                  console.error(`    Error batch storing items:`, insertError.message)
                } else {
                  console.log(`    Batch stored ${itemsToInsert.length} advertising items`)
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
      const { error: insertError } = await supabase
        .from('ml_ads_v2')
        .upsert(itemsToInsert, {
          onConflict: ['meli_user_id', 'item_id', 'date']
        })

      if (insertError) {
        console.error(`Error storing final items batch:`, insertError.message)
      } else {
        console.log(`Stored final ${itemsToInsert.length} advertising items`)
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


// function getDateRange(days = 7) {
//   const dateTo = new Date()
//   const dateFrom = new Date()
//   dateFrom.setDate(dateFrom.getDate() - days)

//   return {
//     dateFrom: dateFrom.toISOString().split('T')[0],
//     dateTo: dateTo.toISOString().split('T')[0]
//   }
// }

// function parseCampaign(campaign, advertiserId) {
//   return {
//     id: campaign.id,
//     advertiser_id: advertiserId,
//     name: campaign.name || null,
//     status: campaign.status || null,
//     budget: campaign.budget || 0,
//     currency_id: campaign.currency_id || null,
//     strategy: campaign.strategy || null,
//     acos_target: campaign.acos_target || null,
//     channel: campaign.channel || null,
//     type: campaign.type || 'product_ads',
//     date_created: campaign.date_created || null,
//     last_updated: campaign.last_updated || null
//   }
// }

// function parseCampaignMetrics(campaignId, metrics, dateFrom, dateTo) {
//   return {
//     campaign_id: campaignId,
//     date_from: dateFrom,
//     date_to: dateTo,
//     clicks: metrics.clicks || 0,
//     impressions: metrics.prints || 0,
//     ctr: metrics.ctr || 0,
//     cost: metrics.cost || 0,
//     cost_usd: metrics.cost_usd || 0,
//     cpc: metrics.cpc || 0,
//     acos: metrics.acos || 0,
//     organic_units_quantity: metrics.organic_units_quantity || 0,
//     organic_units_amount: metrics.organic_units_amount || 0,
//     organic_items_quantity: metrics.organic_items_quantity || 0,
//     direct_items_quantity: metrics.direct_items_quantity || 0,
//     indirect_items_quantity: metrics.indirect_items_quantity || 0,
//     advertising_items_quantity: metrics.advertising_items_quantity || 0,
//     cvr: metrics.cvr || 0,
//     roas: metrics.roas || 0,
//     sov: metrics.sov || 0,
//     direct_units_quantity: metrics.direct_units_quantity || 0,
//     indirect_units_quantity: metrics.indirect_units_quantity || 0,
//     units_quantity: metrics.units_quantity || 0,
//     direct_amount: metrics.direct_amount || 0,
//     indirect_amount: metrics.indirect_amount || 0,
//     total_amount: metrics.total_amount || 0,
//     impression_share: metrics.impression_share || 0,
//     top_impression_share: metrics.top_impression_share || 0,
//     lost_impression_share_by_budget: metrics.lost_impression_share_by_budget || 0,
//     lost_impression_share_by_ad_rank: metrics.lost_impression_share_by_ad_rank || 0,
//     acos_benchmark: metrics.acos_benchmark || null,
//     fetched_at: new Date().toISOString()
//   }
// }

// function parseAd(ad, campaignId, advertiserId) {
//   return {
//     item_id: ad.item_id || ad.id,
//     campaign_id: campaignId,
//     advertiser_id: advertiserId,
//     status: ad.status || null,
//     price: ad.price || 0,
//     original_price: ad.original_price || 0,
//     cpc: ad.cpc || 0,
//     daily_budget: ad.daily_budget || 0,
//     picture_id: ad.picture_id || null,
//     acos_target: ad.acos_target || null,
//     acos_benchmark: ad.acos_benchmark || null,
//     listing_type_id: ad.listing_type_id || null,
//     category_id: ad.category_id || null,
//     title: ad.title || null,
//     permalink: ad.permalink || null,
//     date_created: ad.date_created || null,
//     last_updated: ad.last_updated || null
//   }
// }

// function parseAdMetrics(itemId, metrics, dateFrom, dateTo) {
//   return {
//     item_id: itemId,
//     date_from: dateFrom,
//     date_to: dateTo,
//     clicks: metrics.clicks || 0,
//     impressions: metrics.prints || 0,
//     ctr: metrics.ctr || 0,
//     cost: metrics.cost || 0,
//     cost_usd: metrics.cost_usd || 0,
//     cpc: metrics.cpc || 0,
//     acos: metrics.acos || 0,
//     cvr: metrics.cvr || 0,
//     roas: metrics.roas || 0,
//     direct_units_quantity: metrics.direct_units_quantity || 0,
//     indirect_units_quantity: metrics.indirect_units_quantity || 0,
//     units_quantity: metrics.units_quantity || 0,
//     direct_amount: metrics.direct_amount || 0,
//     indirect_amount: metrics.indirect_amount || 0,
//     total_amount: metrics.total_amount || 0,
//     fetched_at: new Date().toISOString()
//   }
// }
// async function fetchCampaigns(advertiserId, accessToken, dateFrom, dateTo) {
//   const campaigns = []
//   let offset = 0
//   let hasMore = true
//   const limit = 50
  
//   while (hasMore) {
//     try {
//       const metricsFields = 'clicks,prints,ctr,cost,cost_usd,cpc,acos,organic_units_quantity,organic_units_amount,organic_items_quantity,direct_items_quantity,indirect_items_quantity,advertising_items_quantity,cvr,roas,sov,direct_units_quantity,indirect_units_quantity,units_quantity,direct_amount,indirect_amount,total_amount,impression_share,top_impression_share,lost_impression_share_by_budget,lost_impression_share_by_ad_rank,acos_benchmark'
      
//       const url = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/campaigns?limit=${limit}&offset=${offset}&date_from=${dateFrom}&date_to=${dateTo}` //&metrics=${metricsFields}`
      
//       const response = await apiRequest(url, accessToken)
//       console.log(response)
//       if (response.results && response.results.length > 0) {
//         campaigns.push(...response.results)
//       }
      
//       if (response.paging) {
//         hasMore = (offset + limit) < response.paging.total
//         offset += limit
//       } else {
//         hasMore = false
//       }
      
//       // Rate limiting
//       await new Promise(resolve => setTimeout(resolve, 100))
      
//     } catch (error) {
//       console.error(`Error fetching campaigns for advertiser ${advertiserId}:`, error.message)
//       hasMore = false
//     }
//   }
  
//   return campaigns
// }

// async function fetchCampaignAds(campaignId, advertiserId, accessToken, dateFrom, dateTo) {
//   const ads = []
//   let offset = 0
//   let hasMore = true
//   const limit = 50
  
//   while (hasMore) {
//     try {
//       const url = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/campaigns/${campaignId}/ads?limit=${limit}&offset=${offset}&date_from=${dateFrom}&date_to=${dateTo}`
      
//       const response = await apiRequest(url, accessToken)
      
//       if (response.results && response.results.length > 0) {
//         ads.push(...response.results)
//       }
      
//       if (response.paging) {
//         hasMore = (offset + limit) < response.paging.total
//         offset += limit
//       } else {
//         hasMore = false
//       }
      
//       // Rate limiting
//       await new Promise(resolve => setTimeout(resolve, 100))
      
//     } catch (error) {
//       console.error(`Error fetching ads for campaign ${campaignId}:`, error.message)
//       hasMore = false
//     }
//   }
  
//   return ads
// }

// async function fetchItemAdInfo(itemId, accessToken) {
//   try {
//     const url = `https://api.mercadolibre.com/advertising/product_ads/items/${itemId}`
//     const response = await apiRequest(url, accessToken)
//     return response
//   } catch (error) {
//     console.error(`Error fetching ad info for item ${itemId}:`, error.message)
//     return null
//   }
// }
// export async function fetchAds(options = {}) {
//   const {
//     days = 7,
//     fullSync = false,
//   } = options
  
//   const supabase = createClient()
//   const { dateFrom, dateTo } = getDateRange(days)
  
//   console.log(`Fetching ads data from ${dateFrom} to ${dateTo}`)
  
//   const { data: meliUsers, error } = await supabase
//     .from('meli_tokens')
//     .select('meli_user_id, access_token')
  
//   if (error) throw error
  
//   let totalAdvertisers = 0
//   let totalCampaigns = 0
//   let totalAds = 0
//   let totalMetrics = 0
  
//   for (const user of meliUsers) {
//     console.log(`Processing ads for user: ${user.meli_user_id}`)
    
//     try {
//       // Fetch advertisers
//       const advertisers = await fetchAdvertisers(user.access_token)
//       console.log(`Found ${advertisers.length} advertisers for user ${user.meli_user_id}`)
      
//       for (const advertiser of advertisers) {
//         // Upsert advertiser
//         const advertiserData = parseAdvertiser(advertiser, user.meli_user_id)
//         const { error: advertiserError } = await supabase
//           .from('meli_advertisers')
//           .upsert(advertiserData, { onConflict: ['advertiser_id'] })
        
//         if (advertiserError) {
//           console.error(`Error inserting advertiser:`, advertiserError.message)
//           continue
//         }
//         totalAdvertisers++
        
//         // Fetch campaigns for this advertiser
//         const campaigns = await fetchCampaigns(advertiser.advertiser_id, user.access_token, dateFrom, dateTo)
//         console.log(`Found ${campaigns.length} campaigns for advertiser ${advertiser.advertiser_id}`)
        
//         for (const campaign of campaigns) {
//           // Upsert campaign
//           const campaignData = parseCampaign(campaign, advertiser.advertiser_id)
//           const { error: campaignError } = await supabase
//             .from('meli_campaigns')
//             .upsert(campaignData, { onConflict: ['id'] })
          
//           if (campaignError) {
//             console.error(`Error inserting campaign:`, campaignError.message)
//             continue
//           }
//           totalCampaigns++
          
//           // Upsert campaign metrics
//           if (campaign.metrics) {
//             const metricsData = parseCampaignMetrics(campaign.id, campaign.metrics, dateFrom, dateTo)
//             const { error: metricsError } = await supabase
//               .from('meli_campaign_metrics')
//               .upsert(metricsData, { 
//                 onConflict: ['campaign_id', 'date_from', 'date_to'] 
//               })
            
//             if (metricsError) {
//               console.error(`Error inserting campaign metrics:`, metricsError.message)
//             } else {
//               totalMetrics++
//             }
//           }
          
//           // Fetch ads for this campaign
//           const ads = await fetchCampaignAds(campaign.id, advertiser.advertiser_id, user.access_token, dateFrom, dateTo)
//           console.log(`Found ${ads.length} ads for campaign ${campaign.id}`)
          
//           for (const ad of ads) {
//             // Upsert ad
//             const adData = parseAd(ad, campaign.id, advertiser.advertiser_id)
//             const { error: adError } = await supabase
//               .from('meli_ads')
//               .upsert(adData, { onConflict: ['item_id'] })
            
//             if (adError) {
//               console.error(`Error inserting ad:`, adError.message)
//               continue
//             }
//             totalAds++
            
//             // Fetch detailed metrics for this ad/item
//             if (ad.item_id || ad.id) {
//               const itemId = ad.item_id || ad.id
//               const itemInfo = await fetchItemAdInfo(itemId, user.access_token)
              
//               if (itemInfo && itemInfo.metrics) {
//                 const adMetricsData = parseAdMetrics(itemId, itemInfo.metrics, dateFrom, dateTo)
//                 const { error: adMetricsError } = await supabase
//                   .from('meli_ad_metrics')
//                   .upsert(adMetricsData, { 
//                     onConflict: ['item_id', 'date_from', 'date_to'] 
//                   })
                
//                 if (adMetricsError) {
//                   console.error(`Error inserting ad metrics:`, adMetricsError.message)
//                 }
//               }
//             }
            
//             // Rate limiting
//             await new Promise(resolve => setTimeout(resolve, 100))
//           }
//         }
//       }
            
//     } catch (error) {
//       console.error(`Error processing user ${user.meli_user_id}:`, error.message)
//       continue
//     }
//   }
  
// //   console.log(`Summary:`)
// //   console.log(`Total advertisers processed: ${totalAdvertisers}`)
// //   console.log(`Total campaigns processed: ${totalCampaigns}`)
// //   console.log(`Total ads processed: ${totalAds}`)
// //   console.log(`Total metrics records: ${totalMetrics}`)
// //   console.log(`Date range: ${dateFrom} to ${dateTo}`)
// //   console.log(`Users processed: ${meliUsers.length}`)
// }