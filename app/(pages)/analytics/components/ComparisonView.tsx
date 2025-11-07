import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ComparisonChart } from '@/app/(pages)/comparison/components/ComparisonChart';
import { ComparisonTable } from '@/app/(pages)/comparison/components/ComparisonTable';
import { fetchComparisonData, DashboardRow, DailySalesRow } from '../utils/dataFetchers';
import { useDataCache } from '../hooks/useDataCache';

interface ComparisonViewProps {
  itemIds: string[];
  basePeriod: DateRange;
  comparisonPeriod: DateRange;
  period: 'day' | 'week' | 'month';
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  itemIds,
  basePeriod,
  comparisonPeriod,
  period = 'day',
}) => {
  const [baseTableData, setBaseTableData] = useState<DashboardRow[]>([]);
  const [comparisonTableData, setComparisonTableData] = useState<DashboardRow[]>([]);
  const [baseChartData, setBaseChartData] = useState<DailySalesRow[]>([]);
  const [comparisonChartData, setComparisonChartData] = useState<DailySalesRow[]>([]);

  // Cache key
  const cacheKey = useMemo(() => {
    const itemsKey = itemIds.length > 0 ? itemIds.join(',') : 'all';
    const baseKey = `${basePeriod.from?.toISOString()}_${basePeriod.to?.toISOString()}`;
    const compKey = `${comparisonPeriod.from?.toISOString()}_${comparisonPeriod.to?.toISOString()}`;
    return `comparison_${itemsKey}_${baseKey}_${compKey}`;
  }, [itemIds, basePeriod, comparisonPeriod]);

  // Fetch data with caching
  const { data, loading } = useDataCache<{
    baseTableData: DashboardRow[];
    comparisonTableData: DashboardRow[];
    baseChartData: DailySalesRow[];
    comparisonChartData: DailySalesRow[];
  }>(
    cacheKey,
    async () => {
      if (!basePeriod.from || !basePeriod.to || !comparisonPeriod.from || !comparisonPeriod.to) {
        return {
          baseTableData: [],
          comparisonTableData: [],
          baseChartData: [],
          comparisonChartData: [],
        };
      }

      return fetchComparisonData(
        {
          start: basePeriod.from.toISOString().split('T')[0],
          end: basePeriod.to.toISOString().split('T')[0],
        },
        {
          start: comparisonPeriod.from.toISOString().split('T')[0],
          end: comparisonPeriod.to.toISOString().split('T')[0],
        },
        period,
        itemIds.length > 0 ? itemIds : null
      );
    },
    [basePeriod, comparisonPeriod, itemIds, period]
  );

  useEffect(() => {
    if (data) {
      setBaseTableData(data.baseTableData);
      setComparisonTableData(data.comparisonTableData);
      setBaseChartData(data.baseChartData);
      setComparisonChartData(data.comparisonChartData);
    }
  }, [data]);

  const handleCogsUpdate = (itemId: string, newValue: number) => {
    setBaseTableData(prev =>
      prev.map(item => (item.item_id === itemId ? { ...item, unit_cogs: newValue } : item))
    );
    setComparisonTableData(prev =>
      prev.map(item => (item.item_id === itemId ? { ...item, unit_cogs: newValue } : item))
    );
  };

  const basePeriodLabel = useMemo(() => {
    if (!basePeriod.from || !basePeriod.to) return '';
    return `${format(basePeriod.from, 'yyyy-MM-dd')} - ${format(basePeriod.to, 'yyyy-MM-dd')}`;
  }, [basePeriod]);

  const comparisonPeriodLabel = useMemo(() => {
    if (!comparisonPeriod.from || !comparisonPeriod.to) return '';
    return `${format(comparisonPeriod.from, 'yyyy-MM-dd')} - ${format(comparisonPeriod.to, 'yyyy-MM-dd')}`;
  }, [comparisonPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Comparison Chart */}
      <div className="mb-4">
        <ComparisonChart
          basePeriodData={baseChartData}
          comparisonPeriodData={comparisonChartData}
          period={period}
          basePeriodLabel={basePeriodLabel}
          comparisonPeriodLabel={comparisonPeriodLabel}
        />
      </div>

      {/* Comparison Table */}
      <ComparisonTable
        basePeriodData={baseTableData}
        comparisonPeriodData={comparisonTableData}
        basePeriodLabel={basePeriodLabel}
        comparisonPeriodLabel={comparisonPeriodLabel}
        onCogsUpdate={handleCogsUpdate}
      />
    </div>
  );
};
