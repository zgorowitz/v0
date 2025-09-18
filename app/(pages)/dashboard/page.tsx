"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { SimpleTable } from '@/components/dashboard/t_wrapper_v2';
import { itemSalesData } from '@/lib/dashboard/data';
import { useMetricCards } from '@/lib/dashboard/useMetricCards';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { MetricCards } from '@/components/dashboard/metric-cards';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DashboardRow {
  // family_name: string;
  item_id: string;
  item_orders: number;
  item_units: number;
  item_sales: number;
  gross_profit: number;
  item_discount: number;
  item_fee: number;
  item_cogs: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;
  
  title: string;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  sub_status: string;
  
  // // Grouping and hierarchy fields
  // isVariation?: boolean;
  // subRows?: DashboardRow[];
  // variations_count?: number;
  // group_size?: number;
}

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsFilter = useItemsFilter();

  // Debug: Log when itemsFilter changes
  useEffect(() => {
    console.log('[Dashboard] itemsFilter.appliedItemIds changed:', itemsFilter.appliedItemIds);
  }, [itemsFilter.appliedItemIds]);

  // Fix: Properly memoize the appliedItemIds array
  const appliedItemIds = useMemo(() => {
    console.log('[Dashboard] Memoizing appliedItemIds:', itemsFilter.appliedItemIds);
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]); // Use JSON.stringify for deep comparison

  // Pass the memoized array to useMetricCards
  const { metricCards, loading: metricsLoading, updateCardDate } = useMetricCards(appliedItemIds);

  const [dateRange, setDateRange] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return [yesterday, yesterday];
  });

  // Fetch dashboard data
  useEffect(() => {
    console.log('[Dashboard] fetchDashboardData triggered by dateRange or appliedItemIds change');
    fetchDashboardData();
  }, [dateRange, appliedItemIds]);

  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const [start, end] = dateRange;
    const startStr = start?.toISOString().split('T')[0];
    const endStr = end?.toISOString().split('T')[0];
    console.log("Fetching data from", startStr, "to", endStr, "with items:", appliedItemIds);
    const child_data = await itemSalesData(startStr, endStr, appliedItemIds);
    console.log("Fetched data:", child_data?.length || 0);
    setDashboardData(child_data || []);
    setLoading(false);
  }, [dateRange, appliedItemIds]);


  const formatMoney = ({getValue}) => `$${Math.round(getValue())?.toLocaleString()}`;
  const formatImage = ({getValue}) => <img src={getValue()} alt="Product" style={{ width: '30px', height: '30px', objectFit: 'cover' }} />
  const formatItemInfo = ({row}) => (
    <div>
      <div style={{ fontSize: '11px', color: '#999' }}>{row.original.item_id}</div>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}>{row.original.title}</div>
    </div>
  );
  const columns = [
    {accessorKey: 'thumbnail', header: '', cell: formatImage},
    { accessorKey: 'item_id', header: 'Item', cell: formatItemInfo },
    // { accessorKey: 'item_orders', header: 'Orders' },
    { accessorKey: 'item_units', header: 'Units' },
    { accessorKey: 'item_sales', header: 'Sales', cell: formatMoney },
    { accessorKey: 'gross_profit', header: 'Gross Profit', cell: formatMoney },
    { accessorKey: 'net_profit', header: 'Net Profit', cell: formatMoney },
    { accessorKey: 'ad_cost', header: 'Ads', cell: formatMoney },
    { accessorKey: 'refund_units', header: 'Refunds' },
    { accessorKey: 'refund_amount', header: 'Refund Cost', cell: formatMoney },
    { accessorKey: 'item_fee', header: 'Mercado-Libre Fee', cell: formatMoney },
    { accessorKey: 'item_discount', header: 'Discount', cell: formatMoney },
    { accessorKey: 'item_cogs', header: 'COGS', cell: formatMoney },
    { accessorKey: 'status', header: 'Status' }
  ];

  return (
    <LayoutWrapper>
      <div className="p-4">
        <MetricCards data={metricCards} loading={metricsLoading} onDateChange={updateCardDate} />
        <SimpleTable 
          data={dashboardData} 
          columns={columns} 
          loading={loading}
          enableSearch={false}
          customControls={
            <div className="flex justify-between items-start w-full">
              <div className="min-w-[300px]">
                <ItemsFilter {...itemsFilter} />
              </div>
              <DatePicker 
                selected={null} 
                onChange={(dates) => setDateRange(dates)} 
                startDate={dateRange[0]} 
                endDate={dateRange[1]} 
                selectsRange 
                dateFormat="yyyy-MM-dd"
                className="px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                placeholderText="Select date range..."
              />
            </div>
          }
        />
      </div>
    </LayoutWrapper>
  );
}

export default DashboardPage;
