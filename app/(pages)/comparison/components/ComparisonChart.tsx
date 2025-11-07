"use client"

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mergeChartDataForComparison } from '../utils/comparisonUtils';

interface DailySalesRow {
  date: string;
  total_sales: number;
  net_profit: number;
  total_units: number;
  ad_cost: number;
  profit_margin: number;
  tacos: number;
}

interface ComparisonChartProps {
  basePeriodData: DailySalesRow[];
  comparisonPeriodData: DailySalesRow[];
  period: 'day' | 'week' | 'month';
  basePeriodLabel: string;
  comparisonPeriodLabel: string;
}

export function ComparisonChart({
  basePeriodData,
  comparisonPeriodData,
  period,
  basePeriodLabel,
  comparisonPeriodLabel,
}: ComparisonChartProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['sales']);

  // Available metrics for the chart
  const availableMetrics = useMemo(() => [
    { key: 'sales', label: 'Sales', baseKey: 'base_total_sales', compKey: 'comparison_total_sales' },
    { key: 'net_profit', label: 'Net Profit', baseKey: 'base_net_profit', compKey: 'comparison_net_profit' },
    { key: 'units', label: 'Units', baseKey: 'base_total_units', compKey: 'comparison_total_units' },
    { key: 'ad_cost', label: 'Ad Cost', baseKey: 'base_ad_cost', compKey: 'comparison_ad_cost' },
    { key: 'profit_margin', label: 'Profit Margin %', baseKey: 'base_profit_margin', compKey: 'comparison_profit_margin' },
  ], []);

  // Merge chart data
  const chartData = useMemo(() => {
    return mergeChartDataForComparison(basePeriodData, comparisonPeriodData, period);
  }, [basePeriodData, comparisonPeriodData, period]);

  // Chart configuration
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};

    availableMetrics.forEach((metric, index) => {
      const baseColor = `hsl(var(--chart-${index * 2 + 1}))`;
      const compColor = `hsl(var(--chart-${index * 2 + 2}))`;

      config[`base_${metric.key}`] = {
        label: `${metric.label} (Base)`,
        color: baseColor,
      };
      config[`comparison_${metric.key}`] = {
        label: `${metric.label} (Comparison)`,
        color: compColor,
      };
    });

    return config;
  }, [availableMetrics]);

  const handleMetricToggle = (metricKey: string) => {
    // Only allow one metric at a time
    setSelectedMetrics([metricKey]);
  };

  // Get selected metric keys for rendering
  const selectedKeys = useMemo(() => {
    const keys: string[] = [];
    selectedMetrics.forEach(metricKey => {
      const metric = availableMetrics.find(m => m.key === metricKey);
      if (metric) {
        keys.push(metric.baseKey, metric.compKey);
      }
    });
    return keys;
  }, [selectedMetrics, availableMetrics]);

  if (isCollapsed) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Performance Comparison</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>
            {basePeriodLabel} vs {comparisonPeriodLabel}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* Metric Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {availableMetrics.find(m => m.key === selectedMetrics[0])?.label || 'Select Metric'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {availableMetrics.map((metric) => (
                <DropdownMenuCheckboxItem
                  key={metric.key}
                  checked={selectedMetrics.includes(metric.key)}
                  onCheckedChange={() => handleMetricToggle(metric.key)}
                >
                  {metric.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            {selectedKeys.map((key, index) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={chartConfig[key]?.color || `hsl(var(--chart-${index + 1}))`}
                fillOpacity={0.4}
                stroke={chartConfig[key]?.color || `hsl(var(--chart-${index + 1}))`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
