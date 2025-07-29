// scripts/meli_attr.mjs
// Minimal version - only the essentials

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Create Supabase client for scripts
function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Utility: Simple API request function
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

// Utility: Parse ML attribute to our schema
function parseAttribute(categoryId, attr) {
  return {
    category_id: categoryId,
    attribute_id: attr.id,
    attribute_name: attr.name,
    is_required: attr.tags?.required || false,
    is_catalog_required: attr.tags?.catalog_required || false,
    is_conditional_required: attr.tags?.conditional_required || false,
    is_variation_attribute: attr.tags?.variation_attribute || false,
    allows_variations: attr.tags?.allow_variations || false,
    is_hidden: attr.tags?.hidden || false,
    is_multivalued: attr.tags?.multivalued || false,
    value_type: attr.value_type,
    hierarchy: attr.hierarchy || null
  }
}

// Main function - EXPORTED for reuse
export async function populateMeliAttributes() {
  const supabase = await createClient()
  const categories = await apiRequest('https://api.mercadolibre.com/sites/MLA/categories')
  
  for (const category of categories) {
    const detailed = await apiRequest(
      `https://api.mercadolibre.com/categories/${category.id}?withAttributes=true`
    )
    
    if (!detailed.attributes?.length) continue
    
    const attributes = detailed.attributes.map(attr => parseAttribute(category.id, attr))
    
    await supabase.from('meli_attributes').upsert(attributes, { 
      onConflict: ['category_id', 'attribute_id'] 
    })
    
    // Rate limiting - be nice to ML API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Individual category function - EXPORTED for targeted updates
export async function updateMeliAttributes(categoryId) {
  const supabase = await createClient()
  
  const detailed = await apiRequest(
    `https://api.mercadolibre.com/categories/${categoryId}?withAttributes=true`
  )
  
  if (!detailed.attributes?.length) return
  
  const attributes = detailed.attributes.map(attr => parseAttribute(categoryId, attr))
  
  await supabase.from('meli_attributes').upsert(attributes, { 
    onConflict: ['category_id', 'attribute_id'] 
  })
}

// ============================================
// STANDALONE RUNNER
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  populateMeliAttributes()
    .then(() => process.exit(0))
    .catch(console.error)
}