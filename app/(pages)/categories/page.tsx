// app/categories/page.js
import { createClient } from '@/lib/supabase/server'

export default async function CategoriesPage() {
  const supabase = await createClient()
  
  // Get main categories with their children
  const { data: mainCategories } = await supabase
    .from('meli_categories')
    .select('*')
    .is('parent_category_id', null)
    .order('name')
  
  const { data: allCategories } = await supabase
    .from('meli_categories')
    .select('*')
    .order('name')
  
  // Group children by parent
  const categoriesWithChildren = mainCategories?.map(parent => ({
    ...parent,
    children: allCategories?.filter(cat => cat.parent_category_id === parent.category_id) || []
  }))

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">MercadoLibre Categories</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoriesWithChildren?.map(category => (
          <div key={category.category_id} className="border rounded-lg p-4">
            <div className="mb-3">
              <h2 className="font-semibold text-lg">{category.name}</h2>
              <p className="text-sm text-gray-600">
                {category.total_items.toLocaleString()} items
              </p>
              <p className="text-xs text-gray-500">{category.category_id}</p>
            </div>
            
            {category.children.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Subcategories ({category.children.length})
                </h3>
                <div className="space-y-1">
                  {category.children.slice(0, 5).map(child => (
                    <div key={child.category_id} className="text-sm">
                      <span className="text-gray-800">{child.name}</span>
                      <span className="text-gray-500 ml-2">
                        ({child.total_items.toLocaleString()})
                      </span>
                    </div>
                  ))}
                  {category.children.length > 5 && (
                    <p className="text-xs text-gray-500">
                      + {category.children.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Summary</h3>
        <p className="text-sm text-gray-600">
          Total: {mainCategories?.length} main categories, {' '}
          {allCategories?.filter(c => c.parent_category_id).length} subcategories
        </p>
      </div>
    </div>
  )
}