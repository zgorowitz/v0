"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function OrdersPage() {
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState('avg_orders_per_day')
  const [sortDirection, setSortDirection] = useState('desc')
  const [daysBack, setDaysBack] = useState(30)
  const [visibleColumns, setVisibleColumns] = useState({
    thumbnail: true,
    seller_sku: true,
    title: true,
    color: true,
    size: true,
    available_quantity: true,
    avg_orders_per_day: true,
    days_left_inventory: true,
    stock_status: true,
    last_sale_date: false,
    total_sales_quantity: false,
    days_since_last_sale: false
  })

  // All available columns with labels
  const allColumns = {
    thumbnail: 'Image',
    seller_sku: 'SKU',
    title: 'Title',
    color: 'Color',
    size: 'Size',
    available_quantity: 'Stock',
    avg_orders_per_day: 'Orders/Day',
    days_left_inventory: 'Days Left',
    stock_status: 'Status',
    last_sale_date: 'Last Sale',
    total_sales_quantity: 'Total Sales',
    days_since_last_sale: 'Days Since Sale'
  }

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/orders?days=${daysBack}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch orders data')
      }
      
      const data = await response.json()
      setAnalytics(data.data || [])
    } catch (error) {
      console.error('Error fetching orders data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount and when daysBack changes
  useEffect(() => {
    fetchAnalytics()
  }, [daysBack])

  // Handle column sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Sort data
  const sortedAnalytics = [...analytics].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    if (typeof aValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return sortDirection === 'asc' 
      ? aValue.toString().localeCompare(bValue.toString())
      : bValue.toString().localeCompare(aValue.toString())
  })

  // Toggle column visibility
  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  // Get stock status color
  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out_of_stock': return 'text-red-600'
      case 'low_stock': return 'text-yellow-600'
      case 'moderate_stock': return 'text-blue-600'
      default: return 'text-green-600'
    }
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-full">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Orders & Inventory Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Days to analyze:</label>
                <select 
                  value={daysBack} 
                  onChange={(e) => setDaysBack(parseInt(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-1"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              
              <Button 
                onClick={fetchAnalytics}
                disabled={loading}
                className="bg-black text-white hover:bg-gray-800"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {/* Column Selection */}
            <div className="mb-6 border border-gray-200 rounded p-4">
              <h3 className="text-sm font-medium mb-3">Show/Hide Columns:</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {Object.entries(allColumns).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders data...</p>
              </div>
            )}

            {/* Orders Table */}
            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      {Object.entries(allColumns).map(([key, label]) => 
                        visibleColumns[key] && (
                          <th
                            key={key}
                            className="border border-gray-300 p-2 text-left cursor-pointer hover:bg-gray-200"
                            onClick={() => handleSort(key)}
                          >
                            <div className="flex items-center gap-1">
                              {label}
                              {sortField === key && (
                                <span className="text-xs">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAnalytics.map((item, index) => (
                      <tr key={`${item.item_id}_${item.variation_id || 'no_var'}`} className="hover:bg-gray-50">
                        {visibleColumns.thumbnail && (
                          <td className="border border-gray-300 p-2">
                            {item.thumbnail && (
                              <img 
                                src={item.thumbnail} 
                                alt={item.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                          </td>
                        )}
                        {visibleColumns.seller_sku && (
                          <td className="border border-gray-300 p-2 font-mono text-sm">
                            {item.seller_sku || '-'}
                          </td>
                        )}
                        {visibleColumns.title && (
                          <td className="border border-gray-300 p-2 max-w-xs">
                            <div className="truncate" title={item.title}>
                              {item.title}
                            </div>
                          </td>
                        )}
                        {visibleColumns.color && (
                          <td className="border border-gray-300 p-2">
                            {item.color || '-'}
                          </td>
                        )}
                        {visibleColumns.size && (
                          <td className="border border-gray-300 p-2">
                            {item.size || '-'}
                          </td>
                        )}
                        {visibleColumns.available_quantity && (
                          <td className="border border-gray-300 p-2 text-center">
                            {item.available_quantity}
                          </td>
                        )}
                        {visibleColumns.avg_orders_per_day && (
                          <td className="border border-gray-300 p-2 text-center">
                            {item.avg_orders_per_day}
                          </td>
                        )}
                        {visibleColumns.days_left_inventory && (
                          <td className="border border-gray-300 p-2 text-center">
                            {item.days_left_inventory === 999 ? '∞' : item.days_left_inventory}
                          </td>
                        )}
                        {visibleColumns.stock_status && (
                          <td className="border border-gray-300 p-2">
                            <span className={`font-medium ${getStockStatusColor(item.stock_status)}`}>
                              {item.stock_status.replace('_', ' ')}
                            </span>
                          </td>
                        )}
                        {visibleColumns.last_sale_date && (
                          <td className="border border-gray-300 p-2">
                            {formatDate(item.last_sale_date)}
                          </td>
                        )}
                        {visibleColumns.total_sales_quantity && (
                          <td className="border border-gray-300 p-2 text-center">
                            {item.total_sales_quantity}
                          </td>
                        )}
                        {visibleColumns.days_since_last_sale && (
                          <td className="border border-gray-300 p-2 text-center">
                            {item.days_since_last_sale || '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {sortedAnalytics.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No data found for the selected period.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}