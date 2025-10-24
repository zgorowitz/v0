"use client"

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { itemSalesData } from '@/lib/dashboard/data';
import { useMetricCards } from '@/lib/dashboard/useMetricCards';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { DateRange } from "react-day-picker"
import { Download, Settings2 } from "lucide-react"
import { format } from "date-fns"
import { DatePresetSelector, DatePresetValue, getPresetGroups } from '@/components/dashboard/DatePresetSelector';

interface DashboardRow {
  // family_name: string;
  item_id: string;
  item_orders: number;
  item_units: number;
  item_sales: number;
  gross_profit: number;
  item_discount: number;
  item_fee: number;
  item_cogs: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;
  
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

const DashboardContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsFilter = useItemsFilter();

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    thumbnail: true,
    item: true,
    units: true,
    sales: true,
    gross_profit: true,
    net_profit: true,
    ads: true,
    refunds: true,
    refund_cost: true,
    fee: true,
    discount: true,
    cogs: true,
    status: true,
  });

  // Debug: Log when itemsFilter changes
  useEffect(() => {
    console.log('[Dashboard] itemsFilter.appliedItemIds changed:', itemsFilter.appliedItemIds);
  }, [itemsFilter.appliedItemIds]);

  // Fix: Properly memoize the appliedItemIds array
  const appliedItemIds = useMemo(() => {
    console.log('[Dashboard] Memoizing appliedItemIds:', itemsFilter.appliedItemIds);
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]); // Use JSON.stringify for deep comparison

  // Card date ranges - array of 4 date ranges (initialized from URL or first preset group)
  const [cardDateRanges, setCardDateRanges] = useState<DatePresetValue[] | null>(() => {
    // Try to read from URL
    const datesParam = searchParams.get('dates');
    if (datesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(datesParam));
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse dates from URL:', e);
      }
    }
    // Default to first preset group
    const presetGroups = getPresetGroups();
    return presetGroups[0];
  });

  // Selected card index (determines table date range)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // Pass the memoized array and card date ranges to useMetricCards
  const { metricCards, loading: metricsLoading } = useMetricCards(appliedItemIds, cardDateRanges);

  // Table date range comes from selected card
  const [tableDataRange, setTableDataRange] = useState<DateRange | undefined>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: yesterday, to: yesterday };
  });

  // Update table date range when selected card changes
  useEffect(() => {
    if (metricCards.length > 0 && metricCards[selectedCardIndex]) {
      const card = metricCards[selectedCardIndex];
      if (card.startDate && card.endDate) {
        const from = new Date(card.startDate);
        const to = new Date(card.endDate);
        setTableDataRange({ from, to });
      }
    }
  }, [selectedCardIndex, metricCards]);

  // Fetch dashboard data
  useEffect(() => {
    console.log('[Dashboard] fetchDashboardData triggered by tableDataRange or appliedItemIds change');
    fetchDashboardData();
  }, [tableDataRange, appliedItemIds]);


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const startStr = tableDataRange?.from?.toISOString().split('T')[0];
    const endStr = tableDataRange?.to?.toISOString().split('T')[0];
    console.log("Fetching data from", startStr, "to", endStr, "with items:", appliedItemIds);
    const child_data = await itemSalesData(startStr, endStr, appliedItemIds);
    console.log("Fetched data:", child_data?.length || 0);
    setDashboardData(child_data || []);
    setLoading(false);
  }, [tableDataRange, appliedItemIds]);


  const formatMoney = (value: number) => `$${Math.round(value)?.toLocaleString()}`;

  const handlePresetSelect = (presets: DatePresetValue[]) => {
    setCardDateRanges(presets);

    // Update URL with selected dates
    const params = new URLSearchParams(searchParams.toString());
    params.set('dates', encodeURIComponent(JSON.stringify(presets)));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCardDateChange = (cardIndex: number, dateRange: DateRange) => {
    if (!dateRange.from || !dateRange.to || !cardDateRanges) return;

    // Convert DateRange to DatePresetValue
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    const newDatePreset: DatePresetValue = {
      start: formatDate(dateRange.from),
      end: formatDate(dateRange.to),
      label: `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`,
    };

    // Update the specific card's date range
    const updatedDateRanges = [...cardDateRanges];
    updatedDateRanges[cardIndex] = newDatePreset;
    setCardDateRanges(updatedDateRanges);

    // Update URL with new dates
    const params = new URLSearchParams(searchParams.toString());
    params.set('dates', encodeURIComponent(JSON.stringify(updatedDateRanges)));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDownload = () => {
    // Convert table data to CSV
    const headers = [
      columnVisibility.thumbnail && 'Thumbnail',
      columnVisibility.item && 'Item ID',
      columnVisibility.item && 'Title',
      columnVisibility.units && 'Units',
      columnVisibility.sales && 'Sales',
      columnVisibility.gross_profit && 'Gross Profit',
      columnVisibility.net_profit && 'Net Profit',
      columnVisibility.ads && 'Ads',
      columnVisibility.refunds && 'Refunds',
      columnVisibility.refund_cost && 'Refund Cost',
      columnVisibility.fee && 'Mercado-Libre Fee',
      columnVisibility.discount && 'Discount',
      columnVisibility.cogs && 'COGS',
      columnVisibility.status && 'Status',
    ].filter(Boolean).join(',');

    const rows = dashboardData.map(row => [
      columnVisibility.thumbnail && row.thumbnail,
      columnVisibility.item && row.item_id,
      columnVisibility.item && `"${row.title}"`,
      columnVisibility.units && row.item_units,
      columnVisibility.sales && row.item_sales,
      columnVisibility.gross_profit && row.gross_profit,
      columnVisibility.net_profit && row.net_profit,
      columnVisibility.ads && row.ad_cost,
      columnVisibility.refunds && row.refund_units,
      columnVisibility.refund_cost && row.refund_amount,
      columnVisibility.fee && row.item_fee,
      columnVisibility.discount && row.item_discount,
      columnVisibility.cogs && row.item_cogs,
      columnVisibility.status && row.status,
    ].filter(val => val !== false).join(','));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${format(tableDataRange?.from || new Date(), 'yyyy-MM-dd')}-to-${format(tableDataRange?.to || new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <LayoutWrapper>
      <div className="p-4">
        {/* Top Controls - Item Filter and Date Preset Selector */}
        <div className="flex justify-between items-center w-full mb-6 gap-4">
          <div className="min-w-[300px]">
            <ItemsFilter {...itemsFilter} />
          </div>
          <DatePresetSelector
            onPresetSelect={handlePresetSelect}
            selectedLabel="Select date range"
          />
        </div>

        {/* Metric Cards */}
        <MetricCards
          data={metricCards}
          loading={metricsLoading}
          selectedIndex={selectedCardIndex}
          onCardClick={setSelectedCardIndex}
          onCardDateChange={handleCardDateChange}
        />

        <div className="mt-4">
          {/* Table Controls - Only Column Settings and Download */}
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
                    checked={columnVisibility.thumbnail}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, thumbnail: checked }))}
                  >
                    Thumbnail
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.item}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, item: checked }))}
                  >
                    Item
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.units}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, units: checked }))}
                  >
                    Units
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.sales}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, sales: checked }))}
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
                    checked={columnVisibility.ads}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, ads: checked }))}
                  >
                    Ads
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.refunds}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, refunds: checked }))}
                  >
                    Refunds
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.refund_cost}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, refund_cost: checked }))}
                  >
                    Refund Cost
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.fee}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, fee: checked }))}
                  >
                    Mercado-Libre Fee
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.discount}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, discount: checked }))}
                  >
                    Discount
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.cogs}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, cogs: checked }))}
                  >
                    COGS
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.status}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, status: checked }))}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Download Button */}
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnVisibility.thumbnail && <TableHead></TableHead>}
                    {columnVisibility.item && <TableHead>Item</TableHead>}
                    {columnVisibility.units && <TableHead>Units</TableHead>}
                    {columnVisibility.sales && <TableHead>Sales</TableHead>}
                    {columnVisibility.gross_profit && <TableHead>Gross Profit</TableHead>}
                    {columnVisibility.net_profit && <TableHead>Net Profit</TableHead>}
                    {columnVisibility.ads && <TableHead>Ads</TableHead>}
                    {columnVisibility.refunds && <TableHead>Refunds</TableHead>}
                    {columnVisibility.refund_cost && <TableHead>Refund Cost</TableHead>}
                    {columnVisibility.fee && <TableHead>Mercado-Libre Fee</TableHead>}
                    {columnVisibility.discount && <TableHead>Discount</TableHead>}
                    {columnVisibility.cogs && <TableHead>COGS</TableHead>}
                    {columnVisibility.status && <TableHead>Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8">
                          Loading data...
                        </TableCell>
                      </TableRow>
                    ) : dashboardData.length > 0 ? (
                    dashboardData.map((row, index) => (
                      <TableRow key={row.item_id + index}>
                        {columnVisibility.thumbnail && (
                          <TableCell>
                            <img
                              src={row.thumbnail}
                              alt="Product"
                              style={{ width: '50px', height: '40px', objectFit: 'cover' }}
                            />
                          </TableCell>
                        )}
                        {columnVisibility.item && (
                          <TableCell>
                            <div>
                              <div style={{ fontSize: '11px', color: '#999' }}>{row.item_id}</div>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{row.title}</div>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.units && <TableCell>{row.item_units}</TableCell>}
                        {columnVisibility.sales && <TableCell>{formatMoney(row.item_sales)}</TableCell>}
                        {columnVisibility.gross_profit && <TableCell>{formatMoney(row.gross_profit)}</TableCell>}
                        {columnVisibility.net_profit && <TableCell>{formatMoney(row.net_profit)}</TableCell>}
                        {columnVisibility.ads && <TableCell>{formatMoney(row.ad_cost)}</TableCell>}
                        {columnVisibility.refunds && <TableCell>{row.refund_units}</TableCell>}
                        {columnVisibility.refund_cost && <TableCell>{formatMoney(row.refund_amount)}</TableCell>}
                        {columnVisibility.fee && <TableCell>{formatMoney(row.item_fee)}</TableCell>}
                        {columnVisibility.discount && <TableCell>{formatMoney(row.item_discount)}</TableCell>}
                        {columnVisibility.cogs && <TableCell>{formatMoney(row.item_cogs)}</TableCell>}
                        {columnVisibility.status && <TableCell>{row.status}</TableCell>}
                      </TableRow>
                    ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>

        </div>
      </div>
    </LayoutWrapper>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">Loading dashboard...</div>
        </div>
      </LayoutWrapper>
    }>
      <DashboardContent />
    </Suspense>
  );
}
