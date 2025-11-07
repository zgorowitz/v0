import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ColumnsIcon, ChevronDownIcon } from 'lucide-react';
import { fetchDailySalesData, DailySalesRow } from '../utils/dataFetchers';
import { useDataCache } from '../hooks/useDataCache';
import { formatDateForChart } from '../utils/dateUtils';
import { DAILY_METRIC_COLUMNS } from '../utils/tableUtils';

interface DailyViewProps {
  itemIds: string[];
  period: 'day' | 'week' | 'month';
  dateRange: DateRange;
}

export const DailyView: React.FC<DailyViewProps> = ({ itemIds, period, dateRange }) => {
  const [dailyData, setDailyData] = useState<DailySalesRow[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['sales', 'net_profit']);
  const [isChartCollapsed, setIsChartCollapsed] = useState(false);
  const [visibleMetricsTable, setVisibleMetricsTable] = useState<Record<string, boolean>>({
    total_orders: true,
    total_units: true,
    total_sales: true,
    total_discount: true,
    total_fee: true,
    total_cogs: true,
    total_shipping_cost: true,
    gross_profit: false,
    net_profit: true,
    ad_cost: true,
    refund_amount: true,
    refund_units: false,
    profit_margin: true,
    tacos: true,
    fees_percent: true,
    cogs_percent: true,
    shipping_percent: true,
  });

  // Cache key
  const cacheKey = useMemo(() => {
    const itemsKey = itemIds.length > 0 ? itemIds.join(',') : 'all';
    const dateKey = `${dateRange.from?.toISOString()}_${dateRange.to?.toISOString()}`;
    return `daily_${period}_${itemsKey}_${dateKey}`;
  }, [itemIds, period, dateRange]);

  // Fetch data with caching
  const { data, loading } = useDataCache<DailySalesRow[]>(
    cacheKey,
    async () => {
      if (!dateRange.from || !dateRange.to) return [];
      const startStr = dateRange.from.toISOString().split('T')[0];
      const endStr = dateRange.to.toISOString().split('T')[0];
      return fetchDailySalesData(startStr, endStr, period, itemIds.length > 0 ? itemIds : null);
    },
    [dateRange, itemIds, period]
  );

  useEffect(() => {
    if (data) {
      setDailyData(data);
    }
  }, [data]);

  // Available metrics for the chart
  const availableMetrics = useMemo(
    () => [
      { key: 'sales', label: 'Sales', dataKey: 'total_sales', color: 'hsl(var(--chart-1))' },
      { key: 'net_profit', label: 'Net Profit', dataKey: 'net_profit', color: 'hsl(var(--chart-3))' },
      { key: 'units', label: 'Units', dataKey: 'total_units', color: 'hsl(var(--chart-4))' },
      { key: 'ad_cost', label: 'Ad Cost', dataKey: 'ad_cost', color: 'hsl(var(--chart-6))' },
      {
        key: 'profit_margin',
        label: 'Profit Margin %',
        dataKey: 'profit_margin',
        color: 'hsl(var(--chart-7))',
      },
      { key: 'tacos', label: 'TACOS %', dataKey: 'tacos', color: 'hsl(var(--chart-8))' },
    ],
    []
  );

  const chartData = useMemo(() => {
    return dailyData.map(row => {
      const dataPoint: any = { date: row.date };
      availableMetrics.forEach(metric => {
        const value = (row as any)[metric.dataKey] || 0;
        // Round monetary values, keep percentages and units as-is
        dataPoint[metric.key] = ['sales', 'net_profit', 'ad_cost'].includes(metric.key)
          ? Math.round(value)
          : value;
      });
      return dataPoint;
    });
  }, [dailyData, availableMetrics]);

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

  // Transform data for table (metrics as rows, dates as columns)
  const tableData = useMemo(() => {
    return DAILY_METRIC_COLUMNS
      .filter(metric => visibleMetricsTable[metric.id])
      .map((metric, index) => {
        const dateValues = dailyData.map(d => ({
          date: d.date,
          value: (d as any)[metric.id] || 0,
        }));

        return {
          id: index + 1,
          metricKey: metric.id,
          label: metric.label,
          isCurrency: metric.isCurrency,
          isPercent: metric.isPercent,
          dateValues,
        };
      });
  }, [dailyData, visibleMetricsTable]);

  return (
    <div>
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <ChartAreaInteractive
            data={chartData}
            period={period}
            title="Performance Overview"
            description={`Showing ${selectedMetrics
              .map(k => availableMetrics.find(m => m.key === k)?.label)
              .join(', ')}`}
            config={chartConfig}
            dataKeys={selectedMetrics}
            isCollapsed={isChartCollapsed}
            onToggleCollapse={() => setIsChartCollapsed(!isChartCollapsed)}
            availableMetrics={availableMetrics.map(m => ({ key: m.key, label: m.label }))}
            selectedMetrics={selectedMetrics}
            onMetricToggle={handleMetricToggle}
          />

          {/* Table */}
          {tableData.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-end mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ColumnsIcon className="h-4 w-4 mr-2" />
                      <span className="hidden lg:inline">Customize Columns</span>
                      <span className="lg:hidden">Columns</span>
                      <ChevronDownIcon className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {DAILY_METRIC_COLUMNS.map(metric => (
                      <DropdownMenuCheckboxItem
                        key={metric.id}
                        checked={visibleMetricsTable[metric.id]}
                        onCheckedChange={value =>
                          setVisibleMetricsTable(prev => ({ ...prev, [metric.id]: !!value }))
                        }
                      >
                        {metric.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-muted">Metric</TableHead>
                      {dailyData.map((row, index) => (
                        <TableHead key={index} className="text-right">
                          {formatDateForChart(row.date, period)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(row => (
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
            </div>
          )}
        </>
      )}
    </div>
  );
};
