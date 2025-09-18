"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { EnhancedTableWrapper, TableColumnTypes } from '@/components/ui/enhanced-table-wrapper';
import { Calendar, ChevronDown } from 'lucide-react';
import { MetricCards } from '@/components/ui/metric-cards';

interface DashboardRow {
  // Metric fields
  total_orders: number;
  total_order_items: number;
  total_quantity_sold: number;
  total_sales: number;
  total_full_price_sales: number;
  total_discount_amount: number;
  total_sale_fees: number;
  net_revenue: number;
  total_sales_base_currency: number;
  total_fees_base_currency: number;
  min_unit_price: number;
  max_unit_price: number;
  min_full_unit_price: number;
  max_full_unit_price: number;
  
  // Item identification
  item_id: string;
  family_name: string;
  title: string;
  meli_user_id: string;
  current_price: number;
  condition: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail: string;
  permalink: string;
  listing_type: string;
  status: string;
  
  // Variation fields
  variation_id: string;
  user_product_id: string;
  variation_price: number;
  variation_available_quantity: number;
  variation_sold_quantity: number;
  variation_thumbnail: string;
  variation_attributes: any;
  seller_sku: string;
  
  // Category and account
  category_name: string;
  nickname: string;
  organization_id: string;
  
  // Grouping and hierarchy fields
  isVariation?: boolean;
  subRows?: DashboardRow[];
  variations_count?: number;
  group_size?: number;
}

interface DateRangeOption {
  label: string;
  value: string;
  getDateRange: () => { startDate: string; endDate: string };
}

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface DashboardTotals {
  total_orders: number;
  total_sales: number;
  net_revenue: number;
}

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricTotals, setMetricTotals] = useState<{
    yesterday: DashboardTotals;
    sevenDay: DashboardTotals;
    fourteenDay: DashboardTotals;
    thirtyDay: DashboardTotals;
  }>({
    yesterday: { total_orders: 0, total_sales: 0, net_revenue: 0 },
    sevenDay: { total_orders: 0, total_sales: 0, net_revenue: 0 },
    fourteenDay: { total_orders: 0, total_sales: 0, net_revenue: 0 },
    thirtyDay: { total_orders: 0, total_sales: 0, net_revenue: 0 }
  });
  
  // Set default date range to yesterday
  const getYesterdayRange = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      startDate: yesterday.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      label: 'Yesterday'
    };
  };
  
  const [dateRange, setDateRange] = useState<DateRange | null>(getYesterdayRange());
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateValidationError, setDateValidationError] = useState('');

  // Filter options for the table
  const filterOptions = [
    { value: 'item_id', label: 'Item ID' }
  ];

  // Date range options
  const dateRangeOptions: DateRangeOption[] = [
    {
      label: 'Yesterday',
      value: 'yesterday',
      getDateRange: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Two days ago',
      value: 'two_days',
      getDateRange: () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return {
          startDate: twoDaysAgo.toISOString().split('T')[0],
          endDate: twoDaysAgo.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Last 7 days',
      value: 'seven_days',
      getDateRange: () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const today = new Date();
        return {
          startDate: sevenDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Last 14 days',
      value: 'fourteen_days',
      getDateRange: () => {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const today = new Date();
        return {
          startDate: fourteenDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Last 30 days',
      value: 'thirty_days',
      getDateRange: () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();
        return {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'This month so far',
      value: 'this_month',
      getDateRange: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: firstDay.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Last month',
      value: 'last_month',
      getDateRange: () => {
        const today = new Date();
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          startDate: firstDayLastMonth.toISOString().split('T')[0],
          endDate: lastDayLastMonth.toISOString().split('T')[0]
        };
      }
    }
  ];

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const organizationId = await getCurrentUserOrganizationId();
      
      // Fetch raw dashboard data and aggregate on the client side
      let viewQuery = supabase
        .from('dashboard')
        .select('*')
        .eq('organization_id', organizationId);

      // Apply date filters
      if (dateRange?.startDate) {
        viewQuery = viewQuery.gte('order_date', dateRange.startDate);
      }
      if (dateRange?.endDate) {
        viewQuery = viewQuery.lte('order_date', dateRange.endDate);
      }
      
      const { data: rawData, error } = await viewQuery;
      
      if (error) throw error;
      
      // Group raw data directly by family_name || item_id (like products page)
      const familyGroupedData = new Map<string, any[]>();
      
      (rawData || []).forEach((item: any) => {
        const groupKey = item.family_name || item.item_id;
        
        if (!familyGroupedData.has(groupKey)) {
          familyGroupedData.set(groupKey, []);
        }
        familyGroupedData.get(groupKey)!.push(item);
      });
      
      // Process each family group
      const processedData: DashboardRow[] = [];
      
      familyGroupedData.forEach((groupItems, groupKey) => {
        // First, aggregate metrics by user_product_id
        const variationMap = new Map<string, any>();
        
        groupItems.forEach((item: any) => {
          const variationKey = item.user_product_id;
          
          if (!variationMap.has(variationKey)) {
            variationMap.set(variationKey, {
              ...item,
              total_orders: 0,
              total_order_items: 0,
              total_quantity_sold: 0,
              total_sales: 0,
              total_full_price_sales: 0,
              total_discount_amount: 0,
              total_sale_fees: 0,
              net_revenue: 0,
              total_sales_base_currency: 0,
              total_fees_base_currency: 0,
            });
          }
          
          const existing = variationMap.get(variationKey)!;
          existing.total_orders += item.total_orders || 0;
          existing.total_order_items += item.total_order_items || 0;
          existing.total_quantity_sold += item.total_quantity_sold || 0;
          existing.total_sales += item.total_sales || 0;
          existing.total_full_price_sales += item.total_full_price_sales || 0;
          existing.total_discount_amount += item.total_discount_amount || 0;
          existing.total_sale_fees += item.total_sale_fees || 0;
          existing.net_revenue += item.net_revenue || 0;
          existing.total_sales_base_currency += item.total_sales_base_currency || 0;
          existing.total_fees_base_currency += item.total_fees_base_currency || 0;
        });
        
        // Convert to array and sort by total orders descending to find the main item
        const aggregatedVariations = Array.from(variationMap.values());
        aggregatedVariations.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));
        
        const mainItem = aggregatedVariations[0];
        const variations: DashboardRow[] = [];
        
        // If there are multiple variations in group, others become child rows
        if (aggregatedVariations.length > 1) {
          aggregatedVariations.slice(1).forEach((item, index) => {
            variations.push({
              ...item,
              isVariation: true,
            });
          });
        }
        
        // Create parent row with aggregated totals from all variations
        const parentRow: DashboardRow = {
          // Use main item's representative data
          item_id: mainItem.item_id,
          family_name: mainItem.family_name,
          title: mainItem.title,
          meli_user_id: mainItem.meli_user_id,
          current_price: mainItem.current_price,
          condition: mainItem.condition,
          available_quantity: mainItem.available_quantity,
          sold_quantity: mainItem.sold_quantity,
          thumbnail: mainItem.thumbnail,
          permalink: mainItem.permalink,
          listing_type: mainItem.listing_type,
          status: mainItem.status,
          variation_id: mainItem.variation_id,
          user_product_id: mainItem.user_product_id,
          variation_price: mainItem.variation_price,
          variation_available_quantity: mainItem.variation_available_quantity,
          variation_sold_quantity: mainItem.variation_sold_quantity,
          variation_thumbnail: mainItem.variation_thumbnail,
          variation_attributes: mainItem.variation_attributes,
          seller_sku: mainItem.seller_sku,
          category_name: mainItem.category_name,
          nickname: mainItem.nickname,
          organization_id: mainItem.organization_id,
          
          // SUMMED metrics from all variations in the group
          total_orders: aggregatedVariations.reduce((sum, item) => sum + (item.total_orders || 0), 0),
          total_order_items: aggregatedVariations.reduce((sum, item) => sum + (item.total_order_items || 0), 0),
          total_quantity_sold: aggregatedVariations.reduce((sum, item) => sum + (item.total_quantity_sold || 0), 0),
          total_sales: aggregatedVariations.reduce((sum, item) => sum + (item.total_sales || 0), 0),
          total_full_price_sales: aggregatedVariations.reduce((sum, item) => sum + (item.total_full_price_sales || 0), 0),
          total_discount_amount: aggregatedVariations.reduce((sum, item) => sum + (item.total_discount_amount || 0), 0),
          total_sale_fees: aggregatedVariations.reduce((sum, item) => sum + (item.total_sale_fees || 0), 0),
          net_revenue: aggregatedVariations.reduce((sum, item) => sum + (item.net_revenue || 0), 0),
          total_sales_base_currency: aggregatedVariations.reduce((sum, item) => sum + (item.total_sales_base_currency || 0), 0),
          total_fees_base_currency: aggregatedVariations.reduce((sum, item) => sum + (item.total_fees_base_currency || 0), 0),
          
          // Min/max prices across all variations
          min_unit_price: Math.min(...aggregatedVariations.map(item => item.min_unit_price || 0).filter(p => p > 0)),
          max_unit_price: Math.max(...aggregatedVariations.map(item => item.max_unit_price || 0)),
          min_full_unit_price: Math.min(...aggregatedVariations.map(item => item.min_full_unit_price || 0).filter(p => p > 0)),
          max_full_unit_price: Math.max(...aggregatedVariations.map(item => item.max_full_unit_price || 0)),
          
          // Grouping metadata
          variations_count: variations.length,
          group_size: aggregatedVariations.length,
          subRows: variations,
        };
        
        processedData.push(parentRow);
      });
      
      // Sort parent rows by total orders, then by total sales
      const aggregatedData = processedData.sort((a, b) => {
        // Primary sort: total orders (descending)
        const orderDiff = (b.total_orders || 0) - (a.total_orders || 0);
        if (orderDiff !== 0) return orderDiff;
        
        // Secondary sort: total sales (descending)
        return (b.total_sales || 0) - (a.total_sales || 0);
      });
      
      console.log('Fetched and processed dashboard records:', aggregatedData.length);
      console.log('Family groups:', familyGroupedData.size);
      setDashboardData(aggregatedData);
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Fetch metric totals
  const fetchMetricTotals = useCallback(async () => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Fetch totals for different periods
      const periods = {
        yesterday: {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        },
        sevenDay: {
          start: new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        },
        fourteenDay: {
          start: new Date(today.setDate(today.getDate() - 14)).toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        },
        thirtyDay: {
          start: new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        }
      };

      const results = await Promise.all(
        Object.entries(periods).map(async ([key, { start, end }]) => {
          const { data, error } = await supabase
            .from('dashboard_totals')
            .select('total_orders, total_sales, net_revenue')
            .gte('order_date', start)
            .lte('order_date', end);

          if (error) throw error;

          const totals = data.reduce(
            (acc, row) => ({
              total_orders: acc.total_orders + (row.total_orders || 0),
              total_sales: acc.total_sales + (row.total_sales || 0),
              net_revenue: acc.net_revenue + (row.net_revenue || 0)
            }),
            { total_orders: 0, total_sales: 0, net_revenue: 0 }
          );

          return [key, totals];
        })
      );

      setMetricTotals(Object.fromEntries(results));
    } catch (error) {
      console.error('Error fetching metric totals:', error);
    }
  }, []);

  // Add fetchMetricTotals to useEffect
  useEffect(() => {
    fetchMetricTotals();
  }, [fetchMetricTotals]);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Table column definitions using TanStack Table
  const columns = useMemo(() => [
    {
      header: 'Image',
      accessorKey: 'thumbnail',
      size: 80,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const data = row.original;
        // For child variations, use variation_thumbnail, for parents use thumbnail
        const imageUrl = data.isVariation 
          ? (data.variation_thumbnail || data.thumbnail)
          : data.thumbnail;
        
        return imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Product" 
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400">No Image</span>
          </div>
        );
      }
    },
    
    {
      header: 'Product Info',
      accessorKey: 'title',
      size: 300,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const data = row.original;
        
        if (data.isVariation) {
          // Child variation row
          return (
            <div className="pl-6">
              <div className="text-sm text-gray-700">
                {data.seller_sku || 'No SKU'}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-mono">{data.user_product_id || data.item_id}</span>
                {data.variation_attributes && (
                  <span className="ml-2">• Variant</span>
                )}
              </div>
            </div>
          );
        }
        
        // Parent product row
        return (
          <div>
            <div className="font-medium text-sm">
              <span className="text-gray-700 font-semibold">{getValue()}</span>
            </div>
            <div className="text-xs text-gray-500">
              {data.permalink ? (
                <a 
                  href={data.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-mono hover:text-gray-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {data.item_id}
                </a>
              ) : (
                <span className="font-mono">{data.item_id}</span>
              )}
              {data.family_name && (
                <span className="ml-2">• Family: {data.family_name}</span>
              )}
              {data.variations_count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 ">
                  {data.variations_count} variations
                </span>
              )}
            </div>
          </div>
        );
      }
    },


    {
      header: 'Orders',
      accessorKey: 'total_orders',
      size: 80,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        return (
          <span className={data.isVariation ? 'text-gray-600' : 'font-semibold text-gray-900'}>
            {value || 0}
          </span>
        );
      }
    },

    {
      header: 'Items',
      accessorKey: 'total_order_items',
      size: 80,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        return (
          <span className={data.isVariation ? 'text-gray-600' : 'font-semibold text-gray-900'}>
            {value || 0}
          </span>
        );
      }
    },

    {
      header: 'Qty Sold',
      accessorKey: 'total_quantity_sold',
      size: 90,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        return (
          <span className={data.isVariation ? 'text-gray-600' : 'font-semibold text-gray-900'}>
            {value || 0}
          </span>
        );
      }
    },

    {
      header: 'Total Sales',
      accessorKey: 'total_sales',
      size: 120,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        const className = data.isVariation 
          ? 'text-gray-600' 
          : 'font-semibold text-gray-900';
        return (
          <span className={className}>
            {formatCurrency(value)}
          </span>
        );
      }
    },

    {
      header: 'Net Revenue',
      accessorKey: 'net_revenue',
      size: 120,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        const isNegative = value < 0;
        const baseColor = isNegative ? 'text-gray-600' : 'text-gray-600';
        const className = data.isVariation 
          ? `${baseColor} opacity-75` 
          : `${baseColor} font-semibold`;
        return (
          <span className={className}>
            {formatCurrency(value)}
          </span>
        );
      }
    },

    {
      header: 'Discount',
      accessorKey: 'total_discount_amount',
      size: 110,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        if (!value || value <= 0) return '-';
        
        const className = data.isVariation 
          ? 'text-gray-500 opacity-75' 
          : 'text-gray-600 font-semibold';
        return (
          <span className={className}>
            {formatCurrency(value)}
          </span>
        );
      }
    },

    {
      header: 'Fees',
      accessorKey: 'total_sale_fees',
      size: 100,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        if (!value || value <= 0) return '-';
        
        const className = data.isVariation 
          ? 'text-gray-500 opacity-75' 
          : 'text-grays-600 font-semibold';
        return (
          <span className={className}>
            {formatCurrency(value)}
          </span>
        );
      }
    },

    {
      header: 'Category',
      accessorKey: 'category_name',
      size: 120,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        if (data.isVariation) return null; // Don't show for variations
        return (
          <span className="text-gray-700">{value}</span>
        );
      }
    },

    {
      header: 'Account',
      accessorKey: 'nickname',
      size: 100,
      cell: ({ getValue, row }: { getValue: () => any; row: any }) => {
        const value = getValue();
        const data = row.original;
        if (data.isVariation) return null; // Don't show for variations
        return (
          <span className="text-gray-700">{value}</span>
        );
      }
    },

    {
      header: 'Price',
      accessorKey: 'current_price',
      size: 100,
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return value ? formatCurrency(value) : '-';
      }
    },
  ], []);

  if (error) {
    return (
      <LayoutWrapper>
        <div className="p-6 bg-stone-50 min-h-screen">
          <div className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  // Function to get sub-rows (variations) for TanStack Table
  const getSubRows = (row: DashboardRow) => {
    return row.subRows || [];
  };

  // Handle date range selection
  const handleDateRangeSelect = (option: DateRangeOption) => {
    const range = option.getDateRange();
    setDateRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: option.label
    });
    setShowDateSelector(false);
    setShowCustomDatePicker(false);
  };

  // Clear date range
  const clearDateRange = () => {
    setDateRange(null);
    setShowDateSelector(false);
    setShowCustomDatePicker(false);
    setCustomStartDate('');
    setCustomEndDate('');
    setDateValidationError('');
  };

  // Validate custom date range
  const validateCustomDateRange = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) {
      return 'Both start and end dates are required';
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (start > end) {
      return 'Start date must be before or equal to end date';
    }
    
    if (start > today || end > today) {
      return 'Dates cannot be in the future';
    }
    
    return '';
  };

  // Handle custom date range application
  const applyCustomDateRange = () => {
    const error = validateCustomDateRange(customStartDate, customEndDate);
    
    if (error) {
      setDateValidationError(error);
      return;
    }
    
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    
    // Format label
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined 
    });
    
    const label = startDate.getTime() === endDate.getTime() 
      ? formatDate(startDate)
      : `${formatDate(startDate)} - ${formatDate(endDate)}`;
    
    setDateRange({
      startDate: customStartDate,
      endDate: customEndDate,
      label
    });
    
    setShowDateSelector(false);
    setShowCustomDatePicker(false);
    setDateValidationError('');
  };

  // Cancel custom date picker
  const cancelCustomDatePicker = () => {
    setShowCustomDatePicker(false);
    setCustomStartDate('');
    setCustomEndDate('');
    setDateValidationError('');
  };

  // Handle custom date input changes
  const handleCustomStartDateChange = (value: string) => {
    setCustomStartDate(value);
    if (dateValidationError) {
      setDateValidationError('');
    }
  };

  const handleCustomEndDateChange = (value: string) => {
    setCustomEndDate(value);
    if (dateValidationError) {
      setDateValidationError('');
    }
  };

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
        <MetricCards
          yesterdayRevenue={metricTotals.yesterday.total_sales}
          sevenDayRevenue={metricTotals.sevenDay.total_sales}
          fourteenDayRevenue={metricTotals.fourteenDay.total_sales}
          thirtyDayRevenue={metricTotals.thirtyDay.total_sales}
          yesterdayOrders={metricTotals.yesterday.total_orders}
          sevenDayOrders={metricTotals.sevenDay.total_orders}
          fourteenDayOrders={metricTotals.fourteenDay.total_orders}
          thirtyDayOrders={metricTotals.thirtyDay.total_orders}
        />
        
        {/* Dashboard Table */}
        <div className="relative">
          <EnhancedTableWrapper
            data={dashboardData}
            columns={columns}
            getSubRows={getSubRows}
            enableExpanding={true}
            enableSorting={true}
            enableFiltering={true}
            enablePagination={true}
            pageSize={50}
            filterColumns={filterOptions}
            autoHeight={true}
            expandedByDefault={false}
            onRefresh={fetchDashboardData}
            onRowClick={(row: any) => {
              if (row.permalink) {
                window.open(row.permalink, '_blank');
              }
            }} 
            customControls={
              <div className="relative">
                <button
                  onClick={() => setShowDateSelector(!showDateSelector)}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{dateRange ? dateRange.label : 'Date Range'}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showDateSelector && (
                  <div className="flex">
                    {/* Preset Date Options */}
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="p-2">
                        <div className="space-y-1">
                          {dateRangeOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleDateRangeSelect(option)}
                              className="control-button w-full text-left mb-1"
                            >
                              {option.label}
                            </button>
                          ))}
                          <hr className="my-1" />
                          <button
                            onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                            className={`control-button w-full text-left mb-1 text-blue-600 font-medium ${showCustomDatePicker ? 'bg-blue-50' : ''}`}
                          >
                            Custom Range...
                          </button>
                          {dateRange && (
                            <>
                              <hr className="my-1" />
                              <button
                                onClick={clearDateRange}
                                className="control-button w-full text-left text-gray-500"
                              >
                                Clear filter
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Custom Date Picker Panel */}
                    {showCustomDatePicker && (
                      <div className="absolute top-full left-64 mt-1 ml-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">Custom Date Range</h4>
                              <button
                                onClick={cancelCustomDatePicker}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                ×
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) => handleCustomStartDateChange(e.target.value)}
                                  max={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) => handleCustomEndDateChange(e.target.value)}
                                  max={new Date().toISOString().split('T')[0]}
                                  min={customStartDate}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>

                              {dateValidationError && (
                                <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                  {dateValidationError}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={applyCustomDateRange}
                                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              >
                                Apply
                              </button>
                              <button
                                onClick={cancelCustomDatePicker}
                                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            }
          />
          {/* Loader inside table */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 pointer-events-none">
              <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
                <span className="w-8 h-8 mb-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <div className="text-sm text-gray-600">Loading dashboard data...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default DashboardPage;