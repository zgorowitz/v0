"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { totalSalesDaily } from '@/lib/dashboard/data';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Settings2 } from "lucide-react"

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
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const itemsFilter = useItemsFilter();

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    total_orders: true,
    total_units: true,
    total_sales: true,
    gross_profit: true,
    net_profit: true,
    ad_cost: true,
    refund_units: true,
    refund_amount: true,
    total_fee: true,
    total_discount: true,
    total_cogs: true,
  });

  const appliedItemIds = useMemo(() => {
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11); // Go back 11 months from yesterday (12 months total)
    start.setDate(1); // Set to first day of that month
    return { from: start, to: end };
  });

  const validateAndSetDateRange = (newDateRange: DateRange) => {
    if (!newDateRange.from || !newDateRange.to) {
      setDateRange(newDateRange);
      return;
    }

    const diffTime = Math.abs(newDateRange.to.getTime() - newDateRange.from.getTime());
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
      setDateRange(newDateRange);
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, appliedItemIds, period]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    if (!dateRange?.from || !dateRange?.to) {
      setLoading(false);
      return;
    }

    const startStr = dateRange.from.toISOString().split('T')[0];
    const endStr = dateRange.to.toISOString().split('T')[0];

    const data = await totalSalesDaily(startStr, endStr, period, appliedItemIds.length > 0 ? appliedItemIds : null as any);
    setDashboardData(data || []);
    setLoading(false);
  }, [dateRange, appliedItemIds, period]);

  const formatDateForColumn = (dateStr: string) => {
    if (!dateStr) return '-';
    // Add 'T00:00:00' to parse as local time, not UTC
    const date = new Date(dateStr + 'T00:00:00');

    switch (period) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short' });
      default:
        return dateStr;
    }
  };

  const metrics = useMemo(() => [
    { key: 'total_orders', label: 'Orders', format: false, visible: columnVisibility.total_orders },
    { key: 'total_units', label: 'Units', format: false, visible: columnVisibility.total_units },
    { key: 'total_sales', label: 'Sales', format: true, visible: columnVisibility.total_sales },
    { key: 'gross_profit', label: 'Gross Profit', format: true, visible: columnVisibility.gross_profit },
    { key: 'net_profit', label: 'Net Profit', format: true, visible: columnVisibility.net_profit },
    { key: 'ad_cost', label: 'Ad Cost', format: true, visible: columnVisibility.ad_cost },
    { key: 'refund_units', label: 'Refund Units', format: false, visible: columnVisibility.refund_units },
    { key: 'refund_amount', label: 'Refund Amount', format: true, visible: columnVisibility.refund_amount },
    { key: 'total_fee', label: 'ML Fee', format: true, visible: columnVisibility.total_fee },
    { key: 'total_discount', label: 'Discount', format: true, visible: columnVisibility.total_discount },
    { key: 'total_cogs', label: 'COGS', format: true, visible: columnVisibility.total_cogs }
  ], [columnVisibility]);

  // Pivot the data to have dates as columns
  const pivotedData = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) return [];

    return metrics
      .filter(metric => metric.visible)
      .map(metric => {
        const row: PivotedRow = { metric: metric.label };
        dashboardData.forEach(data => {
          const dateStr = formatDateForColumn(data.date);
          const value = (data as any)[metric.key];
          row[dateStr] = value == null ? '-' : metric.format ? `$${Math.round(value).toLocaleString()}` : Math.round(value).toLocaleString();
        });
        return row;
      });
  }, [dashboardData, period, metrics]);

  const handleDownload = () => {
    const headers = ['Metric', ...dashboardData.map(data => formatDateForColumn(data.date))];
    const rows = pivotedData.map(row => {
      const values = [row.metric];
      dashboardData.forEach(data => {
        const dateStr = formatDateForColumn(data.date);
        values.push(row[dateStr] || '-');
      });
      return values.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${period}_${dateRange?.from?.toISOString().split('T')[0]}_${dateRange?.to?.toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <LayoutWrapper>
      <div className="p-4">
        {dateRangeError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {dateRangeError}
          </div>
        )}

        {/* Top Controls */}
        <div className="flex justify-between items-start w-full gap-4 mb-6">
          <div className="min-w-[300px]">
            <ItemsFilter {...itemsFilter} />
          </div>
          <div className="flex gap-2 items-center">
            <PeriodSelector
              period={period}
              onChange={setPeriod}
              dateRange={[dateRange?.from || null, dateRange?.to || null]}
              onDateRangeError={setDateRangeError}
            />
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={validateAndSetDateRange}
              align="end"
              numberOfMonths={2}
            >
              <Button variant="outline" className="w-64">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                  : 'Select date range...'}
              </Button>
            </DateRangePicker>
          </div>
        </div>

        {/* Table Controls */}
        <div className="flex justify-end items-center w-full mb-4 gap-2">
          {/* Column Customization Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_orders}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_orders: checked }))}
              >
                Orders
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_units}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_units: checked }))}
              >
                Units
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_sales}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_sales: checked }))}
              >
                Sales
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.gross_profit}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, gross_profit: checked }))}
              >
                Gross Profit
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.net_profit}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, net_profit: checked }))}
              >
                Net Profit
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.ad_cost}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, ad_cost: checked }))}
              >
                Ad Cost
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.refund_units}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, refund_units: checked }))}
              >
                Refund Units
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.refund_amount}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, refund_amount: checked }))}
              >
                Refund Amount
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_fee}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_fee: checked }))}
              >
                ML Fee
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_discount}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_discount: checked }))}
              >
                Discount
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnVisibility.total_cogs}
                onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, total_cogs: checked }))}
              >
                COGS
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download Button */}
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table style={{ tableLayout: 'fixed', width: 'auto' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-40 min-w-40 max-w-40">Metric</TableHead>
                  {dashboardData.map((data, index) => (
                    <TableHead key={index} className="w-28 min-w-28 max-w-28 text-center">{formatDateForColumn(data.date)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotedData.length > 0 ? (
                  pivotedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium w-40 min-w-40 max-w-40">
                        {row.metric}
                      </TableCell>
                      {dashboardData.map((data, dataIndex) => {
                        const dateStr = formatDateForColumn(data.date);
                        return (
                          <TableCell key={dataIndex} className="w-28 min-w-28 max-w-28 text-center">
                            {row[dateStr]}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={dashboardData.length + 1} className="text-center">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}

export default DailyDashboardPage;
