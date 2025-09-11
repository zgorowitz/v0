"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { SimpleTable } from '@/components/ui/t_wrapper_v2';
import { Calendar, ChevronDown } from 'lucide-react';
import { itemSalesData } from '@/lib/dashboard/data';

interface DashboardRow {
  // family_name: string;
  item_id: string;
  item_orders: number;
  item_units: number;
  item_sales: number;
  item_discount: number;
  item_fee: number;
  
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

  const [dateRange, setDateRange] = useState({
    startDate: '2025-09-08',
    endDate: '2025-09-10'
  })
  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const organizationId = await getCurrentUserOrganizationId();
    console.log("Fetching data for org:", organizationId, "from", dateRange.startDate, "to", dateRange.endDate);
    const child_data = await itemSalesData(
      organizationId,
      dateRange.startDate,
      dateRange.endDate
    );
    console.log("Fetched data:", child_data.length);
    setDashboardData(child_data);
    setLoading(false);
  }, [dateRange]);

  const updateDateRange = (start, end) => {
    setDateRange({startDate: start, endDate: end});
  };

  const formatMoney = ({getValue}) => `$${getValue()?.toLocaleString()}`;
  const formatImage = ({getValue}) => <img src={getValue()} alt="Product" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
  const columns = [
    {accessorKey: 'thumbnail', header: 'Image', cell: formatImage},
    { accessorKey: 'item_id', header: 'Item ID' },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'item_orders', header: 'Total Orders' },
    { accessorKey: 'item_units', header: 'Item Units' },
    { accessorKey: 'item_sales', header: 'Item Sales', cell: formatMoney },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'item_fee', header: 'Fee', cell: formatMoney },
    { accessorKey: 'item_discount', header: 'Discount', cell: formatMoney }
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <LayoutWrapper>
      <div>
        <input 
          type="date" 
          value={dateRange.startDate} 
          onChange={(e) => updateDateRange(e.target.value, dateRange.endDate)} 
        />
        <input 
          type="date" 
          value={dateRange.endDate} 
          onChange={(e) => updateDateRange(dateRange.startDate, e.target.value)} 
        />
        <SimpleTable data={dashboardData} columns={columns} />
      </div>
    </LayoutWrapper>
  );
}

export default DashboardPage;
