"use client"

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { itemSalesData } from '@/lib/dashboard/data';
import { fetchCogsMap } from '@/lib/cogs/actions';
import { useMetricCards } from '@/lib/dashboard/useMetricCards';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { CogsEditDialog } from '@/components/dashboard/CogsEditDialog';
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
import {
  ColumnDef,
  ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  ColumnOrderState,
} from "@tanstack/react-table"
import { DateRange } from "react-day-picker"
import { Download, Settings2, ArrowUp, ArrowDown } from "lucide-react"
import { format } from "date-fns"
import { DatePresetSelector, DatePresetValue, getPresetGroups } from '@/components/dashboard/DatePresetSelector';

interface DashboardRow {
  // family_name: string;
  item_id: string;
  item_orders: number;
  item_units: number;
  item_sales: number;
  // gross_profit: number;
  item_discount: number;
  item_fee: number;
  item_cogs: number;
  item_shipping_cost: number;
  net_profit: number;
  ad_cost: number;
  refund_amount: number;
  refund_units: number;

  // New calculated metrics
  profit_margin: number;
  tacos: number;
  fees_percent: number;
  // refund_rate: number;

  title: string;
  price: number;
  stock: number;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  sub_status: string;

  // Unit COGS from cogs table
  unit_cogs?: number;

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

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    thumbnail: true,
    item_id: false,
    item: true,
    units: true,
    sales: true,
    // gross_profit: false,
    net_profit: true,
    ads: true,
    refunds: true,
    refund_cost: false,
    fee: true,
    discount: false,
    cogs: true,
    // unit_cogs: true,
    shipping_cost: true,
    profit_margin: true,
    tacos: true,
    fees_percent: true,
    // refund_rate: true,
    status: false,
  });
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Format money helper
  const formatMoney = (value: number) => `$${Math.round(value)?.toLocaleString()}`;

  // Sortable header component
  const SortableHeader = ({ column, children }: { column: any; children: React.ReactNode }) => (
    <div
      className="flex items-center cursor-pointer select-none"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : null}
    </div>
  );

  // Column definitions
  const columns = useMemo<ColumnDef<DashboardRow>[]>(
    () => [
      {
        id: 'thumbnail', accessorKey: 'thumbnail', header: '',
        cell: ({ getValue }) => <img src={getValue() as string} alt="Product" style={{ width: '50px', height: '40px', objectFit: 'cover',  padding: '2px', borderRadius: '6px'  }} />,
        enableSorting: false, size: 70, meta: { noPadding: true },
      },
      { id: 'item_id', accessorKey: 'item_id', header: 'Item ID', size: 120, },
      {
        id: 'item',
        accessorKey: 'title',
        header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
        cell: ({ row }) => (
          <div style={{ lineHeight: '1.2', padding: '8px' }}>
            <div style={{ fontSize: '11px', color: '#999' }}>{row.original.item_id}</div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{row.original.title}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{formatMoney(row.original.price)} · Stock: {row.original.stock} · COGS:       
            {   <CogsEditDialog
                  itemId={row.original.item_id}
                  currentValue={row.original.unit_cogs || 0}
                  onUpdate={(itemId, newValue) => {
                    setDashboardData(prev => prev.map(item =>
                      item.item_id === itemId ? { ...item, unit_cogs: newValue } : item
                    ));
                  }}
                />
            }
            
            </div> 
          </div>
        ),
        size: 350,
        meta: { noPadding: true },
      },
      { id: 'units', accessorKey: 'item_units', header: ({ column }) => <SortableHeader column={column}>Units</SortableHeader>, size: 100 },
      { id: 'sales', accessorKey: 'item_sales', header: ({ column }) => <SortableHeader column={column}>Sales</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 120 },
      // { id: 'gross_profit', accessorKey: 'gross_profit', header: ({ column }) => <SortableHeader column={column}>Gross Profit</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 140 },
      { id: 'net_profit', accessorKey: 'net_profit', header: ({ column }) => <SortableHeader column={column}>Net Profit</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 130 },
      { id: 'ads', accessorKey: 'ad_cost', header: ({ column }) => <SortableHeader column={column}>Ads</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 100 },
      { id: 'refunds', accessorKey: 'refund_units', header: ({ column }) => <SortableHeader column={column}>Refunds</SortableHeader>, size: 110 },
      { id: 'refund_cost', accessorKey: 'refund_amount', header: ({ column }) => <SortableHeader column={column}>Refund Cost</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 140 },
      { id: 'fee', accessorKey: 'item_fee', header: ({ column }) => <SortableHeader column={column}>Mercado-Libre Fee</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 180 },
      { id: 'discount', accessorKey: 'item_discount', header: ({ column }) => <SortableHeader column={column}>Discount</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 120 },
      { id: 'cogs', accessorKey: 'item_cogs', header: ({ column }) => <SortableHeader column={column}>Total COGS</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 120 },
      { id: 'shipping_cost', accessorKey: 'item_shipping_cost', header: ({ column }) => <SortableHeader column={column}>Shipping Cost</SortableHeader>, cell: ({ getValue }) => formatMoney(getValue() as number), size: 140 },
      { id: 'profit_margin', accessorKey: 'profit_margin', header: ({ column }) => <SortableHeader column={column}>Margin</SortableHeader>, cell: ({ getValue }) => `${(getValue() as number)?.toFixed(2)}%`, size: 140 },
      { id: 'tacos', accessorKey: 'tacos', header: ({ column }) => <SortableHeader column={column}>TACOS</SortableHeader>, cell: ({ getValue }) => `${(getValue() as number)?.toFixed(2)}%`, size: 110 },
      { id: 'fees_percent', accessorKey: 'fees_percent', header: ({ column }) => <SortableHeader column={column}>Fees %</SortableHeader>, cell: ({ getValue }) => `${(getValue() as number)?.toFixed(2)}%`, size: 110 },
      // { id: 'refund_rate', accessorKey: 'refund_rate', header: ({ column }) => <SortableHeader column={column}>Refund Rate</SortableHeader>, cell: ({ getValue }) => `${(getValue() as number)?.toFixed(2)}%`, size: 130 },
      { id: 'status', accessorKey: 'status', header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>, size: 120 },
    ],
    []
  );

  // Initialize table
  const table = useReactTable({
    data: dashboardData,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    enableColumnResizing: true,
    columnResizeMode,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Debug: Log when itemsFilter changes
  // useEffect(() => {
  //   console.log('[Dashboard] itemsFilter.appliedItemIds changed:', itemsFilter.appliedItemIds);
  // }, [itemsFilter.appliedItemIds]);

  // Fix: Properly memoize the appliedItemIds array
  const appliedItemIds = useMemo(() => {
    console.log('[Dashboard] Memoizing appliedItemIds:', itemsFilter.appliedItemIds);
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]); // Use JSON.stringify for deep comparison

  // Card date ranges (from URL or first preset group)
  const [cardDateRanges, setCardDateRanges] = useState<DatePresetValue[] | null>(() => {
    // Try to read from URL
    const datesParam = searchParams.get('dates');
    if (datesParam) {
        const parsed = JSON.parse(decodeURIComponent(datesParam));
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed;
        }
    }
    // Default to first preset group
    const presetGroups = getPresetGroups();
    return presetGroups[0];
  });

  // Selected card index (determines table date range)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  const { metricCards, loading: metricsLoading } = useMetricCards(appliedItemIds, cardDateRanges);

  // Table date range
  const [tableDataRange, setTableDataRange] = useState<DateRange | undefined>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: yesterday, to: yesterday };
  });

  // Update table when card changes
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
    fetchDashboardData();
  }, [tableDataRange, appliedItemIds]);


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const startStr = tableDataRange?.from?.toISOString().split('T')[0];
    const endStr = tableDataRange?.to?.toISOString().split('T')[0];
    console.log("Fetching data from", startStr, "to", endStr, "with items:", appliedItemIds);

    // Fetch dashboard data and COGS map in parallel
    const [child_data, cogsMap] = await Promise.all([
      itemSalesData(startStr, endStr, (appliedItemIds?.length ? appliedItemIds : null) as any),
      fetchCogsMap()
    ]);

    console.log("Fetched data:", child_data?.length || 0);

    // Merge COGS data into dashboard data
    const mergedData = (child_data || []).map((item: any) => ({
      ...item,
      unit_cogs: (cogsMap as any)[item.item_id] || 0
    }));

    setDashboardData(mergedData);
    setLoading(false);
  }, [tableDataRange, appliedItemIds]);

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
    const visibleColumns = table.getAllLeafColumns().filter(col => col.getIsVisible());
    const headers = visibleColumns.map(col => {
      const id = col.id;
      return id === 'thumbnail' ? 'Thumbnail' :
             id === 'item_id' ? 'Item ID' :
             id === 'item' ? 'Item' :
             id === 'units' ? 'Units' :
             id === 'sales' ? 'Sales' :
            //  id === 'gross_profit' ? 'Gross Profit' :
             id === 'net_profit' ? 'Net Profit' :
             id === 'ads' ? 'Ads' :
             id === 'refunds' ? 'Refunds' :
             id === 'refund_cost' ? 'Refund Cost' :
             id === 'fee' ? 'Mercado-Libre Fee' :
             id === 'discount' ? 'Discount' :
             id === 'cogs' ? 'Total COGS' :
             id === 'unit_cogs' ? 'Unit COGS' :
             id === 'shipping_cost' ? 'Shipping Cost' :
             id === 'profit_margin' ? 'Margin' :
             id === 'tacos' ? 'TACOS' :
             id === 'fees_percent' ? 'Fees %' :
            //  id === 'refund_rate' ? 'Refund Rate' :
             id === 'status' ? 'Status' : id;
    }).join(',');

    const rows = table.getRowModel().rows.map(row =>
      visibleColumns.map(col => {
        const value = row.getValue(col.id);
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

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
                <DropdownMenuContent align="end" className="max-h-[80vh] overflow-y-auto grid grid-cols-2 gap-x-4 p-2 w-[500px]">
                  {table.getAllLeafColumns().map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      {column.id === 'thumbnail' ? 'Thumbnail' :
                       column.id === 'item_id' ? 'Item ID' :
                       column.id === 'item' ? 'Item' :
                       column.id === 'units' ? 'Units' :
                       column.id === 'sales' ? 'Sales' :
                      //  column.id === 'gross_profit' ? 'Gross Profit' :
                       column.id === 'net_profit' ? 'Net Profit' :
                       column.id === 'ads' ? 'Ads' :
                       column.id === 'refunds' ? 'Refunds' :
                       column.id === 'refund_cost' ? 'Refund Cost' :
                       column.id === 'fee' ? 'Mercado-Libre Fee' :
                       column.id === 'discount' ? 'Discount' :
                       column.id === 'cogs' ? 'Total COGS' :
                       column.id === 'unit_cogs' ? 'Unit COGS' :
                       column.id === 'shipping_cost' ? 'Shipping Cost' :
                       column.id === 'profit_margin' ? 'Margin' :
                       column.id === 'tacos' ? 'TACOS' :
                       column.id === 'fees_percent' ? 'Fees %' :
                      //  column.id === 'refund_rate' ? 'Refund Rate' :
                       column.id === 'status' ? 'Status' : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Download Button */}
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
            <div className="rounded-md border overflow-auto">
              <Table style={{ width: table.getTotalSize() }}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{
                            width: header.getSize(),
                            position: 'relative',
                          }}
                        >
                          <div
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('columnId', header.column.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const draggedColumnId = e.dataTransfer.getData('columnId');
                              const targetColumnId = header.column.id;

                              if (draggedColumnId !== targetColumnId) {
                                const newColumnOrder = [...table.getState().columnOrder.length ? table.getState().columnOrder : table.getAllLeafColumns().map(c => c.id)];
                                const draggedIndex = newColumnOrder.indexOf(draggedColumnId);
                                const targetIndex = newColumnOrder.indexOf(targetColumnId);

                                newColumnOrder.splice(draggedIndex, 1);
                                newColumnOrder.splice(targetIndex, 0, draggedColumnId);

                                setColumnOrder(newColumnOrder);
                              }
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none ${
                              header.column.getIsResizing() ? 'bg-blue-500' : 'hover:bg-gray-300'
                            }`}
                            style={{
                              userSelect: 'none',
                            }}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-8">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{
                              width: cell.column.getSize(),
                              padding: cell.column.columnDef.meta?.noPadding ? '0' : undefined
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center">
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
