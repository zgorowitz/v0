"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function InventoryPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [expandedItems, setExpandedItems] = useState(new Set())

  // Cache for inventory data
  const cachedInventory = useRef(null)
  const cachedAt = useRef(null)

  const fetchInventory = async () => {
    setLoading(true)
    if (cachedInventory.current && Date.now() - cachedAt.current < 10 * 60 * 60 * 1000) { // 1 hour cache
      setData(cachedInventory.current)
      setLoading(false)
      return
    }
    try {
      const response = await fetch('/api/inventory')
      const result = await response.json()
      console.log(result)
      setData(result.data || [])
      setMeta(result.meta)
      cachedInventory.current = result.data || []
      cachedAt.current = Date.now()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Toggle expand/collapse for an item
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('es-AR')
    } catch {
      return '-'
    }
  }

  // Get error type for styling
  const getErrorType = (errorMessage) => {
    if (errorMessage.includes('AUTHENTICATION_REQUIRED')) return 'auth'
    if (errorMessage.includes('API_ERROR')) return 'api'
    return 'general'
  }

  // Render error state
  const renderError = () => {
    const errorType = getErrorType(error)
    
    return (
      <div className={`border rounded-lg p-8 text-center ${
        errorType === 'auth' ? 'bg-amber-50 border-amber-200' : 
        errorType === 'api' ? 'bg-red-50 border-red-200' : 
        'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-xl font-semibold mb-3 ${
          errorType === 'auth' ? 'text-amber-800' : 
          errorType === 'api' ? 'text-red-800' : 
          'text-gray-800'
        }`}>
          {errorType === 'auth' ? '🔐 Autenticación requerida' :
           errorType === 'api' ? '❌ Error de API' :
           '⚠️ Error'}
        </h3>
        
        <p className={`mb-6 text-sm ${
          errorType === 'auth' ? 'text-amber-700' : 
          errorType === 'api' ? 'text-red-700' : 
          'text-gray-700'
        }`}>
          {error}
        </p>
        
        <div className="flex gap-3 justify-center">
          {errorType === 'auth' ? (
            <Button 
              onClick={() => window.location.href = '/settings'}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6"
            >
              Ir a Configuración para Conectar
            </Button>
          ) : (
            <Button 
              onClick={fetchInventory}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6"
            >
              Intentar de nuevo
            </Button>
          )}
        </div>
        
        {/* Debug info */}
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">Información de depuración</summary>
          <pre className="mt-3 text-xs bg-white border rounded-md p-3 overflow-x-auto text-gray-600">
            {JSON.stringify({ error, timestamp: new Date().toISOString() }, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  // Calculate totals for summary
  const calculateTotals = () => {
    return data.reduce((acc, item) => {
      acc.totalItems += 1
      acc.totalQty7d += item.totals?.qty7d || 0
      acc.totalQty30d += item.totals?.qty30d || 0
      acc.totalAvailable += item.totals?.availableQty || 0
      return acc
    }, { totalItems: 0, totalQty7d: 0, totalQty30d: 0, totalAvailable: 0 })
  }

  // Render inventory table
  const renderInventoryTable = () => {
    const totals = calculateTotals()

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  ID de artículo / SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Cantidad 7d
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Prom/Día 7d
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Cantidad 30d
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Prom/Día 30d
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Disponible
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Días en stock
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.map((item, index) => {
                const isExpanded = expandedItems.has(item.itemId)
                const hasChildren = item.children && Array.isArray(item.children) && item.children.length > 0
                
                return (
                  <React.Fragment key={item.itemId}>
                    {/* Parent Row */}
                    <tr 
                      className={`
                        hover:bg-gray-50 transition-colors duration-150
                        ${hasChildren ? 'cursor-pointer' : ''}
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                      `}
                      onClick={() => hasChildren && toggleExpanded(item.itemId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {hasChildren && (
                            <div className="w-4 h-4 flex items-center justify-center text-gray-500">
                              <svg 
                                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {!hasChildren && <div className="w-4"></div>}
                          <div className="font-mono text-sm font-semibold text-gray-900">
                            {item.itemId || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 truncate" title={item.title || ''}>
                            {item.title || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-900">
                          {(item.totals?.qty7d || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600">
                          {(item.totals?.avgPerDay7d || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-900">
                          {(item.totals?.qty30d || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600">
                          {(item.totals?.avgPerDay30d || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-emerald-600">
                          {(item.totals?.availableQty || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${
                          !item.totals?.daysInStock ? 'text-gray-400' :
                          item.totals?.daysInStock < 7 ? 'text-red-600' :
                          item.totals?.daysInStock < 30 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {item.totals?.daysInStock || '-'}
                        </span>
                      </td>
                    </tr>

                    {/* Child Rows */}
                    {isExpanded && hasChildren && item.children.map((child, childIndex) => (
                      <tr key={`${item.itemId}-${child.variationId || childIndex}`} className="bg-gray-50">
                        <td className="px-4 py-2 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">
                              {childIndex === item.children.length - 1 ? '└─' : '├─'}
                            </span>
                            <div className="font-mono text-sm text-gray-600">
                              {child.seller_sku || child.variationId || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-600">
                            Variación {child.variationId || 'Desconocido'}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-sm text-gray-700">
                            {(child.qty7d || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-sm text-gray-600">
                            {(child.avgPerDay7d || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-sm text-gray-700">
                            {(child.qty30d || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-sm text-gray-600">
                            {(child.avgPerDay30d || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-sm text-emerald-600 font-medium">
                            {child.availableQty !== undefined ? child.availableQty.toLocaleString() : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-sm font-medium ${
                            !child.daysInStock ? 'text-gray-400' :
                            child.daysInStock < 7 ? 'text-red-600' :
                            child.daysInStock < 30 ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {child.daysInStock || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
            
            {/* Summary Row */}
            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  RESUMEN
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {totals.totalItems} artículos
                </td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900">
                  {totals.totalQty7d.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {(totals.totalQty7d / 7).toFixed(1)}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900">
                  {totals.totalQty30d.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {(totals.totalQty30d / 30).toFixed(1)}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                  {totals.totalAvailable.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-full bg-gray-50 min-h-screen">
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-white border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Gestión de inventario</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Monitorea los niveles de stock y el rendimiento de ventas</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setExpandedItems(new Set())}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Colapsar todo
                </Button>
                <Button 
                  onClick={() => setExpandedItems(new Set(data.map(item => item.itemId)))}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Expandir todo
                </Button>
                <Button 
                  onClick={fetchInventory}
                  disabled={loading}
                  className="bg-gray-900 text-white hover:bg-gray-800 px-6"
                >
                  {loading ? 'Cargando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
            
            {/* Meta information */}
            {meta && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{(meta.total_items || 0).toLocaleString()}</span>
                    <span className="text-gray-600">Total de artículos</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{(meta.total_orders || 0).toLocaleString()}</span>
                    <span className="text-gray-600">Total de pedidos</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{meta.days_analyzed || 30}</span>
                    <span className="text-gray-600">Días analizados</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{formatDate(meta.generated_at)}</span>
                    <span className="text-gray-600">Última actualización</span>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-16 bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-700 font-medium">Cargando datos de inventario...</p>
                <p className="text-sm text-gray-500">Esto puede tardar unos momentos</p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="p-6 bg-white">
                {renderError()}
              </div>
            )}

            {/* Success State */}
            {!loading && !error && (
              <>
                {data.length === 0 ? (
                  <div className="text-center py-16 bg-white">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900">No se encontraron datos de inventario</p>
                    <p className="text-sm text-gray-500 mt-2">Intenta revisar tu cuenta de MercadoLibre o actualiza los datos</p>
                  </div>
                ) : (
                  <div className="p-6 bg-white">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Consejo:</strong> Haz clic en los artículos con variaciones (indicados por la flecha) para expandir detalles. 
                        Los colores indican el estado del stock: <span className="text-red-600 font-medium">rojo (bajo)</span>, 
                        <span className="text-amber-600 font-medium"> ámbar (medio)</span>, 
                        <span className="text-emerald-600 font-medium">verde (bueno)</span>.
                      </p>
                    </div>
                    {renderInventoryTable()}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}

// "use client"

// import React, { useState, useEffect, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { LayoutWrapper } from "@/components/layout-wrapper"

// export default function InventoryPage() {
//   const [data, setData] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)
//   const [meta, setMeta] = useState(null)
//   const [expandedItems, setExpandedItems] = useState(new Set())

//   // Cache for inventory data
//   const cachedInventory = useRef(null);
//   const cachedAt = useRef(null);

//   const fetchInventory = async () => {
//     setLoading(true); 
//     if (cachedInventory.current && Date.now() - cachedAt.current < 10 * 60 * 60 * 1000) { // 1 hour cache
//       setData(cachedInventory.current);
//       setLoading(false);
//       return;
//     }
//     try {
//       const response = await fetch('/api/inventory');
//       const result = await response.json();
//       console.log(result)
//       setData(result.data || []);
//       setMeta(result.meta);
//       cachedInventory.current = result.data || [];
//       cachedAt.current = Date.now();
//     } catch (error) {
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Load data on mount
//   // useEffect(() => {
//   //   fetchInventory()
//   // }, [])

//   // Toggle expand/collapse for an item
//   const toggleExpanded = (itemId) => {
//     const newExpanded = new Set(expandedItems)
//     if (newExpanded.has(itemId)) {
//       newExpanded.delete(itemId)
//     } else {
//       newExpanded.add(itemId)
//     }
//     setExpandedItems(newExpanded)
//   }

//   // Format date
//   const formatDate = (dateString) => {
//     if (!dateString) return '-'
//     try {
//       return new Date(dateString).toLocaleDateString('es-AR')
//     } catch {
//       return '-'
//     }
//   }

//   // Get error type for styling
//   const getErrorType = (errorMessage) => {
//     if (errorMessage.includes('AUTHENTICATION_REQUIRED')) return 'auth'
//     if (errorMessage.includes('API_ERROR')) return 'api'
//     return 'general'
//   }

//   // Render error state
//   const renderError = () => {
//     const errorType = getErrorType(error)
    
//     return (
//       <div className={`border rounded p-6 text-center ${
//         errorType === 'auth' ? 'bg-yellow-50 border-yellow-200' : 
//         errorType === 'api' ? 'bg-red-50 border-red-200' : 
//         'bg-gray-50 border-gray-200'
//       }`}>
//         <h3 className={`text-lg font-bold mb-2 ${
//           errorType === 'auth' ? 'text-yellow-800' : 
//           errorType === 'api' ? 'text-red-800' : 
//           'text-gray-800'
//         }`}>
//           {errorType === 'auth' ? '🔐 Authentication Required' :
//            errorType === 'api' ? '❌ API Error' :
//            '⚠️ Error'}
//         </h3>
        
//         <p className={`mb-4 ${
//           errorType === 'auth' ? 'text-yellow-700' : 
//           errorType === 'api' ? 'text-red-700' : 
//           'text-gray-700'
//         }`}>
//           {error}
//         </p>
        
//         <div className="flex gap-2 justify-center">
//           {errorType === 'auth' ? (
//             <Button 
//               onClick={() => window.location.href = '/settings'}
//               className="bg-yellow-600 hover:bg-yellow-700 text-white"
//             >
//               Go to Settings to Connect
//             </Button>
//           ) : (
//             <Button 
//               onClick={fetchInventory}
//               className="bg-black hover:bg-gray-800 text-white"
//             >
//               Try Again
//             </Button>
//           )}
//         </div>
        
//         {/* Debug info */}
//         <details className="mt-4 text-left">
//           <summary className="cursor-pointer text-sm text-gray-600">Debug Information</summary>
//           <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto">
//             {JSON.stringify({ error, timestamp: new Date().toISOString() }, null, 2)}
//           </pre>
//         </details>
//       </div>
//     )
//   }

//   // Render inventory table
//   const renderInventoryTable = () => {
//     return (
//       <div className="overflow-x-auto">
//         <table className="w-full border-collapse border border-gray-300">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="border border-gray-300 p-3 text-left">Item ID / SKU</th>
//               <th className="border border-gray-300 p-3 text-left">Title</th>
//               <th className="border border-gray-300 p-3 text-center">Qty 7d</th>
//               <th className="border border-gray-300 p-3 text-center">Avg/Day 7d</th>
//               <th className="border border-gray-300 p-3 text-center">Qty 30d</th>
//               <th className="border border-gray-300 p-3 text-center">Avg/Day 30d</th>
//               <th className="border border-gray-300 p-3 text-center">Available Qty</th>
//               <th className="border border-gray-300 p-3 text-center">Days in Stock</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data.map((item) => {
//               const isExpanded = expandedItems.has(item.itemId)
//               const hasChildren = item.children && Array.isArray(item.children) && item.children.length > 0
              
//               return (
//                 <React.Fragment key={item.itemId}>
//                   {/* Parent Row */}
//                   <tr 
//                     className={`hover:bg-gray-50 ${hasChildren ? 'cursor-pointer bg-blue-50' : ''}`}
//                     onClick={() => hasChildren && toggleExpanded(item.itemId)}
//                   >
//                     <td className="border border-gray-300 p-3">
//                       <div className="flex items-center gap-2">
//                         {hasChildren && (
//                           <div className="w-4 h-4 flex items-center justify-center text-gray-600 font-bold">
//                             {isExpanded ? '▼' : '▶'}
//                           </div>
//                         )}
//                         {!hasChildren && <div className="w-4"></div>}
//                         <div className="font-mono text-sm font-bold">
//                           {item.itemId || 'N/A'}
//                         </div>
//                       </div>
//                     </td>
//                     <td className="border border-gray-300 p-3 max-w-xs">
//                       <div className="truncate font-semibold" title={item.title || ''}>
//                         {item.title || '-'}
//                       </div>
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center font-bold">
//                       {item.totals?.qty7d || 0}
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center">
//                       {item.totals?.avgPerDay7d || 0}
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center font-bold">
//                       {item.totals?.qty30d || 0}
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center">
//                       {item.totals?.avgPerDay30d || 0}
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center font-bold text-green-600">
//                       {item.totals?.availableQty || 0}
//                     </td>
//                     <td className="border border-gray-300 p-3 text-center">
//                       <span className={`${
//                         !item.totals?.daysInStock ? 'text-gray-500' :
//                         item.totals?.daysInStock < 7 ? 'text-red-600 font-bold' :
//                         item.totals?.daysInStock < 30 ? 'text-yellow-600' :
//                         'text-green-600'
//                       }`}>
//                         {item.totals?.daysInStock || '-'}
//                       </span>
//                     </td>
//                   </tr>

//                   {/* Child Rows */}
//                   {isExpanded && hasChildren && item.children.map((child, index) => (
//                     <tr key={`${item.itemId}-${child.variationId || index}`} className="bg-gray-25 hover:bg-gray-100">
//                       <td className="border border-gray-300 p-3 pl-8">
//                         <div className="flex items-center gap-2">
//                           <span className="text-gray-400">
//                             {index === item.children.length - 1 ? '└──' : '├──'}
//                           </span>
//                           <div className="font-mono text-sm text-gray-600">
//                             {child.seller_sku || child.variationId || 'N/A'}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="border border-gray-300 p-3 pl-8">
//                         <div className="text-sm text-gray-600">
//                           Variation {child.variationId || 'Unknown'}
//                         </div>
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center">
//                         {child.qty7d || 0}
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center">
//                         {child.avgPerDay7d || 0}
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center">
//                         {child.qty30d || 0}
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center">
//                         {child.avgPerDay30d || 0}
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center text-green-600">
//                         {child.availableQty || '-'}
//                       </td>
//                       <td className="border border-gray-300 p-3 text-center">
//                         <span className={`${
//                           !child.daysInStock ? 'text-gray-500' :
//                           child.daysInStock < 7 ? 'text-red-600 font-bold' :
//                           child.daysInStock < 30 ? 'text-yellow-600' :
//                           'text-green-600'
//                         }`}>
//                           {child.daysInStock || '-'}
//                         </span>
//                       </td>
//                     </tr>
//                   ))}
//                 </React.Fragment>
//               )
//             })}
//           </tbody>
//         </table>
//       </div>
//     )
//   }

//   return (
//     <LayoutWrapper>
//       <div className="p-6 max-w-full">
//         <Card>
//           <CardHeader>
//             <div className="flex justify-between items-center">
//               <CardTitle className="text-2xl">Inventory Management</CardTitle>
//               <div className="flex gap-2">
//                 <Button 
//                   onClick={() => setExpandedItems(new Set())}
//                   variant="outline"
//                   size="sm"
//                   disabled={loading}
//                 >
//                   Collapse All
//                 </Button>
//                 <Button 
//                   onClick={() => setExpandedItems(new Set(data.map(item => item.itemId)))}
//                   variant="outline"
//                   size="sm"
//                   disabled={loading}
//                 >
//                   Expand All
//                 </Button>
//                 <Button 
//                   onClick={fetchInventory}
//                   disabled={loading}
//                   className="bg-black text-white hover:bg-gray-800"
//                 >
//                   {loading ? 'Loading...' : 'Refresh'}
//                 </Button>
//               </div>
//             </div>
            
//             {/* Meta information */}
//             {meta && (
//               <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   <div><strong>Items:</strong> {meta.total_items || 0}</div>
//                   <div><strong>Orders:</strong> {meta.total_orders || 0}</div>
//                   <div><strong>Period:</strong> {meta.days_analyzed || 30} days</div>
//                   <div><strong>Updated:</strong> {formatDate(meta.generated_at)}</div>
//                 </div>
//               </div>
//             )}
//           </CardHeader>
          
//           <CardContent>
//             {/* Loading State */}
//             {loading && (
//               <div className="text-center py-12">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
//                 <p className="mt-4 text-gray-600">Loading inventory data...</p>
//                 <p className="text-sm text-gray-500">This may take a few moments</p>
//               </div>
//             )}

//             {/* Error State */}
//             {!loading && error && renderError()}

//             {/* Success State */}
//             {!loading && !error && (
//               <>
//                 {data.length === 0 ? (
//                   <div className="text-center py-12 text-gray-500">
//                     <p className="text-lg">No inventory data found</p>
//                     <p className="text-sm mt-2">Try checking your MercadoLibre account or refreshing the data</p>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="mb-4 text-sm text-gray-600">
//                       <p>💡 Click on parent items to expand/collapse variations. Items with variations are highlighted in blue.</p>
//                     </div>
//                     {renderInventoryTable()}
//                   </>
//                 )}
//               </>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </LayoutWrapper>
//   )
// }
