"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { SiteHeader } from '@/components/site-header';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { itemSalesData, totalSalesDaily } from '@/lib/dashboard/data';
import { fetchCogsMap } from '@/lib/cogs/actions';
import { PeriodComparisonSelector } from './components/PeriodComparisonSelector';
import { ComparisonChart } from './components/ComparisonChart';
import { ComparisonTable } from './components/ComparisonTable';
import { ComparisonType, calculateComparisonPeriod } from './utils/comparisonUtils';
import { format } from 'date-fns';

interface DashboardRow {
  item_id: string;
  item_orders: number;
  item_units: number;
  item_sales: number;
  item_discount: number;
  item_fee: number;
  item_cogs: number;
  item_shipping_cost: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;
  profit_margin: number;
  tacos: number;
  fees_percent: number;
  cogs_percent: number;
  shipping_percent: number;
  title: string;
  price: number;
  stock: number;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  sub_status: string;
  unit_cogs?: number;
}

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

export default function ComparisonPage() {
  const itemsFilter = useItemsFilter();
  const [loading, setLoading] = useState(true);

  // Period state
  const [period] = useState<'day' | 'week' | 'month'>('day');

  // Base period (default to last 30 days)
  const [basePeriod, setBasePeriod] = useState<DateRange>(() => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { from: start, to: end };
  });

  // Comparison type
  const [comparisonType, setComparisonType] = useState<ComparisonType>('previous_period');

  // Comparison period (calculated automatically)
  const [comparisonPeriod, setComparisonPeriod] = useState<DateRange>(() => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return calculateComparisonPeriod({ from: start, to: end }, 'previous_period');
  });

  // Data state
  const [basePeriodData, setBasePeriodData] = useState<DashboardRow[]>([]);
  const [comparisonPeriodData, setComparisonPeriodData] = useState<DashboardRow[]>([]);
  const [basePeriodChartData, setBasePeriodChartData] = useState<DailySalesRow[]>([]);
  const [comparisonPeriodChartData, setComparisonPeriodChartData] = useState<DailySalesRow[]>([]);

  // Applied item IDs
  const appliedItemIds = useMemo(() => {
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]);

  // Update comparison period when base period or type changes
  useEffect(() => {
    const newComparisonPeriod = calculateComparisonPeriod(basePeriod, comparisonType);
    setComparisonPeriod(newComparisonPeriod);
  }, [basePeriod, comparisonType]);

  // Fetch data
  useEffect(() => {
    fetchComparisonData();
  }, [basePeriod, comparisonPeriod, appliedItemIds]);

  const fetchComparisonData = useCallback(async () => {
    if (!basePeriod.from || !basePeriod.to || !comparisonPeriod.from || !comparisonPeriod.to) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const baseStartStr = basePeriod.from.toISOString().split('T')[0];
    const baseEndStr = basePeriod.to.toISOString().split('T')[0];
    const compStartStr = comparisonPeriod.from.toISOString().split('T')[0];
    const compEndStr = comparisonPeriod.to.toISOString().split('T')[0];

    const itemIds = appliedItemIds.length > 0 ? appliedItemIds : null;

    try {
      // Fetch all data in parallel
      const [baseTableData, compTableData, baseChartData, compChartData, cogsMap] = await Promise.all([
        itemSalesData(baseStartStr, baseEndStr, itemIds as any),
        itemSalesData(compStartStr, compEndStr, itemIds as any),
        totalSalesDaily(baseStartStr, baseEndStr, period, itemIds as any),
        totalSalesDaily(compStartStr, compEndStr, period, itemIds as any),
        fetchCogsMap(),
      ]);

      // Merge COGS data into table data
      const mergeCogsData = (data: any[], cogs: any) => {
        return (data || []).map((item: any) => ({
          ...item,
          unit_cogs: (cogs as any)[item.item_id] || 0,
        }));
      };

      setBasePeriodData(mergeCogsData(baseTableData, cogsMap));
      setComparisonPeriodData(mergeCogsData(compTableData, cogsMap));
      setBasePeriodChartData(baseChartData || []);
      setComparisonPeriodChartData(compChartData || []);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  }, [basePeriod, comparisonPeriod, appliedItemIds, period]);

  const handleCogsUpdate = (itemId: string, newValue: number) => {
    setBasePeriodData(prev => prev.map(item =>
      item.item_id === itemId ? { ...item, unit_cogs: newValue } : item
    ));
    setComparisonPeriodData(prev => prev.map(item =>
      item.item_id === itemId ? { ...item, unit_cogs: newValue } : item
    ));
  };

  const basePeriodLabel = useMemo(() => {
    if (!basePeriod.from || !basePeriod.to) return '';
    return `${format(basePeriod.from, 'yyyy-MM-dd')} - ${format(basePeriod.to, 'yyyy-MM-dd')}`;
  }, [basePeriod]);

  const comparisonPeriodLabel = useMemo(() => {
    if (!comparisonPeriod.from || !comparisonPeriod.to) return '';
    return `${format(comparisonPeriod.from, 'yyyy-MM-dd')} - ${format(comparisonPeriod.to, 'yyyy-MM-dd')}`;
  }, [comparisonPeriod]);

  return (
    <LayoutWrapper>
      <SiteHeader title="Comparison Dashboard">
        <div className="flex items-center gap-2">
          <ItemsFilter {...itemsFilter} />
          <PeriodComparisonSelector
            basePeriod={basePeriod}
            comparisonPeriod={comparisonPeriod}
            comparisonType={comparisonType}
            onBasePeriodChange={setBasePeriod}
            onComparisonTypeChange={setComparisonType}
          />
        </div>
      </SiteHeader>

      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* Comparison Chart */}
            <div className="mb-4">
              <ComparisonChart
                basePeriodData={basePeriodChartData}
                comparisonPeriodData={comparisonPeriodChartData}
                period={period}
                basePeriodLabel={basePeriodLabel}
                comparisonPeriodLabel={comparisonPeriodLabel}
              />
            </div>

            {/* Comparison Table */}
            <ComparisonTable
              basePeriodData={basePeriodData}
              comparisonPeriodData={comparisonPeriodData}
              basePeriodLabel={basePeriodLabel}
              comparisonPeriodLabel={comparisonPeriodLabel}
              onCogsUpdate={handleCogsUpdate}
            />
          </>
        )}
      </div>
    </LayoutWrapper>
  );
}
