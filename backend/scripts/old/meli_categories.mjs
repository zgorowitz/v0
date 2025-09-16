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
  const supabase = await createClient()
  const { data: latestToken, error } = await supabase
    .from('meli_tokens')
    .select('access_token')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error

  const accessToken = latestToken.access_token
  const response = await fetch(url, {
    headers: {
      'Authorization':  `Bearer ${accessToken}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function fetchCategoryRecursively(categoryId, parentId, level, supabase, processedCategories = new Set()) {
  // Avoid infinite loops and duplicate processing
  if (processedCategories.has(categoryId)) {
    console.log(`Skipping already processed category: ${categoryId}`)
    return
  }
  
  processedCategories.add(categoryId)
  
  try {
    console.log(`Fetching category details for: ${categoryId} (Level ${level})`)
    const detailed = await apiRequest(`https://api.mercadolibre.com/categories/${categoryId}`)
    
    // Store current category with level information
    const categoryData = {
      category_id: detailed.id,
      name: detailed.name,
      parent_category_id: parentId,
      total_items: detailed.total_items_in_this_category || 0,
      level: level
    }
    
    await supabase.from('meli_categories').upsert([categoryData], {
      onConflict: ['category_id']
    })
    
    const levelNames = ['Root', 'Child', 'Grandchild', 'Great-grandchild', 'Great-great-grandchild']
    const levelDescription = levelNames[level] || `Level ${level}`
    
    console.log(`Stored ${levelDescription}: ${detailed.name} (${detailed.id}) - Items: ${detailed.total_items_in_this_category || 0}`)
    
    // Recursively fetch children if they exist
    if (detailed.children_categories && detailed.children_categories.length > 0) {
      console.log(`Found ${detailed.children_categories.length} children for ${detailed.name}`)
      
      for (const child of detailed.children_categories) {
        await fetchCategoryRecursively(child.id, detailed.id, level + 1, supabase, processedCategories)
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else {
      console.log(`No children found for ${detailed.name} (leaf category at level ${level})`)
    }
    
  } catch (error) {
    console.error(`Error processing category ${categoryId}:`, error.message)
  }
}

export async function populateMeliCategories() {
  const supabase = await createClient()
  
  console.log('Starting MercadoLibre categories population with level tracking...')
  
  try {
    // Get main categories (root level)
    console.log('Fetching main categories...')
    const mainCategories = await apiRequest('https://api.mercadolibre.com/sites/MLA/categories')
    
    console.log(`Found ${mainCategories.length} main categories`)
    
    // Track all processed categories to avoid duplicates
    const processedCategories = new Set()
    
    // Process each main category recursively, starting at level 0
    for (const category of mainCategories) {
      console.log(`\n--- Processing main category: ${category.name} (${category.id}) ---`)
      await fetchCategoryRecursively(category.id, null, 0, supabase, processedCategories)
      
      // Longer delay between main categories to be respectful
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Get final count and level distribution
    const { data: allCategories } = await supabase
      .from('meli_categories')
      .select('level')
    
    const levelCounts = {}
    allCategories.forEach(cat => {
      levelCounts[cat.level] = (levelCounts[cat.level] || 0) + 1
    })
    
    console.log(`\n✅ Successfully populated ${allCategories.length} categories in total`)
    console.log('Categories by level:')
    Object.entries(levelCounts).forEach(([level, count]) => {
      const levelNames = ['Root', 'Child', 'Grandchild', 'Great-grandchild', 'Great-great-grandchild']
      const levelName = levelNames[level] || `Level ${level}`
      console.log(`  ${levelName} (Level ${level}): ${count} categories`)
    })
    
  } catch (error) {
    console.error('Error in populateMeliCategories:', error)
    throw error
  }
}

// Function to query categories by level
export async function getCategoriesByLevel(level) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('meli_categories')
    .select('*')
    .eq('level', level)
    .order('name')
  
  if (error) throw error
  return data
}

// Function to get category hierarchy path
export async function getCategoryPath(categoryId) {
  const supabase = await createClient()
  
  const { data: allCategories } = await supabase
    .from('meli_categories')
    .select('category_id, name, parent_category_id, level')
  
  const categoryMap = new Map(allCategories.map(cat => [cat.category_id, cat]))
  const path = []
  
  let current = categoryMap.get(categoryId)
  while (current) {
    path.unshift(current)
    current = current.parent_category_id ? categoryMap.get(current.parent_category_id) : null
  }
  
  return path
}

if (import.meta.url === `file://${process.argv[1]}`) {
  populateMeliCategories()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

// // scripts/meli_categories.mjs
// import { createClient as createSupabaseClient } from '@supabase/supabase-js'
// import dotenv from 'dotenv'

// dotenv.config()

// function createClient() {
//   return createSupabaseClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY
//   )
// }

// async function apiRequest(url) {
//   const response = await fetch(url, {
//     headers: {
//       'Authorization': 'Bearer APP_USR-6886489775331379-072900-f12ceb2ab9565e142460f888a2eaed77-45810060',
//       'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
//     }
//   })
//   if (!response.ok) {
//     throw new Error(`API request failed: ${response.status} ${response.statusText}`)
//   }
//   return response.json()
// }

// export async function populateMeliCategories() {
//   const supabase = await createClient()
  
//   // Get main categories
//   const mainCategories = await apiRequest('https://api.mercadolibre.com/sites/MLA/categories')
  
//   // Store main categories
//   const mainCategoryData = mainCategories.map(cat => ({
//     category_id: cat.id,
//     name: cat.name,
//     parent_category_id: null,
//     total_items: 0
//   }))
  
//   await supabase.from('meli_categories').upsert(mainCategoryData, {
//     onConflict: ['category_id']
//   })
  
//   // For each main category, get children
//   for (const category of mainCategories) {
//     const detailed = await apiRequest(
//       `https://api.mercadolibre.com/categories/${category.id}`
//     )
    
//     if (detailed.children_categories?.length) {
//       const childrenData = detailed.children_categories.map(child => ({
//         category_id: child.id,
//         name: child.name,
//         parent_category_id: category.id,
//         total_items: child.total_items_in_this_category || 0
//       }))
      
//       await supabase.from('meli_categories').upsert(childrenData, {
//         onConflict: ['category_id']
//       })
//     }
    
//     // Update parent total_items
//     await supabase
//       .from('meli_categories')
//       .update({ total_items: detailed.total_items_in_this_category || 0 })
//       .eq('category_id', category.id)
    
//     await new Promise(resolve => setTimeout(resolve, 100))
//   }
// }

// if (import.meta.url === `file://${process.argv[1]}`) {
//   populateMeliCategories()
//     .then(() => process.exit(0))
//     .catch(console.error)
// }