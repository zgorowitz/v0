"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SiteHeader } from "@/components/site-header"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { totalSalesDaily } from '@/lib/dashboard/data';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDownIcon, ColumnsIcon, PlusIcon } from "lucide-react";

interface DailySalesRow {
  date: string;
  total_orders: number;
  total_units: number;
  total_sales: number;
  total_discount: number;
  total_fee: number;
  total_cogs: number;
  total_shipping_cost: number;
  gross_profit: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;
  profit_margin: number;
  tacos: number;
  fees_percent: number;
  cogs_percent: number;
  shipping_percent: number;
}

export default function Page() {
  const [dashboardData, setDashboardData] = useState<DailySalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [isChartCollapsed, setIsChartCollapsed] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['sales', 'net_profit']);
  const [visibleMetricsTable, setVisibleMetricsTable] = useState<Record<string, boolean>>({
    total_orders: true,
    total_units: true,
    total_sales: true,
    total_discount: true,
    total_fee: true,
    total_cogs: true,
    total_shipping_cost: true,
    gross_profit: false, // commented out
    net_profit: true,
    ad_cost: true,
    refund_amount: true,
    refund_units: false, // commented out
    profit_margin: true,
    tacos: true,
    fees_percent: true,
    cogs_percent: true,
    shipping_percent: true,
  });
  const itemsFilter = useItemsFilter();

  const appliedItemIds = useMemo(() => {
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]);

  // Function to get preset date range based on period
  const getPresetDateRange = useCallback((periodType: 'day' | 'week' | 'month'): DateRange => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);

    switch (periodType) {
      case 'day':
        // 30 days
        start.setDate(start.getDate() - 29);
        break;
      case 'week':
        // 3 months (90 days)
        start.setDate(start.getDate() - 89);
        break;
      case 'month':
        // 12 months
        start.setMonth(start.getMonth() - 11);
        start.setDate(1);
        break;
    }

    return { from: start, to: end };
  }, []);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => getPresetDateRange('month'));

  // Handle period change and auto-update date range to preset
  const handlePeriodChange = useCallback((newPeriod: 'day' | 'week' | 'month') => {
    setPeriod(newPeriod);
    const presetRange = getPresetDateRange(newPeriod);
    setDateRange(presetRange);
    setDateRangeError(null);
  }, [getPresetDateRange]);

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
        break;
    }

    if (isValid) {
      setDateRangeError(null);
      setDateRange(newDateRange);
    }
  };

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

  const formatDateForChart = (dateStr: string) => {
    if (!dateStr) return '-';
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

  // Available metrics for the chart
  const availableMetrics = useMemo(() => [
    { key: 'sales', label: 'Sales', dataKey: 'total_sales', color: 'hsl(var(--chart-1))' },
    // { key: 'gross_profit', label: 'Gross Profit', dataKey: 'gross_profit', color: 'hsl(var(--chart-2))' },
    { key: 'net_profit', label: 'Net Profit', dataKey: 'net_profit', color: 'hsl(var(--chart-3))' },
    { key: 'units', label: 'Units', dataKey: 'total_units', color: 'hsl(var(--chart-4))' },
    // { key: 'orders', label: 'Orders', dataKey: 'total_orders', color: 'hsl(var(--chart-5))' },
    { key: 'ad_cost', label: 'Ad Cost', dataKey: 'ad_cost', color: 'hsl(var(--chart-6))' },
    { key: 'profit_margin', label: 'Profit Margin %', dataKey: 'profit_margin', color: 'hsl(var(--chart-7))' },
    { key: 'tacos', label: 'TACOS %', dataKey: 'tacos', color: 'hsl(var(--chart-8))' },
  ], []);

  const chartData = useMemo(() => {
    return dashboardData.map(row => {
      const dataPoint: any = { date: row.date };
      availableMetrics.forEach(metric => {
        dataPoint[metric.key] = (row as any)[metric.dataKey] || 0;
      });
      return dataPoint;
    });
  }, [dashboardData, availableMetrics]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    availableMetrics.forEach(metric => {
      config[metric.key] = {
        label: metric.label,
        color: metric.color,
      };
    });
    return config;
  }, [availableMetrics]);

  const handleMetricToggle = (metricKey: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        // Don't allow removing the last metric
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== metricKey);
      } else {
        return [...prev, metricKey];
      }
    });
  };

  // Transform sales data to table format
  const allMetrics = useMemo(() => [
    { key: 'total_orders', label: 'Orders', isCurrency: false, isPercent: false },
    { key: 'total_units', label: 'Units', isCurrency: false, isPercent: false },
    { key: 'total_sales', label: 'Sales', isCurrency: true, isPercent: false },
    { key: 'total_discount', label: 'Discount', isCurrency: true, isPercent: false },
    { key: 'total_fee', label: 'ML Fee', isCurrency: true, isPercent: false },
    { key: 'total_cogs', label: 'COGS', isCurrency: true, isPercent: false },
    { key: 'total_shipping_cost', label: 'Shipping Cost', isCurrency: true, isPercent: false },
    { key: 'gross_profit', label: 'Gross Profit', isCurrency: true, isPercent: false },
    { key: 'net_profit', label: 'Net Profit', isCurrency: true, isPercent: false },
    { key: 'ad_cost', label: 'Ad Cost', isCurrency: true, isPercent: false },
    { key: 'refund_amount', label: 'Refund Amount', isCurrency: true, isPercent: false },
    { key: 'refund_units', label: 'Refund Units', isCurrency: false, isPercent: false },
    { key: 'profit_margin', label: 'Profit Margin', isCurrency: false, isPercent: true },
    { key: 'tacos', label: 'TACOS', isCurrency: false, isPercent: true },
    { key: 'fees_percent', label: 'Fees %', isCurrency: false, isPercent: true },
    { key: 'cogs_percent', label: 'COGS %', isCurrency: false, isPercent: true },
    { key: 'shipping_percent', label: 'Shipping %', isCurrency: false, isPercent: true }
  ], []);

  const tableData = useMemo(() => {
    return allMetrics
      .filter(metric => visibleMetricsTable[metric.key])
      .map((metric, index) => {
        const dateValues = dashboardData.map(d => ({
          date: d.date,
          value: (d as any)[metric.key] || 0
        }));

        return {
          id: index + 1,
          metricKey: metric.key,
          label: metric.label,
          isCurrency: metric.isCurrency,
          isPercent: metric.isPercent,
          dateValues
        };
      });
  }, [dashboardData, visibleMetricsTable, allMetrics]);

  return (
    <LayoutWrapper>
      <SiteHeader title="Sales Dashboard">
        <div className="flex items-center gap-2">
          <ItemsFilter {...itemsFilter} />
          <PeriodSelector
            period={period}
            onChange={handlePeriodChange}
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
      </SiteHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {dateRangeError && (
              <div className="mx-4 lg:mx-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {dateRangeError}
              </div>
            )}
            <div className="px-4 lg:px-6">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <ChartAreaInteractive
                  data={chartData}
                  period={period}
                  title="Performance Overview"
                  description={`Showing ${selectedMetrics.map(k => availableMetrics.find(m => m.key === k)?.label).join(', ')}`}
                  config={chartConfig}
                  dataKeys={selectedMetrics}
                  isCollapsed={isChartCollapsed}
                  onToggleCollapse={() => setIsChartCollapsed(!isChartCollapsed)}
                  availableMetrics={availableMetrics.map(m => ({ key: m.key, label: m.label }))}
                  selectedMetrics={selectedMetrics}
                  onMetricToggle={handleMetricToggle}
                />
              )}
            </div>
            {!loading && tableData.length > 0 && (
              <Tabs
                defaultValue="outline"
                className="flex w-full flex-col justify-start gap-6"
              >
                <div className="flex items-center justify-between px-4 lg:px-6">
                  <Label htmlFor="view-selector" className="sr-only">
                    View
                  </Label>
                  <Select defaultValue="outline">
                    <SelectTrigger
                      className="@4xl/main:hidden flex w-fit"
                      id="view-selector"
                    >
                      <SelectValue placeholder="Select a view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="past-performance">Past Performance</SelectItem>
                      <SelectItem value="key-personnel">Key Personnel</SelectItem>
                      <SelectItem value="focus-documents">Focus Documents</SelectItem>
                    </SelectContent>
                  </Select>
                  <TabsList className="@4xl/main:flex hidden">
                    <TabsTrigger value="outline">Outline</TabsTrigger>
                    <TabsTrigger value="past-performance" className="gap-1">
                      Past Performance{" "}
                      <Badge
                        variant="secondary"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/30"
                      >
                        3
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="key-personnel" className="gap-1">
                      Key Personnel{" "}
                      <Badge
                        variant="secondary"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/30"
                      >
                        2
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ColumnsIcon />
                          <span className="hidden lg:inline">Customize Columns</span>
                          <span className="lg:hidden">Columns</span>
                          <ChevronDownIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {allMetrics.map((metric) => (
                          <DropdownMenuCheckboxItem
                            key={metric.key}
                            checked={visibleMetricsTable[metric.key]}
                            onCheckedChange={(value) =>
                              setVisibleMetricsTable(prev => ({ ...prev, [metric.key]: !!value }))
                            }
                          >
                            {metric.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm">
                      <PlusIcon />
                      <span className="hidden lg:inline">Add Section</span>
                    </Button>
                  </div>
                </div>
                <TabsContent
                  value="outline"
                  className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
                >
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                          <TableHead className="sticky left-0 z-20 bg-muted">Metric</TableHead>
                          {dashboardData.map((row, index) => (
                            <TableHead key={index} className="text-right">
                              {formatDateForChart(row.date)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium sticky left-0 bg-background">
                              {row.label}
                            </TableCell>
                            {row.dateValues.map((dateValue, index) => (
                              <TableCell key={index} className="text-right">
                                {row.isCurrency
                                  ? `$${Math.round(Number(dateValue.value)).toLocaleString()}`
                                  : row.isPercent
                                  ? `${Math.round(Number(dateValue.value))}%`
                                  : Math.round(Number(dateValue.value)).toLocaleString()}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="past-performance" className="px-4 lg:px-6">
                  <p className="text-sm text-muted-foreground">Past Performance content coming soon...</p>
                </TabsContent>
                <TabsContent value="key-personnel" className="px-4 lg:px-6">
                  <p className="text-sm text-muted-foreground">Key Personnel content coming soon...</p>
                </TabsContent>
                <TabsContent value="focus-documents" className="px-4 lg:px-6">
                  <p className="text-sm text-muted-foreground">Focus Documents content coming soon...</p>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}
