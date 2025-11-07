"use client"

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Download, Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { CogsEditDialog } from '@/components/dashboard/CogsEditDialog';
import { calculateDelta, formatDelta } from '../utils/comparisonUtils';

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

interface ComparisonTableProps {
  basePeriodData: DashboardRow[];
  comparisonPeriodData: DashboardRow[];
  basePeriodLabel: string;
  comparisonPeriodLabel: string;
  onCogsUpdate?: (itemId: string, newValue: number) => void;
}

interface MergedRow extends DashboardRow {
  comp_item_units: number;
  comp_item_sales: number;
  comp_net_profit: number;
  comp_ad_cost: number;
  comp_profit_margin: number;
  comp_item_fee: number;
  comp_item_cogs: number;
  comp_item_shipping_cost: number;
  comp_tacos: number;
  comp_fees_percent: number;
  comp_cogs_percent: number;
  comp_shipping_percent: number;
}

export function ComparisonTable({
  basePeriodData,
  comparisonPeriodData,
  basePeriodLabel,
  comparisonPeriodLabel,
  onCogsUpdate,
}: ComparisonTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    thumbnail: true,
    item_id: false,
    item: true,
    // Period A columns
    units_base: true,
    sales_base: true,
    net_profit_base: true,
    ads_base: false,
    profit_margin_base: true,
    fee_base: false,
    cogs_base: false,
    shipping_cost_base: false,
    tacos_base: true,
    fees_percent_base: false,
    cogs_percent_base: false,
    shipping_percent_base: false,
    // Period B columns (synced with A)
    units_comp: true,
    sales_comp: true,
    net_profit_comp: true,
    ads_comp: false,
    profit_margin_comp: true,
    fee_comp: false,
    cogs_comp: false,
    shipping_cost_comp: false,
    tacos_comp: true,
    fees_percent_comp: false,
    cogs_percent_comp: false,
    shipping_percent_comp: false,
    status: false,
  });

  // Custom visibility change handler to sync A and B columns
  const handleColumnVisibilityChange = (columnId: string, isVisible: boolean) => {
    setColumnVisibility(prev => {
      const newVisibility = { ...prev, [columnId]: isVisible };

      // Sync A and B columns
      if (columnId.endsWith('_base')) {
        const baseKey = columnId.replace('_base', '');
        const compKey = baseKey + '_comp';
        newVisibility[compKey] = isVisible;
      } else if (columnId.endsWith('_comp')) {
        const baseKey = columnId.replace('_comp', '');
        const compKey = baseKey + '_base';
        newVisibility[compKey] = isVisible;
      }

      return newVisibility;
    });
  };
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Merge base and comparison data
  const mergedData = useMemo<MergedRow[]>(() => {
    return basePeriodData.map((baseRow) => {
      const compRow = comparisonPeriodData.find(c => c.item_id === baseRow.item_id) || {} as DashboardRow;

      return {
        ...baseRow,
        comp_item_units: compRow.item_units || 0,
        comp_item_sales: compRow.item_sales || 0,
        comp_net_profit: compRow.net_profit || 0,
        comp_ad_cost: compRow.ad_cost || 0,
        comp_profit_margin: compRow.profit_margin || 0,
        comp_item_fee: compRow.item_fee || 0,
        comp_item_cogs: compRow.item_cogs || 0,
        comp_item_shipping_cost: compRow.item_shipping_cost || 0,
        comp_tacos: compRow.tacos || 0,
        comp_fees_percent: compRow.fees_percent || 0,
        comp_cogs_percent: compRow.cogs_percent || 0,
        comp_shipping_percent: compRow.shipping_percent || 0,
      };
    });
  }, [basePeriodData, comparisonPeriodData]);

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

  // Format value helper
  const formatValue = (value: number, isCurrency: boolean, isPercent: boolean) => {
    const safeValue = value ?? 0;
    if (isCurrency) return formatMoney(safeValue);
    if (isPercent) return `${safeValue.toFixed(2)}%`;
    return safeValue.toLocaleString();
  };

  // Delta cell component
  const DeltaCell = ({
    baseValue,
    compValue,
    isCurrency = false,
    isPercent = false
  }: {
    baseValue: number;
    compValue: number;
    isCurrency?: boolean;
    isPercent?: boolean;
  }) => {
    const safeBaseValue = baseValue ?? 0;
    const safeCompValue = compValue ?? 0;

    const delta = calculateDelta(safeBaseValue, safeCompValue);
    const isPositive = delta.absolute >= 0;
    const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';

    return (
      <div className={`text-sm ${deltaColor}`}>
        <div>{isPositive ? '+' : ''}{isCurrency ? formatMoney(delta.absolute) : delta.absolute.toFixed(0)}</div>
        <div className="text-xs">({isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%)</div>
      </div>
    );
  };

  // Column definitions
  const columns = useMemo<ColumnDef<MergedRow>[]>(
    () => [
      {
        id: 'thumbnail',
        accessorKey: 'thumbnail',
        header: '',
        cell: ({ getValue }) => (
          <img
            src={getValue() as string}
            alt="Product"
            style={{ width: '50px', height: '40px', objectFit: 'cover', padding: '2px', borderRadius: '6px' }}
          />
        ),
        enableSorting: false,
        meta: { noPadding: true },
      },
      { id: 'item_id', accessorKey: 'item_id', header: 'Item ID' },
      {
        id: 'item',
        accessorKey: 'title',
        header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
        cell: ({ row }) => (
          <div style={{ lineHeight: '1.2', padding: '8px' }}>
            <div style={{ fontSize: '11px', color: '#999' }}>{row.original.item_id}</div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
              {row.original.title}
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {formatMoney(row.original.price)} · Stock: {row.original.stock} · COGS:
              {onCogsUpdate && (
                <CogsEditDialog
                  itemId={row.original.item_id}
                  currentValue={row.original.unit_cogs || 0}
                  onUpdate={onCogsUpdate}
                />
              )}
            </div>
          </div>
        ),
        meta: { noPadding: true },
      },
      // Period A Columns
      {
        id: 'units_base',
        accessorKey: 'item_units',
        header: ({ column }) => <SortableHeader column={column}>Units (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.item_units ?? 0, row.original.comp_item_units ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.item_units, false, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'sales_base',
        accessorKey: 'item_sales',
        header: ({ column }) => <SortableHeader column={column}>Sales (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.item_sales ?? 0, row.original.comp_item_sales ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.item_sales, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'net_profit_base',
        accessorKey: 'net_profit',
        header: ({ column }) => <SortableHeader column={column}>Net Profit (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.net_profit ?? 0, row.original.comp_net_profit ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.net_profit, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'ads_base',
        accessorKey: 'ad_cost',
        header: ({ column }) => <SortableHeader column={column}>Ads (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.ad_cost ?? 0, row.original.comp_ad_cost ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.ad_cost, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'profit_margin_base',
        accessorKey: 'profit_margin',
        header: ({ column }) => <SortableHeader column={column}>Margin (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.profit_margin ?? 0, row.original.comp_profit_margin ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.profit_margin, false, true)}</div>
            </div>
          );
        },
      },
      {
        id: 'fee_base',
        accessorKey: 'item_fee',
        header: ({ column }) => <SortableHeader column={column}>ML Fee (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.item_fee ?? 0, row.original.comp_item_fee ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.item_fee, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'cogs_base',
        accessorKey: 'item_cogs',
        header: ({ column }) => <SortableHeader column={column}>Total COGS (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.item_cogs ?? 0, row.original.comp_item_cogs ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.item_cogs, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'shipping_cost_base',
        accessorKey: 'item_shipping_cost',
        header: ({ column }) => <SortableHeader column={column}>Shipping Cost (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.item_shipping_cost ?? 0, row.original.comp_item_shipping_cost ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.item_shipping_cost, true, false)}</div>
            </div>
          );
        },
      },
      {
        id: 'tacos_base',
        accessorKey: 'tacos',
        header: ({ column }) => <SortableHeader column={column}>TACOS (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.tacos ?? 0, row.original.comp_tacos ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.tacos, false, true)}</div>
            </div>
          );
        },
      },
      {
        id: 'fees_percent_base',
        accessorKey: 'fees_percent',
        header: ({ column }) => <SortableHeader column={column}>Fees % (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.fees_percent ?? 0, row.original.comp_fees_percent ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.fees_percent, false, true)}</div>
            </div>
          );
        },
      },
      {
        id: 'cogs_percent_base',
        accessorKey: 'cogs_percent',
        header: ({ column }) => <SortableHeader column={column}>COGS % (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.cogs_percent ?? 0, row.original.comp_cogs_percent ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.cogs_percent, false, true)}</div>
            </div>
          );
        },
      },
      {
        id: 'shipping_percent_base',
        accessorKey: 'shipping_percent',
        header: ({ column }) => <SortableHeader column={column}>Shipping % (A)</SortableHeader>,
        cell: ({ row }) => {
          const delta = calculateDelta(row.original.shipping_percent ?? 0, row.original.comp_shipping_percent ?? 0);
          const isPositive = delta.absolute >= 0;
          const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
          return (
            <div>
              <div className={`text-xs ${deltaColor}`}>
                {isPositive ? '+' : ''}{delta.percentage.toFixed(0)}%
              </div>
              <div>{formatValue(row.original.shipping_percent, false, true)}</div>
            </div>
          );
        },
      },
      // Period B Columns
      {
        id: 'units_comp',
        accessorKey: 'comp_item_units',
        header: ({ column }) => <SortableHeader column={column}>Units (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_item_units, false, false),
        meta: { hasDivider: true },
      },
      {
        id: 'sales_comp',
        accessorKey: 'comp_item_sales',
        header: ({ column }) => <SortableHeader column={column}>Sales (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_item_sales, true, false),
      },
      {
        id: 'net_profit_comp',
        accessorKey: 'comp_net_profit',
        header: ({ column }) => <SortableHeader column={column}>Net Profit (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_net_profit, true, false),
      },
      {
        id: 'ads_comp',
        accessorKey: 'comp_ad_cost',
        header: ({ column }) => <SortableHeader column={column}>Ads (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_ad_cost, true, false),
      },
      {
        id: 'profit_margin_comp',
        accessorKey: 'comp_profit_margin',
        header: ({ column }) => <SortableHeader column={column}>Margin (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_profit_margin, false, true),
      },
      {
        id: 'fee_comp',
        accessorKey: 'comp_item_fee',
        header: ({ column }) => <SortableHeader column={column}>ML Fee (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_item_fee, true, false),
      },
      {
        id: 'cogs_comp',
        accessorKey: 'comp_item_cogs',
        header: ({ column }) => <SortableHeader column={column}>Total COGS (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_item_cogs, true, false),
      },
      {
        id: 'shipping_cost_comp',
        accessorKey: 'comp_item_shipping_cost',
        header: ({ column }) => <SortableHeader column={column}>Shipping Cost (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_item_shipping_cost, true, false),
      },
      {
        id: 'tacos_comp',
        accessorKey: 'comp_tacos',
        header: ({ column }) => <SortableHeader column={column}>TACOS (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_tacos, false, true),
      },
      {
        id: 'fees_percent_comp',
        accessorKey: 'comp_fees_percent',
        header: ({ column }) => <SortableHeader column={column}>Fees % (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_fees_percent, false, true),
      },
      {
        id: 'cogs_percent_comp',
        accessorKey: 'comp_cogs_percent',
        header: ({ column }) => <SortableHeader column={column}>COGS % (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_cogs_percent, false, true),
      },
      {
        id: 'shipping_percent_comp',
        accessorKey: 'comp_shipping_percent',
        header: ({ column }) => <SortableHeader column={column}>Shipping % (B)</SortableHeader>,
        cell: ({ row }) => formatValue(row.original.comp_shipping_percent, false, true),
      },
      { id: 'status', accessorKey: 'status', header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader> },
    ],
    [onCogsUpdate]
  );

  // Initialize table
  const table = useReactTable({
    data: mergedData,
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

  const handleDownload = () => {
    const visibleColumns = table.getAllLeafColumns().filter(col => col.getIsVisible());
    const headers = visibleColumns.map(col => {
      const id = col.id;
      return id === 'thumbnail' ? 'Thumbnail' :
             id === 'item_id' ? 'Item ID' :
             id === 'item' ? 'Item' :
             id === 'units' ? 'Units (Base),Units (Comp),Delta' :
             id === 'sales' ? 'Sales (Base),Sales (Comp),Delta' :
             id === 'net_profit' ? 'Net Profit (Base),Net Profit (Comp),Delta' :
             id === 'ads' ? 'Ads (Base),Ads (Comp),Delta' :
             id === 'profit_margin' ? 'Margin (Base),Margin (Comp),Delta' :
             id;
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
    a.download = `comparison-${basePeriodLabel}-vs-${comparisonPeriodLabel}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      {/* Table Controls */}
      <div className="flex justify-between items-center w-full mb-2">
        <div className="text-sm text-muted-foreground">
          {basePeriodLabel} vs {comparisonPeriodLabel}
        </div>
        <div className="flex gap-1">
          {/* Column Customization Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 border-0">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[80vh] overflow-y-auto grid grid-cols-2 gap-x-4 p-2 w-[500px]">
              {table.getAllLeafColumns()
                .filter((column) => {
                  // Only show Period A columns, hide Period B columns, thumbnail, and item (they should always be visible)
                  return !column.id.endsWith('_comp') && column.id !== 'thumbnail' && column.id !== 'item';
                })
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => handleColumnVisibilityChange(column.id, !!value)}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    {column.id === 'thumbnail' ? 'Thumbnail' :
                     column.id === 'item_id' ? 'Item ID' :
                     column.id === 'item' ? 'Item' :
                     column.id === 'units_base' ? 'Units' :
                     column.id === 'sales_base' ? 'Sales' :
                     column.id === 'net_profit_base' ? 'Net Profit' :
                     column.id === 'ads_base' ? 'Ads' :
                     column.id === 'profit_margin_base' ? 'Margin' :
                     column.id === 'fee_base' ? 'ML Fee' :
                     column.id === 'cogs_base' ? 'Total COGS' :
                     column.id === 'shipping_cost_base' ? 'Shipping Cost' :
                     column.id === 'tacos_base' ? 'TACOS' :
                     column.id === 'fees_percent_base' ? 'Fees %' :
                     column.id === 'cogs_percent_base' ? 'COGS %' :
                     column.id === 'shipping_percent_base' ? 'Shipping %' :
                     column.id === 'status' ? 'Status' : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download Button */}
          <Button variant="ghost" size="icon" className="h-7 w-7 border-0" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto relative">
        <Table style={{ width: '100%' }}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-muted"
                    style={{
                      position: 'relative',
                      borderLeft: header.column.columnDef.meta?.hasDivider ? '1px solid #e5e7eb' : undefined,
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
                      style={{ userSelect: 'none' }}
                    />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        padding: cell.column.columnDef.meta?.noPadding ? '0' : '8px 12px',
                        verticalAlign: 'top',
                        borderLeft: cell.column.columnDef.meta?.hasDivider ? '1px solid #e5e7eb' : undefined,
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
  );
}
