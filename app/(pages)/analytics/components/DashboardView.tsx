import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { CogsEditDialog } from '@/components/dashboard/CogsEditDialog';
import { useMetricCards } from '@/lib/dashboard/useMetricCards';
import { UnifiedTable, SortableHeader } from './UnifiedTable';
import { fetchItemSalesData, DashboardRow } from '../utils/dataFetchers';
import { formatMoney, formatPercent, METRIC_COLUMNS, ColumnMeta } from '../utils/tableUtils';
import { useDataCache } from '../hooks/useDataCache';
import { DatePresetValue, getPresetGroups } from '../utils/dateUtils';

interface DashboardViewProps {
  itemIds: string[];
  cardDateRanges: DatePresetValue[];
  selectedCardIndex: number;
  onCardDateChange: (cardIndex: number, dateRange: DateRange) => void;
  onSelectedCardChange: (index: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  itemIds,
  cardDateRanges,
  selectedCardIndex,
  onCardDateChange,
  onSelectedCardChange,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([]);

  // Table date range from selected card
  const tableDataRange = useMemo<DateRange>(() => {
    if (cardDateRanges && cardDateRanges[selectedCardIndex]) {
      const card = cardDateRanges[selectedCardIndex];
      return {
        from: new Date(card.start),
        to: new Date(card.end),
      };
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: yesterday, to: yesterday };
  }, [cardDateRanges, selectedCardIndex]);

  // Metric cards
  const { metricCards, loading: metricsLoading } = useMetricCards(itemIds, cardDateRanges);

  // Cache key for dashboard data
  const cacheKey = useMemo(() => {
    const itemsKey = itemIds.length > 0 ? itemIds.join(',') : 'all';
    const dateKey = `${tableDataRange.from?.toISOString()}_${tableDataRange.to?.toISOString()}`;
    return `dashboard_${itemsKey}_${dateKey}`;
  }, [itemIds, tableDataRange]);

  // Fetch data with caching
  const { data, loading } = useDataCache<DashboardRow[]>(
    cacheKey,
    async () => {
      const startStr = tableDataRange.from?.toISOString().split('T')[0] || '';
      const endStr = tableDataRange.to?.toISOString().split('T')[0] || '';
      return fetchItemSalesData(startStr, endStr, itemIds.length > 0 ? itemIds : null);
    },
    [tableDataRange, itemIds]
  );

  useEffect(() => {
    if (data) {
      setDashboardData(data);
    }
  }, [data]);

  // Column definitions
  const columns = useMemo<ColumnDef<DashboardRow>[]>(
    () => [
      {
        id: 'thumbnail',
        accessorKey: 'thumbnail',
        header: '',
        cell: ({ getValue }) => (
          <img
            src={getValue() as string}
            alt="Product"
            style={{
              width: '50px',
              height: '40px',
              objectFit: 'cover',
              padding: '2px',
              borderRadius: '6px',
            }}
          />
        ),
        enableSorting: false,
        meta: { noPadding: true },
      },
      {
        id: 'item',
        accessorKey: 'title',
        header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
        cell: ({ row }) => (
          <div style={{ lineHeight: '1.2', padding: '8px' }}>
            <div style={{ fontSize: '11px', color: '#999' }}>{row.original.item_id}</div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '300px',
              }}
            >
              {row.original.title}
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {formatMoney(row.original.price)} · Stock: {row.original.stock} · COGS:
              <CogsEditDialog
                itemId={row.original.item_id}
                currentValue={row.original.unit_cogs || 0}
                onUpdate={(itemId, newValue) => {
                  setDashboardData(prev =>
                    prev.map(item =>
                      item.item_id === itemId ? { ...item, unit_cogs: newValue } : item
                    )
                  );
                }}
              />
            </div>
          </div>
        ),
        meta: { noPadding: true },
      },
      {
        id: 'item_units',
        accessorKey: 'item_units',
        header: ({ column }) => <SortableHeader column={column}>Units</SortableHeader>,
      },
      {
        id: 'item_sales',
        accessorKey: 'item_sales',
        header: ({ column }) => <SortableHeader column={column}>Sales</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'net_profit',
        accessorKey: 'net_profit',
        header: ({ column }) => <SortableHeader column={column}>Net Profit</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'ad_cost',
        accessorKey: 'ad_cost',
        header: ({ column }) => <SortableHeader column={column}>Ads</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'refund_units',
        accessorKey: 'refund_units',
        header: ({ column }) => <SortableHeader column={column}>Refunds</SortableHeader>,
      },
      {
        id: 'refund_amount',
        accessorKey: 'refund_amount',
        header: ({ column }) => <SortableHeader column={column}>Refund Cost</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'item_fee',
        accessorKey: 'item_fee',
        header: ({ column }) => <SortableHeader column={column}>ML Fee</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'item_discount',
        accessorKey: 'item_discount',
        header: ({ column }) => <SortableHeader column={column}>Discount</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'item_cogs',
        accessorKey: 'item_cogs',
        header: ({ column }) => <SortableHeader column={column}>Total COGS</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'item_shipping_cost',
        accessorKey: 'item_shipping_cost',
        header: ({ column }) => <SortableHeader column={column}>Shipping Cost</SortableHeader>,
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: 'profit_margin',
        accessorKey: 'profit_margin',
        header: ({ column }) => <SortableHeader column={column}>Margin</SortableHeader>,
        cell: ({ getValue }) => formatPercent(getValue() as number, 2),
      },
      {
        id: 'tacos',
        accessorKey: 'tacos',
        header: ({ column }) => <SortableHeader column={column}>TACOS</SortableHeader>,
        cell: ({ getValue }) => formatPercent(getValue() as number, 2),
      },
      {
        id: 'fees_percent',
        accessorKey: 'fees_percent',
        header: ({ column }) => <SortableHeader column={column}>Fees %</SortableHeader>,
        cell: ({ getValue }) => formatPercent(getValue() as number, 2),
      },
      {
        id: 'cogs_percent',
        accessorKey: 'cogs_percent',
        header: ({ column }) => <SortableHeader column={column}>COGS %</SortableHeader>,
        cell: ({ getValue }) => formatPercent(getValue() as number, 2),
      },
      {
        id: 'shipping_percent',
        accessorKey: 'shipping_percent',
        header: ({ column }) => <SortableHeader column={column}>Shipping %</SortableHeader>,
        cell: ({ getValue }) => formatPercent(getValue() as number, 2),
      },
    ],
    []
  );

  const columnMeta: ColumnMeta[] = [
    { id: 'thumbnail', label: 'Thumbnail' },
    { id: 'item', label: 'Item' },
    ...METRIC_COLUMNS,
  ];

  const initialVisibility = {
    thumbnail: true,
    item: true,
    item_units: true,
    item_sales: true,
    net_profit: true,
    ad_cost: true,
    refund_units: true,
    refund_amount: false,
    item_fee: true,
    item_discount: false,
    item_cogs: true,
    item_shipping_cost: true,
    profit_margin: true,
    tacos: true,
    fees_percent: true,
    cogs_percent: true,
    shipping_percent: true,
  };

  return (
    <div>
      {/* Metric Cards */}
      <MetricCards
        data={metricCards}
        loading={metricsLoading}
        selectedIndex={selectedCardIndex}
        onCardClick={onSelectedCardChange}
        onCardDateChange={onCardDateChange}
      />

      {/* Table */}
      <div className="mt-4">
        <UnifiedTable
          data={dashboardData}
          columns={columns}
          columnMeta={columnMeta}
          loading={loading}
          initialVisibility={initialVisibility}
          filename={`dashboard-${format(tableDataRange.from || new Date(), 'yyyy-MM-dd')}-to-${format(
            tableDataRange.to || new Date(),
            'yyyy-MM-dd'
          )}.csv`}
        />
      </div>
    </div>
  );
};
