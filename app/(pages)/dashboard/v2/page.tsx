"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { SimpleTable } from '@/components/ui/t_wrapper_v2';
import { Calendar, ChevronDown } from 'lucide-react';
import { itemSalesData } from '@/lib/dashboard/data';
import { useMetricCards } from '@/lib/dashboard/useMetricCards';
import { MetricCards } from './metric-cards';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const { metricCards, loading: metricsLoading, updateCardDate } = useMetricCards();

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const [dateRange, setDateRange] = useState([yesterday, yesterday]);
  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const organizationId = await getCurrentUserOrganizationId();
    const [start, end] = dateRange;
    const startStr = start?.toISOString().split('T')[0];
    const endStr = end?.toISOString().split('T')[0];
    console.log("Fetching data for org:", organizationId, "from", startStr, "to", endStr);
    const child_data = await itemSalesData(organizationId, startStr, endStr);
    console.log("Fetched data:", child_data.length);
    setDashboardData(child_data);
    setLoading(false);
  }, [dateRange]);


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

  return (
    <LayoutWrapper>
      <div className="p-4">
        <MetricCards data={metricCards} loading={metricsLoading} onDateChange={updateCardDate} />
        <SimpleTable 
          data={dashboardData} 
          columns={columns} 
          loading={loading}
          customControls={
            <DatePicker selected={null} onChange={(dates) => setDateRange(dates)} startDate={dateRange[0]} endDate={dateRange[1]} selectsRange dateFormat="yyyy-MM-dd" />
          }
        />
      </div>
    </LayoutWrapper>
  );
}

export default DashboardPage;
