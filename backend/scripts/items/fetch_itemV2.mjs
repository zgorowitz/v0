import { createClient, getMeliUsers } from '../../lib/supabase/script-client.js'
import { apiRequest, paginate } from '../../lib/scripts/utils.js'

function parseItem(item, meliUserId) {
  return {
    item_id: item.id,
    user_product_id: item.user_product_id,
    site_id: item.site_id,
    title: item.title,
    subtitle: item.subtitle,
    seller_id: item.seller_id,
    category_id: item.category_id,
    official_store_id: item.official_store_id,
    price: item.price,
    base_price: item.base_price,
    original_price: item.original_price,
    inventory_id: item.inventory_id,
    currency_id: item.currency_id,
    initial_quantity: item.initial_quantity,
    available_quantity: item.available_quantity,
    sold_quantity: item.sold_quantity,
    sale_terms: item.sale_terms,
    buying_mode: item.buying_mode,
    listing_type_id: item.listing_type_id,
    start_time: item.start_time,
    stop_time: item.stop_time,
    end_time: item.end_time,
    expiration_time: item.expiration_time,
    condition: item.condition,
    permalink: item.permalink,
    thumbnail_id: item.thumbnail_id,
    thumbnail: item.thumbnail,
    secure_thumbnail: item.secure_thumbnail,
    pictures: item.pictures,
    video_id: item.video_id,
    descriptions: item.descriptions,
    accepts_mercadopago: item.accepts_mercadopago,
    non_mercado_pago_payment_methods: item.non_mercado_pago_payment_methods,
    shipping: item.shipping,
    international_delivery_mode: item.international_delivery_mode,
    seller_address: item.seller_address,
    seller_contact: item.seller_contact,
    location: item.location,
    geolocation: item.geolocation,
    coverage_areas: item.coverage_areas,
    attributes: item.attributes,
    warnings: item.warnings,
    listing_source: item.listing_source,
    variations: item.variations,
    status: item.status,
    sub_status: item.sub_status,
    tags: item.tags,
    warranty: item.warranty,
    catalog_product_id: item.catalog_product_id,
    domain_id: item.domain_id,
    seller_custom_field: item.seller_custom_field,
    parent_item_id: item.parent_item_id,
    differential_pricing: item.differential_pricing,
    deal_ids: item.deal_ids,
    automatic_relist: item.automatic_relist,
    date_created: item.date_created,
    last_updated: item.last_updated,
    health: item.health,
    catalog_listing: item.catalog_listing,
    item_relations: item.item_relations,
    channels: item.channels,
    family_name: item.family_name,
    meli_user_id: meliUserId
  }
}

async function fetchItems() {
  const supabase = createClient()
  const tokens = await getMeliUsers()
  for (const { meli_user_id, access_token } of tokens) {
    const itemIds = await paginate(`https://api.mercadolibre.com/users/${meli_user_id}/items/search`, access_token)
    console.log(`Fetching items for user ${meli_user_id}, total items: ${itemIds.length}`)
    const itemsToInsert = []
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i]      
        const item = await apiRequest(`https://api.mercadolibre.com/items/${itemId}?include_attributes=all`, access_token)
        if (item?.id) {
          itemsToInsert.push(parseItem(item, meli_user_id))
        }
        
        // Process in batches of 50 for database insertion
      if (itemsToInsert.length >= 50 || i === itemIds.length - 1) {
        await supabase.from('ml_items_v2').upsert(itemsToInsert)
        itemsToInsert.length = 0
      }
        // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 20))
    }
    
    // Insert remaining items
    if (itemsToInsert.length > 0) {
      await supabase.from('ml_items_v2').upsert(itemsToInsert)
      console.log(`Inserted final ${itemsToInsert.length} items for user ${meli_user_id}`)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchItems().catch(console.error)
}