"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { EnhancedTableWrapper } from '@/components/ui/enhanced-table-wrapper';
import { Calendar, ChevronDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DateRangeCalendar } from '@/components/ui/date-range-calendar';

interface DashboardFamily {
  date: string;
  family_name: string;
  organization_id: string;
  items: number;
  orders: number;
  units: number;
  sales: number;
  discount: number;
  returns?: number;
  fees: number;
  net_revenue: number;
  title: string;
  meli_user_id: string;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  listing_type: string;
  category_name: string;
  nickname: string;
}

interface DashboardParents {
  date: string;
  orders: number;
  units: number;
  sales: number;
  discount: number;
  returns?: number;
  fees: number;
  net_revenue: number;
  item_id: string;
  family_name: string;
  title: string;
  meli_user_id: string;
  current_price: number;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  listing_type: string;
  user_product_id: string;
  category_name: string;
  nickname: string;
  organization_id: string;
}

interface TableRow extends DashboardFamily {
  // Additional fields from DashboardParents for child rows
  item_id?: string;
  current_price?: number;
  user_product_id?: string;
  returns?: number;
  // Hierarchy fields
  isChild?: boolean;
  subRows?: TableRow[];
}

interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

const Dash2Page = () => {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  const dateRangeOptions = [
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
    }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const organizationId = await getCurrentUserOrganizationId();
      
      console.log('Date Range:', dateRange);
      console.log('Start Date:', dateRange?.startDate);
      console.log('End Date:', dateRange?.endDate);
      
      // Build date filter conditions
      let familyQuery = supabase
        .from('dashboard_family')
        .select('*')
        .eq('organization_id', organizationId);
        
      let parentsQuery = supabase
        .from('dashboard_parents')
        .select('*')
        .eq('organization_id', organizationId);

      if (dateRange?.startDate) {
        console.log('Adding start date filter:', dateRange.startDate);
        familyQuery = familyQuery.gte('date', dateRange.startDate);
        parentsQuery = parentsQuery.gte('date', dateRange.startDate);
      }
      if (dateRange?.endDate) {
        console.log('Adding end date filter:', dateRange.endDate);
        familyQuery = familyQuery.lte('date', dateRange.endDate);
        parentsQuery = parentsQuery.lte('date', dateRange.endDate);
      }
      
      const [{ data: familyData, error: familyError }, { data: parentsData, error: parentsError }] = 
        await Promise.all([familyQuery, parentsQuery]);
      
      if (familyError) throw familyError;
      if (parentsError) throw parentsError;
      
      console.log('Family Data Sample:', familyData?.[0]);
      console.log('Parents Data Sample:', parentsData?.[0]);
      console.log('Family Data Count:', familyData?.length);
      console.log('Parents Data Count:', parentsData?.length);
      
      // Aggregate family data by family_name (sum across daily records)
      const familyAggregation = new Map<string, DashboardFamily>();
      (familyData || []).forEach((family: DashboardFamily) => {
        if (family.family_name) {
          const existing = familyAggregation.get(family.family_name);
          if (existing) {
            // Sum numeric fields
            existing.items += family.items || 0;
            existing.orders += family.orders || 0;
            existing.units += family.units || 0;
            existing.sales += family.sales || 0;
            existing.discount += family.discount || 0;
            existing.returns = (existing.returns || 0) + (family.returns || 0);
            existing.fees += family.fees || 0;
            existing.net_revenue += family.net_revenue || 0;
            // Keep latest descriptive data (title, thumbnail, etc.)
            if (family.date > existing.date) {
              existing.date = family.date;
              existing.title = family.title;
              existing.thumbnail = family.thumbnail;
              existing.permalink = family.permalink;
              existing.available_quantity = family.available_quantity;
            }
          } else {
            familyAggregation.set(family.family_name, { ...family });
          }
        }
      });
      
      console.log('Aggregated Family Data:', Array.from(familyAggregation.values()));
      
      // Aggregate parent data by item_id (sum across daily records)
      const parentAggregation = new Map<string, DashboardParents>();
      (parentsData || []).forEach((parent: DashboardParents) => {
        if (parent.item_id) {
          const existing = parentAggregation.get(parent.item_id);
          if (existing) {
            // Sum numeric fields
            existing.orders += parent.orders || 0;
            existing.units += parent.units || 0;
            existing.sales += parent.sales || 0;
            existing.discount += parent.discount || 0;
            existing.returns = (existing.returns || 0) + (parent.returns || 0);
            existing.fees += parent.fees || 0;
            existing.net_revenue += parent.net_revenue || 0;
            // Keep latest descriptive data
            if (parent.date > existing.date) {
              existing.date = parent.date;
              existing.title = parent.title;
              existing.thumbnail = parent.thumbnail;
              existing.permalink = parent.permalink;
              existing.available_quantity = parent.available_quantity;
              existing.current_price = parent.current_price;
            }
          } else {
            parentAggregation.set(parent.item_id, { ...parent });
          }
        }
      });
      
      console.log('Aggregated Parent Data:', Array.from(parentAggregation.values()));
      
      // Process data into parent-child hierarchy
      const processedData: TableRow[] = [];
      const childrenByFamily = new Map<string, DashboardParents[]>();
      const orphanedChildren: DashboardParents[] = [];
      
      // Group aggregated parents by family_name
      Array.from(parentAggregation.values()).forEach((parent: DashboardParents) => {
        if (parent.family_name && familyAggregation.has(parent.family_name)) {
          if (!childrenByFamily.has(parent.family_name)) {
            childrenByFamily.set(parent.family_name, []);
          }
          childrenByFamily.get(parent.family_name)!.push(parent);
        } else {
          orphanedChildren.push(parent);
        }
      });
      
      // Create parent rows with children from aggregated data
      familyAggregation.forEach((family, familyName) => {
        const children = childrenByFamily.get(familyName) || [];
        const childRows: TableRow[] = children.map(child => ({
          ...family,
          ...child,
          isChild: true
        }));
        
        processedData.push({
          ...family,
          subRows: childRows
        });
      });
      
      // Add orphaned children as parent rows
      orphanedChildren.forEach(child => {
        processedData.push({
          date: child.date,
          family_name: child.family_name || '',
          organization_id: child.organization_id,
          items: 1,
          orders: child.orders,
          units: child.units,
          sales: child.sales,
          discount: child.discount,
          returns: child.returns,
          fees: child.fees,
          net_revenue: child.net_revenue,
          title: child.title,
          meli_user_id: child.meli_user_id,
          available_quantity: child.available_quantity,
          thumbnail: child.thumbnail,
          permalink: child.permalink,
          listing_type: child.listing_type,
          category_name: child.category_name,
          nickname: child.nickname,
          item_id: child.item_id,
          current_price: child.current_price,
          user_product_id: child.user_product_id
        });
      });
      
      console.log('Final Processed Data:', processedData);
      setTableData(processedData.sort((a, b) => (b.sales || 0) - (a.sales || 0)));
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    {
      header: 'Image',
      accessorKey: 'thumbnail',
      size: 80,
      cell: ({ getValue }) => {
        const imageUrl = getValue();
        return imageUrl ? (
          <img src={imageUrl} alt="Product" className="w-12 h-12 object-cover rounded" />
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
      cell: ({ getValue, row }) => {
        const data = row.original;
        const isChild = data.isChild;
        
        return (
          <div className={isChild ? 'pl-6' : ''}>
            <div className="font-medium text-sm">
              {getValue()}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-mono">{data.item_id || data.family_name}</span>
              {data.family_name && !isChild && <span className="ml-2">" Family: {data.family_name}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Orders',
      accessorKey: 'orders',
      size: 80,
      cell: ({ getValue }) => getValue() || 0
    },
    {
      header: 'Units',
      accessorKey: 'units',
      size: 80,
      cell: ({ getValue }) => getValue() || 0
    },
    {
      header: 'Returns',
      accessorKey: 'returns',
      size: 80,
      cell: ({ getValue }) => getValue() || 0
    },
    {
      header: 'Sales',
      accessorKey: 'sales',
      size: 120,
      cell: ({ getValue }) => formatCurrency(getValue())
    },
    {
      header: 'Discount',
      accessorKey: 'discount',
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? formatCurrency(value) : '-';
      }
    },
    {
      header: 'Fees',
      accessorKey: 'fees',
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? formatCurrency(value) : '-';
      }
    },
    {
      header: 'Net Revenue',
      accessorKey: 'net_revenue',
      size: 120,
      cell: ({ getValue }) => formatCurrency(getValue())
    },
    {
      header: 'Current Price',
      accessorKey: 'current_price',
      size: 100,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const isChild = row.original.isChild;
        return isChild && value ? formatCurrency(value) : '-';
      }
    },
    {
      header: 'Category',
      accessorKey: 'category_name',
      size: 150,
      cell: ({ getValue }) => getValue() || '-'
    },
    {
      header: 'Account',
      accessorKey: 'nickname',
      size: 100,
      cell: ({ getValue }) => getValue() || '-'
    }
  ], []);

  const getSubRows = (row: TableRow) => row.subRows || [];

  const handleDateRangeSelect = (option: any) => {
    const range = option.getDateRange();
    console.log('Selected preset range:', range);
    console.log('Preset option:', option.label);
    setDateRange({
      startDate: range.startDate,
      endDate: range.endDate,
      label: option.label
    });
    setShowDateSelector(false);
    setShowCustomDatePicker(false);
  };

  const handleCustomDateSelect = (startDate: string, endDate: string) => {
    console.log('Custom date selection:', { startDate, endDate });
    console.log('Start date type:', typeof startDate, startDate);
    console.log('End date type:', typeof endDate, endDate);
    setDateRange({
      startDate,
      endDate,
      label: `${startDate} - ${endDate}`
    });
    setShowCustomDatePicker(false);
    setShowDateSelector(false);
  };

  if (error) {
    return (
      <LayoutWrapper>
        <div className="p-6 bg-stone-50 min-h-screen">
          <div className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-lg">
            <strong>Error: </strong>{error}
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="relative">
          <EnhancedTableWrapper
            data={tableData}
            columns={columns}
            getSubRows={getSubRows}
            enableExpanding={true}
            enableSorting={true}
            enableFiltering={true}
            enablePagination={true}
            pageSize={50}
            autoHeight={true}
            onRefresh={fetchData}
          customControls={
            <div className="relative">
              <button
                onClick={() => setShowDateSelector(!showDateSelector)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4" />
                <span>{dateRange ? dateRange.label : 'Date Range'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showDateSelector && (
                <div className="absolute top-full -left-10 mt-1 z-50 max-w-[calc(100vw-2rem)]">
                  <div className="flex flex-col md:flex-row">
                    
                    {/* Date Options */}
                    <div className="bg-white border border-gray-200 rounded-md md:rounded-l-md md:rounded-r-none shadow-lg w-40 flex-shrink-0">
                      <div className="p-1">
                        {dateRangeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleDateRangeSelect(option)}
                            className="flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 w-full text-left"
                          >
                            {option.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left rounded-b-md ${
                            showCustomDatePicker ? 'bg-gray-100 text-gray-900' : 'text-blue-600 hover:bg-gray-50'
                          }`}
                        >
                          Custom Range...
                        </button>
                      </div>
                    </div>

                    {/* Compact Calendar */}
                    {showCustomDatePicker && (
                      <div className="mt-1 md:mt-0 md:border-l scale-90 origin-top-left">
                        <DateRangeCalendar
                          isOpen={showCustomDatePicker}
                          onClose={() => setShowCustomDatePicker(false)}
                          onSelect={handleCustomDateSelect}
                          className="compact-calendar"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          }

            
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
                <div className="w-8 h-8 mb-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm text-gray-600">Loading...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default Dash2Page;