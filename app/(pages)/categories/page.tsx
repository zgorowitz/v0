// // app/categories/page.js
// 'use client'

// import { createClient } from '@/lib/supabase/client'
// import { useState, useEffect } from 'react'

// export default function CategoriesPage() {
//   const [categories, setCategories] = useState([])
//   const [selectedMainCategory, setSelectedMainCategory] = useState(null)
//   const [selectedCategory, setSelectedCategory] = useState(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     async function fetchCategories() {
//       const supabase = createClient()
      
//       const { data: allCategories } = await supabase
//         .from('meli_categories')
//         .select('*')
//         .order('name')
      
//       // Group categories by parent
//       const mainCategories = allCategories?.filter(cat => !cat.parent_category_id) || []
//       const categoriesWithChildren = mainCategories.map(parent => ({
//         ...parent,
//         children: allCategories?.filter(cat => cat.parent_category_id === parent.category_id) || []
//       }))
      
//       setCategories(categoriesWithChildren)
//       setLoading(false)
//     }
    
//     fetchCategories()
//   }, [])

//   const selectMainCategory = (category) => {
//     setSelectedMainCategory(category)
//     setSelectedCategory(category) // Also show in main content
//   }

//   const selectSubCategory = (subCategory) => {
//     setSelectedCategory(subCategory)
//   }

//   if (loading) {
//     return (
//       <div className="flex h-screen">
//         <div className="w-72 bg-gray-50 border-r border-gray-200 p-4">
//           <div className="animate-pulse space-y-2">
//             {[...Array(8)].map((_, i) => (
//               <div key={i} className="h-8 bg-gray-200 rounded"></div>
//             ))}
//           </div>
//         </div>
//         <div className="w-72 bg-white border-r border-gray-200 p-4">
//           <div className="animate-pulse space-y-2">
//             {[...Array(5)].map((_, i) => (
//               <div key={i} className="h-6 bg-gray-200 rounded"></div>
//             ))}
//           </div>
//         </div>
//         <div className="flex-1 p-8">
//           <div className="animate-pulse">
//             <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
//             <div className="h-4 bg-gray-200 rounded w-32"></div>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="flex h-screen bg-white">
//       {/* Main Categories Sidebar */}
//       <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto">
//         <div className="p-6 border-b border-gray-200">
//           <h1 className="text-xl font-bold text-black">Categories</h1>
//           <p className="text-sm text-gray-600 mt-1">{categories.length} main categories</p>
//         </div>
        
//         <div className="p-3">
//           {categories.map(category => (
//             <div 
//               key={category.category_id}
//               className={`p-4 rounded-lg cursor-pointer transition-colors mb-1 ${
//                 selectedMainCategory?.category_id === category.category_id 
//                   ? 'bg-black text-white' 
//                   : 'hover:bg-gray-100'
//               }`}
//               onClick={() => selectMainCategory(category)}
//             >
//               <h3 className="text-lg font-bold leading-tight">
//                 {category.name}
//               </h3>
//               <p className={`text-sm mt-1 ${
//                 selectedMainCategory?.category_id === category.category_id 
//                   ? 'text-gray-300' 
//                   : 'text-gray-500'
//               }`}>
//                 {category.total_items.toLocaleString()} items
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Subcategories Sidebar */}
//       <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
//         {selectedMainCategory ? (
//           <>
//             <div className="p-6 border-b border-gray-200">
//               <h2 className="text-lg font-semibold text-black">
//                 {selectedMainCategory.name}
//               </h2>
//               <p className="text-sm text-gray-600 mt-1">
//                 {selectedMainCategory.children.length} subcategories
//               </p>
//             </div>
            
//             <div className="p-3">
//               {selectedMainCategory.children.map(subCategory => (
//                 <div
//                   key={subCategory.category_id}
//                   className={`p-3 rounded cursor-pointer transition-colors mb-1 ${
//                     selectedCategory?.category_id === subCategory.category_id 
//                       ? 'bg-gray-900 text-white' 
//                       : 'hover:bg-gray-50'
//                   }`}
//                   onClick={() => selectSubCategory(subCategory)}
//                 >
//                   <h4 className="font-medium text-sm leading-tight">
//                     {subCategory.name}
//                   </h4>
//                   <p className={`text-xs mt-1 ${
//                     selectedCategory?.category_id === subCategory.category_id 
//                       ? 'text-gray-300' 
//                       : 'text-gray-500'
//                   }`}>
//                     {subCategory.total_items.toLocaleString()} items
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </>
//         ) : (
//           <div className="flex items-center justify-center h-full">
//             <div className="text-center px-4">
//               <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
//                 <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                 </svg>
//               </div>
//               <p className="text-sm text-gray-500">Select a main category to view subcategories</p>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto">
//         {selectedCategory ? (
//           <div className="p-8">
//             <div className="max-w-3xl">
//               <div className="mb-8">
//                 <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
//                   <span>{selectedCategory.parent_category_id ? 'Subcategory' : 'Main Category'}</span>
//                   <span>•</span>
//                   <span>ID: {selectedCategory.category_id}</span>
//                 </div>
                
//                 <h1 className="text-4xl font-bold text-black mb-4">
//                   {selectedCategory.name}
//                 </h1>
                
//                 <div className="flex items-center gap-8 text-gray-600">
//                   <div className="flex items-center gap-2">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//                     </svg>
//                     <span className="font-medium">{selectedCategory.total_items.toLocaleString()}</span>
//                     <span>total items</span>
//                   </div>
//                 </div>
//               </div>

//               <div className="border border-gray-200 rounded-lg p-6">
//                 <h2 className="text-xl font-semibold text-black mb-6">Category Information</h2>
                
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <h3 className="text-sm font-medium text-gray-500 mb-2">Category Type</h3>
//                       <p className="text-lg text-black">
//                         {selectedCategory.parent_category_id ? 'Subcategory' : 'Main Category'}
//                       </p>
//                     </div>
                    
//                     <div>
//                       <h3 className="text-sm font-medium text-gray-500 mb-2">Total Items</h3>
//                       <p className="text-lg font-semibold text-black">
//                         {selectedCategory.total_items.toLocaleString()}
//                       </p>
//                     </div>
//                   </div>
                  
//                   <div>
//                     <h3 className="text-sm font-medium text-gray-500 mb-2">Category ID</h3>
//                     <div className="p-3 bg-gray-50 rounded border font-mono text-sm text-gray-700">
//                       {selectedCategory.category_id}
//                     </div>
//                   </div>

//                   {selectedCategory.parent_category_id && (
//                     <div>
//                       <h3 className="text-sm font-medium text-gray-500 mb-2">Parent Category</h3>
//                       <p className="text-lg text-black">{selectedMainCategory?.name}</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="flex items-center justify-center h-full">
//             <div className="text-center">
//               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//                 </svg>
//               </div>
//               <h2 className="text-xl font-semibold text-black mb-2">Select a Category</h2>
//               <p className="text-gray-500">Choose a category to view detailed information</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
// app/categories/page.js
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { LoadingSpinner } from '@/components/ui/loading-spinner'


export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [selectedMainCategory, setSelectedMainCategory] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryAttributes, setCategoryAttributes] = useState([])
  const [loading, setLoading] = useState(true)
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(false)
  const [subSidebarCollapsed, setSubSidebarCollapsed] = useState(true) // Start collapsed

  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient()
      
      const { data: allCategories } = await supabase
        .from('meli_categories')
        .select('*')
        .order('name')
      
      // Group categories by parent
      const mainCategories = allCategories?.filter(cat => !cat.parent_category_id) || []
      const categoriesWithChildren = mainCategories.map(parent => ({
        ...parent,
        children: allCategories?.filter(cat => cat.parent_category_id === parent.category_id) || []
      }))
      
      setCategories(categoriesWithChildren)
      setLoading(false)
    }
    
    fetchCategories()
  }, [])

  // Fetch attributes when category changes
  useEffect(() => {
    async function fetchCategoryAttributes() {
      if (!selectedCategory) {
        setCategoryAttributes([])
        return
      }

      setAttributesLoading(true)
      const supabase = createClient()
      
      const { data: attributes } = await supabase
        .from('meli_attributes')
        .select('*')
        .eq('category_id', selectedCategory.category_id)
        .order('is_required', { ascending: false })
        .order('is_variation_attribute', { ascending: false })
        .order('allows_variations', { ascending: false })
        .order('is_hidden', { ascending: true })
        .limit(20)
      
      setCategoryAttributes(attributes || [])
      setAttributesLoading(false)
    }
    
    fetchCategoryAttributes()
  }, [selectedCategory])

  const selectMainCategory = (category) => {
    setSelectedMainCategory(category)
    setSelectedCategory(category) // Also show in main content
    setSubSidebarCollapsed(false) // Expand sub sidebar when main category is selected
  }

  const selectSubCategory = (subCategory) => {
    setSelectedCategory(subCategory)
    setMainSidebarCollapsed(true) // Automatically collapse main sidebar when sub category is selected
  }

  const toggleMainSidebar = () => {
    setMainSidebarCollapsed(!mainSidebarCollapsed)
    if (mainSidebarCollapsed) {
      setSubSidebarCollapsed(true) // Collapse sub sidebar when main expands
    }
  }

  const toggleSubSidebar = () => {
    setSubSidebarCollapsed(!subSidebarCollapsed)
    if (subSidebarCollapsed) {
      setMainSidebarCollapsed(true) // Collapse main sidebar when sub expands
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-72 bg-gray-50 border-r border-gray-200 p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="w-72 bg-white border-r border-gray-200 p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LayoutWrapper>
    <div className="flex h-screen bg-white">
      {/* Main Categories Sidebar */}
      <div className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out ${
        mainSidebarCollapsed ? 'w-16' : 'w-72'
      }`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!mainSidebarCollapsed && (
              <>
                <h1 className="text-xl font-bold text-black">Categories</h1>
                <button
                  onClick={toggleMainSidebar}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </>
            )}
            {mainSidebarCollapsed && (
              <button
                onClick={toggleMainSidebar}
                className="p-1 hover:bg-gray-200 rounded transition-colors mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
          {!mainSidebarCollapsed && (
            <p className="text-sm text-gray-600 mt-1">{categories.length} main categories</p>
          )}
        </div>
        
        {!mainSidebarCollapsed && (
          <div className="p-2">
            {categories.map(category => (
              <div 
                key={category.category_id}
                className={`p-2 rounded cursor-pointer transition-colors mb-0.5 ${
                  selectedMainCategory?.category_id === category.category_id 
                    ? 'bg-black text-white' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => selectMainCategory(category)}
              >
                <h3 className="text-sm font-bold leading-tight">
                  {category.name}
                </h3>
                <p className={`text-xs ${
                  selectedMainCategory?.category_id === category.category_id 
                    ? 'text-gray-300' 
                    : 'text-gray-500'
                }`}>
                  {category.total_items.toLocaleString()} items
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subcategories Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
        subSidebarCollapsed ? 'w-16' : 'w-72'
      }`}>
        {selectedMainCategory ? (
          <>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {!subSidebarCollapsed && (
                  <>
                    <h2 className="text-lg font-semibold text-black">
                      {selectedMainCategory.name}
                    </h2>
                    <button
                      onClick={toggleSubSidebar}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                  </>
                )}
                {subSidebarCollapsed && (
                  <button
                    onClick={toggleSubSidebar}
                    className="p-1 hover:bg-gray-200 rounded transition-colors mx-auto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
              {!subSidebarCollapsed && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedMainCategory.children.length} subcategories
                </p>
              )}
            </div>
            
            {!subSidebarCollapsed && (
              <div className="p-2">
                {selectedMainCategory.children.map(subCategory => (
                  <div
                    key={subCategory.category_id}
                    className={`p-2 rounded cursor-pointer transition-colors mb-0.5 ${
                      selectedCategory?.category_id === subCategory.category_id 
                        ? 'bg-gray-900 text-white' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectSubCategory(subCategory)}
                  >
                    <h4 className="font-medium text-xs leading-tight">
                      {subCategory.name}
                    </h4>
                    <p className={`text-xs ${
                      selectedCategory?.category_id === subCategory.category_id 
                        ? 'text-gray-300' 
                        : 'text-gray-500'
                    }`}>
                      {subCategory.total_items.toLocaleString()} items
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            {/* <div className="text-center px-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div> */}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedCategory ? (
          <div className="p-8">
            <div className="max-w-3xl">
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span>{selectedCategory.parent_category_id ? 'Subcategory' : 'Main Category'}</span>
                  <span>•</span>
                  <span>ID: {selectedCategory.category_id}</span>
                </div>
                
                <h1 className="text-4xl font-bold text-black mb-4">
                  {selectedCategory.name}
                </h1>
                
                <div className="flex items-center gap-8 text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="font-medium">{selectedCategory.total_items.toLocaleString()}</span>
                    <span>total items</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-black mb-6">Category Information</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Category Type</h3>
                      <p className="text-lg text-black">
                        {selectedCategory.parent_category_id ? 'Subcategory' : 'Main Category'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Total Items</h3>
                      <p className="text-lg font-semibold text-black">
                        {selectedCategory.total_items.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Category ID</h3>
                    <div className="p-3 bg-gray-50 rounded border font-mono text-sm text-gray-700">
                      {selectedCategory.category_id}
                    </div>
                  </div>

                  {selectedCategory.parent_category_id && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Parent Category</h3>
                      <p className="text-lg text-black">{selectedMainCategory?.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Attributes */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black">Category Attributes</h2>
                  {attributesLoading && (
                    <LoadingSpinner size="sm" message="" className="!gap-0" />
                  )}
                </div>
                
                {attributesLoading ? (
                  <LoadingSpinner size="sm" message="Cargando atributos..." />
                ) : categoryAttributes.length > 0 ? (
                  <div className="space-y-6">
                    {/* Required Attributes */}
                    {categoryAttributes.some(attr => attr.is_required || attr.is_catalog_required) && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-3">Required Attributes</h3>
                        <div className="border border-gray-200 rounded p-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {categoryAttributes
                              .filter(attr => attr.is_required || attr.is_catalog_required)
                              .slice(0, 8)
                              .map(attr => (
                                <div key={attr.attribute_id} className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-black">{attr.attribute_name}</span>
                                  <span className="text-xs text-gray-500">{attr.value_type}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Variation Attributes */}
                    {categoryAttributes.some(attr => (attr.is_variation_attribute || attr.allows_variations) && !attr.is_required && !attr.is_catalog_required) && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-3">Variation Attributes</h3>
                        <div className="border border-gray-200 rounded p-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {categoryAttributes
                              .filter(attr => (attr.is_variation_attribute || attr.allows_variations) && !attr.is_required && !attr.is_catalog_required)
                              .slice(0, 8)
                              .map(attr => (
                                <div key={attr.attribute_id} className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-black">{attr.attribute_name}</span>
                                  <span className="text-xs text-gray-500">{attr.value_type}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Optional Attributes */}
                    {categoryAttributes.some(attr => !attr.is_required && !attr.is_catalog_required && !attr.is_variation_attribute && !attr.allows_variations && !attr.is_hidden) && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-3">Optional Attributes</h3>
                        <div className="border border-gray-200 rounded p-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {categoryAttributes
                              .filter(attr => !attr.is_required && !attr.is_catalog_required && !attr.is_variation_attribute && !attr.allows_variations && !attr.is_hidden)
                              .slice(0, 8)
                              .map(attr => (
                                <div key={attr.attribute_id} className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-black">{attr.attribute_name}</span>
                                  <span className="text-xs text-gray-500">{attr.value_type}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Showing {categoryAttributes.length} attributes • 
                        <span className="ml-2">
                          {categoryAttributes.filter(a => a.is_required || a.is_catalog_required).length} required • 
                          {categoryAttributes.filter(a => a.is_variation_attribute || a.allows_variations).length} variation
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No attributes found for this category</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-black mb-2">Select a Category</h2>
              <p className="text-gray-500">Choose a category to view detailed information</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </LayoutWrapper>
  )
}