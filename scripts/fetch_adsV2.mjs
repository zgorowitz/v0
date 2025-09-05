// scripts/fetch_ads.mjs
// Fetch advertising data for all meli users with daily incremental updates

import { createClient } from '../lib/supabase/script-client.js'
import { apiRequest, paginate } from '../lib/scripts/utils.js'




function getDateRange(days = 7) {
  const dateTo = new Date()
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - days)
  
  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0]
  }
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

async function fetchAdvertiserItems(advertiserId, accessToken, dateFrom, dateTo) {
  const items = []
  let offset = 0
  let hasMore = true
  const limit = 50
  
  while (hasMore) {
    try {
      const metricsFields = 'clicks,prints,ctr,cost,cpc,acos,organic_units_quantity,organic_units_amount,organic_items_quantity,direct_items_quantity,indirect_items_quantity,advertising_items_quantity,cvr,roas,sov,direct_units_quantity,indirect_units_quantity,units_quantity,direct_amount,indirect_amount,total_amount'
      
      const url = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/items?limit=${limit}&offset=${offset}&date_from=${dateFrom}&date_to=${dateTo}&metrics=${metricsFields}`
      
      const response = await apiRequest(url, accessToken)
      
      if (response.results && response.results.length > 0) {
        items.push(...response.results)
      }
      
      if (response.paging) {
        hasMore = (offset + limit) < response.paging.total
        offset += limit
      } else {
        hasMore = false
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Error fetching items for advertiser ${advertiserId}:`, error.message)
      hasMore = false
    }
  }
  
  return items
}

export async function fetchAllAdvertiserItems(options = {}) {
  const {
    days = 7,
  } = options
  
  const supabase = createClient()
  const { dateFrom, dateTo } = getDateRange(days)
  
  console.log(`Fetching advertiser items data from ${dateFrom} to ${dateTo}`)
  
  const { data: meliUsers, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, access_token')
  
  if (error) throw error
  
  let totalItems = 0
  
  for (const user of meliUsers) {
    console.log(`Processing items for user: ${user.meli_user_id}`)
    
    try {
      // Fetch advertisers for this user
      const advertisers = await fetchAdvertisers(user.access_token)
      console.log(`Found ${advertisers.length} advertisers for user ${user.meli_user_id}`)
      
      for (const advertiser of advertisers) {
        console.log(`Fetching items for advertiser: ${advertiser.advertiser_id}`)
        
        // Fetch items for this advertiser
        const items = await fetchAdvertiserItems(advertiser.advertiser_id, user.access_token, dateFrom, dateTo)
        console.log(`Found ${items.length} items for advertiser ${advertiser.advertiser_id}`)
        
        totalItems += items.length
        
        // Process items (you can add database storage logic here if needed)
        for (const item of items) {
          console.log(`Item: ${item.item_id}, Metrics:`, item.metrics)
        }
      }
            
    } catch (error) {
      console.error(`Error processing user ${user.meli_user_id}:`, error.message)
      continue
    }
  }
  
  console.log(`Total items processed: ${totalItems}`)
  console.log(`Date range: ${dateFrom} to ${dateTo}`)
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

// function parseAdvertiser(advertiser, meli_user_id) {
//   return {
//     advertiser_id: advertiser.advertiser_id,
//     name: advertiser.advertiser_name || null,
//     account_name: advertiser.account_name || null,
//     site_id: advertiser.site_id || null,
//     meli_user_id: meli_user_id || null,

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