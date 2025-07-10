"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function OrdersPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)

  // At the top of your file
let cachedOrders = null;
let cachedAt = null;

const fetchOrders = async () => {
  if (cachedOrders && Date.now() - cachedAt < 1 * 60 * 60 * 1000) { // 5 min cache
    setData(cachedOrders);
    setLoading(false);
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/orders');
    const result = await response.json();
    setData(result.data || []);
    cachedOrders = result.data || [];
    cachedAt = Date.now();
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
  // Fetch orders data
  // const fetchOrders = async () => {
  //   setLoading(true)
  //   setError(null)
    
  //   try {
  //     console.log('Fetching orders data...')
      
  //     const response = await fetch('/api/orders')
      
  //     console.log('Response status:', response.status)
      
  //     if (!response.ok) {
  //       const errorData = await response.json()
  //       console.error('API Error:', errorData)
        
  //       // Handle specific error types
  //       if (errorData.needs_auth) {
  //         throw new Error(`AUTHENTICATION_REQUIRED: ${errorData.message}`)
  //       }
        
  //       throw new Error(`API_ERROR: ${errorData.message || 'Unknown error'}`)
  //     }
      
  //     const result = await response.json()
  //     console.log('Data received:', result)
      
  //     if (!result.success) {
  //       throw new Error(`DATA_ERROR: Invalid response format`)
  //     }
      
  //     setData(result.data || [])
  //     setMeta(result.meta)
      
  //   } catch (error) {
  //     console.error('Error fetching orders:', error)
  //     setError(error.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // Load data on mount
  // useEffect(() => {
  //   fetchOrders()
  // }, [])

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
      <div className={`border rounded p-6 text-center ${
        errorType === 'auth' ? 'bg-yellow-50 border-yellow-200' : 
        errorType === 'api' ? 'bg-red-50 border-red-200' : 
        'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-lg font-bold mb-2 ${
          errorType === 'auth' ? 'text-yellow-800' : 
          errorType === 'api' ? 'text-red-800' : 
          'text-gray-800'
        }`}>
          {errorType === 'auth' ? '🔐 Authentication Required' :
           errorType === 'api' ? '❌ API Error' :
           '⚠️ Error'}
        </h3>
        
        <p className={`mb-4 ${
          errorType === 'auth' ? 'text-yellow-700' : 
          errorType === 'api' ? 'text-red-700' : 
          'text-gray-700'
        }`}>
          {error}
        </p>
        
        <div className="flex gap-2 justify-center">
          {errorType === 'auth' ? (
            <Button 
              onClick={() => window.location.href = '/settings'}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Go to Settings to Connect
            </Button>
          ) : (
            <Button 
              onClick={fetchOrders}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Try Again
            </Button>
          )}
        </div>
        
        {/* Debug info */}
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-600">Debug Information</summary>
          <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto">
            {JSON.stringify({ error, timestamp: new Date().toISOString() }, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-full">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Orders & Inventory (Last 30 Days)</CardTitle>
              <Button 
                onClick={fetchOrders}
                disabled={loading}
                className="bg-black text-white hover:bg-gray-800"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            
            {/* Meta information */}
            {meta && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><strong>Items:</strong> {meta.total_items}</div>
                  <div><strong>Orders:</strong> {meta.total_orders}</div>
                  <div><strong>Period:</strong> {meta.days_analyzed} days</div>
                  <div><strong>Updated:</strong> {formatDate(meta.generated_at)}</div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading orders data...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && renderError()}

            {/* Success State */}
            {!loading && !error && (
              <>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No orders found for the last 30 days</p>
                    <p className="text-sm mt-2">Try checking your MercadoLibre account or extending the date range</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-left">Item ID</th>
                          <th className="border border-gray-300 p-3 text-left">Title</th>
                          <th className="border border-gray-300 p-3 text-left">SKU</th>
                          <th className="border border-gray-300 p-3 text-center">Total Sales</th>
                          <th className="border border-gray-300 p-3 text-center">Orders/Day</th>
                          <th className="border border-gray-300 p-3 text-center">Last Sale</th>
                          <th className="border border-gray-300 p-3 text-center">Days Since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={`${item.item_id}_${item.variation_id || 'no_var'}`} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-3 font-mono text-sm">
                              {item.item_id}
                              {item.variation_id && (
                                <div className="text-xs text-gray-500">
                                  Var: {item.variation_id}
                                </div>
                              )}
                            </td>
                            <td className="border border-gray-300 p-3 max-w-xs">
                              <div className="truncate" title={item.title}>
                                {item.title || '-'}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-3 font-mono text-sm">
                              {item.seller_sku || '-'}
                            </td>
                            <td className="border border-gray-300 p-3 text-center font-bold">
                              {item.total_sales_quantity}
                            </td>
                            <td className="border border-gray-300 p-3 text-center">
                              {item.avg_orders_per_day}
                            </td>
                            <td className="border border-gray-300 p-3 text-center text-sm">
                              {formatDate(item.last_sale_date)}
                            </td>
                            <td className="border border-gray-300 p-3 text-center">
                              <span className={`${
                                item.days_since_last_sale === null ? 'text-gray-500' :
                                item.days_since_last_sale > 14 ? 'text-red-600 font-bold' :
                                item.days_since_last_sale > 7 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {item.days_since_last_sale || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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