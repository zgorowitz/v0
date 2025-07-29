'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutWrapper } from '@/components/layout-wrapper'

export default function ProductsPage() {
  const [items, setItems] = useState([])
  const [expandedItems, setExpandedItems] = useState(new Set())
  const [loading, setLoading] = useState(true)

  // Fetch items and variations
  useEffect(() => {
    async function fetchItems() {
      const supabase = createClient()
      
      const { data: itemsData, error } = await supabase
        .from('meli_items')
        .select(`
          *,
          meli_variations (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching items:', error)
        return
      }

      setItems(itemsData || [])
      setLoading(false)
    }

    fetchItems()
  }, [])

  // Toggle item expansion
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading products...</div>
      </div>
    )
  }

  return (
    <LayoutWrapper>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Products</h1>
        
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border">
              {/* Main Item */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpanded(item.id)}
              >
                <div className="flex items-center space-x-4">
                  {/* Thumbnail */}
                  {item.thumbnail && (
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  
                  {/* Item Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.title}
                    </h3>
                    <div className="mt-1 text-sm text-gray-500 space-x-4">
                      <span>ID: {item.id}</span>
                      <span>Category: {item.category_id}</span>
                      <span>Status: {item.status}</span>
                    </div>
                  </div>
                  
                  {/* Price & Stock */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {formatPrice(item.price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {item.available_quantity}
                    </div>
                  </div>
                  
                  {/* Expand Icon */}
                  <div className="text-gray-400">
                    {item.meli_variations?.length > 0 && (
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${
                          expandedItems.has(item.id) ? 'rotate-180' : ''
                        }`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Variations */}
              {expandedItems.has(item.id) && item.meli_variations?.length > 0 && (
                <div className="border-t bg-gray-50">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Variations ({item.meli_variations.length})
                    </h4>
                    
                    <div className="grid gap-3">
                      {item.meli_variations.map((variation) => (
                        <div 
                          key={variation.variation_id} 
                          className="bg-white p-4 rounded border"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Variation Image */}
                            {variation.picture_url && (
                              <img 
                                src={variation.picture_url} 
                                alt="Variation"
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            
                            {/* Variation Info */}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                ID: {variation.variation_id}
                              </div>
                              
                              {/* Attributes */}
                              {variation.attributes && Object.keys(variation.attributes).length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {Object.entries(variation.attributes).map(([key, value]) => (
                                    <span key={key} className="inline-block mr-3">
                                      {key}: {typeof value === 'object' ? value.value_name || value.name : value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Variation Price & Stock */}
                            <div className="text-right text-sm">
                              {variation.price && (
                                <div className="font-medium">
                                  {formatPrice(variation.price)}
                                </div>
                              )}
                              <div className="text-gray-500">
                                Stock: {variation.available_quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No products found</div>
          </div>
        )}
      </div>
    </div>
    </LayoutWrapper>
  )
}