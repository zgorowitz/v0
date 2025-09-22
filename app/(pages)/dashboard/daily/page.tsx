"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { SimpleTable } from '@/components/dashboard/t_wrapper_v2';
import { totalSalesDaily } from '@/lib/dashboard/data';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DailySalesRow {
  date: string;
  total_orders: number;
  total_units: number;
  total_sales: number;
  total_discount: number;
  total_fee: number;
  total_cogs: number;
  gross_profit: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;
}

interface PivotedRow {
  metric: string;
  [date: string]: any;
}

const DailyDashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<DailySalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const itemsFilter = useItemsFilter();

  const appliedItemIds = useMemo(() => {
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]);

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return [start, end];
  });

  const validateAndSetDateRange = (dates: [Date | null, Date | null]) => {
    if (!dates[0] || !dates[1]) {
      setDateRange(dates);
      return;
    }

    const diffTime = Math.abs(dates[1].getTime() - dates[0].getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let isValid = true;
    switch (period) {
      case 'day':
        if (diffDays > 30) {
          setDateRangeError('Daily view limited to 30 days');
          isValid = false;
        }
        break;
      case 'week':
        if (diffDays > 90) {
          setDateRangeError('Weekly view limited to 3 months');
          isValid = false;
        }
        break;
      case 'month':
        // No limit for monthly
        break;
    }

    if (isValid) {
      setDateRangeError(null);
      setDateRange(dates);
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, appliedItemIds, period]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const [start, end] = dateRange;
    if (!start || !end) {
      setLoading(false);
      return;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const data = await totalSalesDaily(startStr, endStr, period, appliedItemIds);
    setDashboardData(data || []);
    setLoading(false);
  }, [dateRange, appliedItemIds, period]);

  const formatDateForColumn = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);

    switch (period) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return dateStr;
    }
  };

  // Pivot the data to have dates as columns
  const pivotedData = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) return [];

    const metrics = [
      { key: 'total_orders', label: 'Orders', format: false },
      { key: 'total_units', label: 'Units', format: false },
      { key: 'total_sales', label: 'Sales', format: true },
      { key: 'gross_profit', label: 'Gross Profit', format: true },
      { key: 'net_profit', label: 'Net Profit', format: true },
      { key: 'ad_cost', label: 'Ad Cost', format: true },
      { key: 'refund_units', label: 'Refund Units', format: false },
      { key: 'refund_amount', label: 'Refund Amount', format: true },
      { key: 'total_fee', label: 'ML Fee', format: true },
      { key: 'total_discount', label: 'Discount', format: true },
      { key: 'total_cogs', label: 'COGS', format: true }
    ];

    return metrics.map(metric => {
      const row: PivotedRow = { metric: metric.label };
      dashboardData.forEach(data => {
        const dateStr = formatDateForColumn(data.date);
        const value = data[metric.key];
        row[dateStr] = metric.format && value != null ? `$${Math.round(value).toLocaleString()}` : (value ?? '-');
      });
      return row;
    });
  }, [dashboardData, period]);

  // Generate columns dynamically based on dates
  const columns = useMemo(() => {
    const cols = [{ accessorKey: 'metric', header: 'Metric' }];

    if (dashboardData && dashboardData.length > 0) {
      dashboardData.forEach(data => {
        const dateStr = formatDateForColumn(data.date);
        cols.push({
          accessorKey: dateStr,
          header: dateStr
        });
      });
    }

    return cols;
  }, [dashboardData, period]);

  return (
    <LayoutWrapper>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Daily Sales Dashboard</h1>

        {dateRangeError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {dateRangeError}
          </div>
        )}

        <SimpleTable
          data={pivotedData as any}
          columns={columns as any}
          loading={loading}
          enableSearch={false}
          enableSorting={false}
          enablePagination={false}
          exportFilename={`sales_${period}_${dateRange[0]?.toISOString().split('T')[0]}_${dateRange[1]?.toISOString().split('T')[0]}`}
          customControls={
            <div className="flex justify-between items-start w-full gap-4">
              <div className="min-w-[300px]">
                <ItemsFilter {...itemsFilter} />
              </div>
              <div className="flex gap-2 items-center">
                <PeriodSelector
                  period={period}
                  onChange={setPeriod}
                  dateRange={dateRange}
                  onDateRangeError={setDateRangeError}
                />
                <DatePicker
                  selected={null}
                  onChange={(dates) => {
                    if (Array.isArray(dates)) {
                      validateAndSetDateRange([dates[0], dates[1]]);
                    }
                  }}
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  selectsRange
                  dateFormat="yyyy-MM-dd"
                  className="px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  placeholderText="Select date range..."
                  maxDate={new Date()}
                />
              </div>
            </div>
          }
        />
      </div>
    </LayoutWrapper>
  );
}

export default DailyDashboardPage;