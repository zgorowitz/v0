// scripts/meli_categories.mjs
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function apiRequest(url) {
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer APP_USR-6886489775331379-072900-f12ceb2ab9565e142460f888a2eaed77-45810060',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function populateMeliCategories() {
  const supabase = await createClient()
  
  // Get main categories
  const mainCategories = await apiRequest('https://api.mercadolibre.com/sites/MLA/categories')
  
  // Store main categories
  const mainCategoryData = mainCategories.map(cat => ({
    category_id: cat.id,
    name: cat.name,
    parent_category_id: null,
    total_items: 0
  }))
  
  await supabase.from('meli_categories').upsert(mainCategoryData, {
    onConflict: ['category_id']
  })
  
  // For each main category, get children
  for (const category of mainCategories) {
    const detailed = await apiRequest(
      `https://api.mercadolibre.com/categories/${category.id}`
    )
    
    if (detailed.children_categories?.length) {
      const childrenData = detailed.children_categories.map(child => ({
        category_id: child.id,
        name: child.name,
        parent_category_id: category.id,
        total_items: child.total_items_in_this_category || 0
      }))
      
      await supabase.from('meli_categories').upsert(childrenData, {
        onConflict: ['category_id']
      })
    }
    
    // Update parent total_items
    await supabase
      .from('meli_categories')
      .update({ total_items: detailed.total_items_in_this_category || 0 })
      .eq('category_id', category.id)
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  populateMeliCategories()
    .then(() => process.exit(0))
    .catch(console.error)
}