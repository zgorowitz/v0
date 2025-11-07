import { itemSalesData, totalSalesDaily } from '@/lib/dashboard/data';
import { fetchCogsMap } from '@/lib/cogs/actions';

// Type definitions
export interface DashboardRow {
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

export interface DailySalesRow {
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

// Fetch item-level sales data with COGS
export const fetchItemSalesData = async (
  startDate: string,
  endDate: string,
  itemIds: string[] | null
): Promise<DashboardRow[]> => {
  const [salesData, cogsMap] = await Promise.all([
    itemSalesData(startDate, endDate, itemIds as any),
    fetchCogsMap(),
  ]);

  return (salesData || []).map((item: any) => ({
    ...item,
    unit_cogs: (cogsMap as any)[item.item_id] || 0,
  }));
};

// Fetch daily aggregated sales data
export const fetchDailySalesData = async (
  startDate: string,
  endDate: string,
  period: 'day' | 'week' | 'month',
  itemIds: string[] | null
): Promise<DailySalesRow[]> => {
  const data = await totalSalesDaily(startDate, endDate, period, itemIds as any);
  return data || [];
};

// Fetch data for comparison view (two periods)
export const fetchComparisonData = async (
  basePeriod: { start: string; end: string },
  comparisonPeriod: { start: string; end: string },
  period: 'day' | 'week' | 'month',
  itemIds: string[] | null
): Promise<{
  baseTableData: DashboardRow[];
  comparisonTableData: DashboardRow[];
  baseChartData: DailySalesRow[];
  comparisonChartData: DailySalesRow[];
}> => {
  const [baseTableData, compTableData, baseChartData, compChartData, cogsMap] = await Promise.all([
    itemSalesData(basePeriod.start, basePeriod.end, itemIds as any),
    itemSalesData(comparisonPeriod.start, comparisonPeriod.end, itemIds as any),
    totalSalesDaily(basePeriod.start, basePeriod.end, period, itemIds as any),
    totalSalesDaily(comparisonPeriod.start, comparisonPeriod.end, period, itemIds as any),
    fetchCogsMap(),
  ]);

  const mergeCogsData = (data: any[], cogs: any): DashboardRow[] => {
    return (data || []).map((item: any) => ({
      ...item,
      unit_cogs: (cogs as any)[item.item_id] || 0,
    }));
  };

  return {
    baseTableData: mergeCogsData(baseTableData, cogsMap),
    comparisonTableData: mergeCogsData(compTableData, cogsMap),
    baseChartData: baseChartData || [],
    comparisonChartData: compChartData || [],
  };
};
