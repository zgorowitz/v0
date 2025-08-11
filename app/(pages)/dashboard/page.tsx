"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { AGGridWrapper, AGGridColumnTypes } from '@/components/ui/ag-grid-wrapper';

const DashboardPage = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  // Filter options for the AG Grid
  const categoryFilterOptions = [
    { value: 'category_name', label: 'Category' },
    { value: 'account_name', label: 'Account' },
    { value: 'revenue_last_30_days', label: 'Revenue (30d)' },
    { value: 'revenue_this_month', label: 'Revenue (Month)' },
    { value: 'total_revenue', label: 'Total Revenue' },
  ];

  const itemFilterOptions = [
    { value: 'seller_sku', label: 'SKU' },
    { value: 'item_title', label: 'Item Title' },
    { value: 'category_name', label: 'Category' },
    { value: 'account_name', label: 'Account' },
    { value: 'revenue_last_30_days', label: 'Revenue (30d)' },
    { value: 'total_revenue', label: 'Total Revenue' },
  ];

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user's organization ID
      const organizationId = await getCurrentUserOrganizationId();
      if (!organizationId) {
        throw new Error('User organization not found');
      }
      
      // Build queries with date filtering
      let categoryQuery = supabase
        // .from('dashboard_category_summary')
        // .select('*')
        // .eq('organization_id', organizationId);

      let itemQuery = supabase
        // .from('dashboard_item_summary')
        // .select('*')
        // .eq('organization_id', organizationId);

      // Apply date filtering if dates are set
      // Note: These views aggregate data, so we filter based on recent activity
      if (dateFilter.from || dateFilter.to) {
        // For date filtering on aggregated views, we'd need to modify the views
        // For now, we'll fetch all data and let the views handle the aggregation
        console.log('Date filtering on aggregated views - using view defaults');
      }

      // Execute queries in parallel
      const [categoryResult, itemResult] = await Promise.all([
        categoryQuery.order('revenue_last_30_days', { ascending: false }).limit(100),
        itemQuery.order('revenue_last_30_days', { ascending: false }).limit(200)
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (itemResult.error) throw itemResult.error;

      setCategoryData(categoryResult.data || []);
      setItemData(itemResult.data || []);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle date filter changes
  const handleDateChange = (dates) => {
    setDateFilter(dates);
  };

  // Category column definitions
  const categoryColumnDefs = useMemo(() => [
    {
      headerName: 'Category',
      field: 'category_name',
      width: 200,
      filter: true,
      cellRenderer: (params) => (
        <span className="font-medium text-gray-900">{params.value || 'Unknown'}</span>
      )
    },
    {
      headerName: 'Account',
      field: 'account_name',
      width: 120,
      filter: true
    },
    AGGridColumnTypes.numeric('Revenue (30d)', 'revenue_last_30_days', {
      width: 140,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Quantity (30d)', 'quantity_last_30_days', {
      width: 120,
      filter: true
    }),
    AGGridColumnTypes.numeric('This Week', 'revenue_this_week', {
      width: 120,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('This Month', 'revenue_this_month', {
      width: 130,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Total Revenue', 'total_revenue', {
      width: 140,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Avg Fee %', 'avg_fee_percentage', {
      width: 100,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '0%';
        return `${params.value.toFixed(1)}%`;
      }
    }),
    AGGridColumnTypes.numeric('Active Days', 'active_days', {
      width: 110,
      filter: true
    })
  ], []);

  // Item column definitions
  const itemColumnDefs = useMemo(() => [
    {
      headerName: 'SKU',
      field: 'seller_sku',
      width: 120,
      filter: true,
      cellRenderer: (params) => (
        <span className="font-mono text-sm">{params.value || 'N/A'}</span>
      )
    },
    {
      headerName: 'Item Title',
      field: 'item_title',
      width: 250,
      filter: true,
      cellRenderer: (params) => (
        <span className="text-sm truncate" title={params.value}>{params.value || 'Unknown Item'}</span>
      )
    },
    {
      headerName: 'Category',
      field: 'category_name',
      width: 140,
      filter: true
    },
    {
      headerName: 'Account',
      field: 'account_name',
      width: 100,
      filter: true
    },
    AGGridColumnTypes.numeric('Revenue (30d)', 'revenue_last_30_days', {
      width: 130,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Qty (30d)', 'quantity_last_30_days', {
      width: 90,
      filter: true
    }),
    AGGridColumnTypes.numeric('This Week', 'revenue_this_week', {
      width: 110,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Total Revenue', 'total_revenue', {
      width: 130,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Avg Price', 'avg_unit_price', {
      width: 100,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '$0';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Active Days', 'active_days', {
      width: 100,
      filter: true
    })
  ], []);

  if (error) {
    return (
      <LayoutWrapper>
        <div className="p-6 bg-stone-50 min-h-screen">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-1">Track performance across categories and items</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Categories</h3>
            <p className="text-2xl font-bold text-gray-900">{categoryData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Items</h3>
            <p className="text-2xl font-bold text-gray-900">{itemData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Total Revenue (30d)</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0
              }).format(
                categoryData.reduce((sum, cat) => sum + (cat.revenue_last_30_days || 0), 0)
              )}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Total Revenue (All Time)</h3>
            <p className="text-2xl font-bold text-gray-600">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0
              }).format(
                categoryData.reduce((sum, cat) => sum + (cat.total_revenue || 0), 0)
              )}
            </p>
          </div>
        </div>

        {/* Category Revenue Table */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Revenue by Category</h2>
            <div className="relative">
              <AGGridWrapper
                columnDefs={categoryColumnDefs}
                rowData={categoryData}
                filters={categoryFilterOptions}
                height="400px"
                showDateSelector={true}
                onDateChange={handleDateChange}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                }}
                gridOptions={{
                  pagination: true,
                  paginationPageSize: 20,
                  rowSelection: 'single',
                }}
              />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-10 pointer-events-none">
                  <span className="w-10 h-10 mb-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <div className="text-lg text-gray-700">Loading categories...</div>
                </div>
              )}
            </div>
          </div>

          {/* Item Revenue Table */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Revenue by Item</h2>
            <div className="relative">
              <AGGridWrapper
                columnDefs={itemColumnDefs}
                rowData={itemData}
                filters={itemFilterOptions}
                height="500px"
                showDateSelector={true}
                onDateChange={handleDateChange}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                }}
                gridOptions={{
                  pagination: true,
                  paginationPageSize: 25,
                  rowSelection: 'single',
                }}
              />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-10 pointer-events-none">
                  <span className="w-10 h-10 mb-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <div className="text-lg text-gray-700">Loading items...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default DashboardPage;