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
  const { metricCards, loading: metricsLoading } = useMetricCards();

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const [startDate, setStartDate] = useState(yesterday);
  const [endDate, setEndDate] = useState(yesterday);
  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const organizationId = await getCurrentUserOrganizationId();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    console.log("Fetching data for org:", organizationId, "from", startStr, "to", endStr);
    const child_data = await itemSalesData(
      organizationId,
      startStr,
      endStr
    );
    console.log("Fetched data:", child_data.length);
    setDashboardData(child_data);
    setLoading(false);
  }, [startDate, endDate]);


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
        <MetricCards data={metricCards} loading={metricsLoading} />
        <div>
          <DatePicker selected={startDate} onChange={(date) => date && setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} dateFormat="yyyy-MM-dd" />
          <DatePicker selected={endDate} onChange={(date) => date && setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} dateFormat="yyyy-MM-dd" />
        </div>
        <SimpleTable data={dashboardData} columns={columns} />
      </div>
    </LayoutWrapper>
  );
}

export default DashboardPage;
