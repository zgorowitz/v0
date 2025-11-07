import { format } from 'date-fns';

// Format money values
export const formatMoney = (value: number): string => {
  return `$${Math.round(value)?.toLocaleString()}`;
};

// Format percentage values
export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value?.toFixed(decimals)}%`;
};

// Format number values
export const formatNumber = (value: number): string => {
  return Math.round(value)?.toLocaleString();
};

// Column metadata for consistent table rendering
export interface ColumnMeta {
  id: string;
  label: string;
  isCurrency?: boolean;
  isPercent?: boolean;
  decimals?: number;
}

// Format cell value based on column metadata
export const formatCellValue = (value: number, meta: ColumnMeta): string => {
  if (meta.isCurrency) {
    return formatMoney(value);
  }
  if (meta.isPercent) {
    return formatPercent(value, meta.decimals);
  }
  return formatNumber(value);
};

// Export table data to CSV
export const exportToCSV = (
  rows: any[],
  columns: { id: string; label: string }[],
  filename: string
): void => {
  const headers = columns.map(col => col.label).join(',');

  const csvRows = rows.map(row =>
    columns.map(col => {
      const value = row[col.id];
      // Escape values containing commas
      return typeof value === 'string' && value.includes(',')
        ? `"${value}"`
        : value;
    }).join(',')
  );

  const csv = [headers, ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Common metric column definitions
export const METRIC_COLUMNS: ColumnMeta[] = [
  { id: 'item_orders', label: 'Orders', isCurrency: false },
  { id: 'item_units', label: 'Units', isCurrency: false },
  { id: 'item_sales', label: 'Sales', isCurrency: true },
  { id: 'item_discount', label: 'Discount', isCurrency: true },
  { id: 'item_fee', label: 'ML Fee', isCurrency: true },
  { id: 'item_cogs', label: 'Total COGS', isCurrency: true },
  { id: 'item_shipping_cost', label: 'Shipping Cost', isCurrency: true },
  { id: 'net_profit', label: 'Net Profit', isCurrency: true },
  { id: 'ad_cost', label: 'Ad Cost', isCurrency: true },
  { id: 'refund_amount', label: 'Refund Amount', isCurrency: true },
  { id: 'refund_units', label: 'Refund Units', isCurrency: false },
  { id: 'profit_margin', label: 'Margin', isPercent: true, decimals: 2 },
  { id: 'tacos', label: 'TACOS', isPercent: true, decimals: 2 },
  { id: 'fees_percent', label: 'Fees %', isPercent: true, decimals: 2 },
  { id: 'cogs_percent', label: 'COGS %', isPercent: true, decimals: 2 },
  { id: 'shipping_percent', label: 'Shipping %', isPercent: true, decimals: 2 },
];

// Daily/aggregated metric columns
export const DAILY_METRIC_COLUMNS: ColumnMeta[] = [
  { id: 'total_orders', label: 'Orders', isCurrency: false },
  { id: 'total_units', label: 'Units', isCurrency: false },
  { id: 'total_sales', label: 'Sales', isCurrency: true },
  { id: 'total_discount', label: 'Discount', isCurrency: true },
  { id: 'total_fee', label: 'ML Fee', isCurrency: true },
  { id: 'total_cogs', label: 'COGS', isCurrency: true },
  { id: 'total_shipping_cost', label: 'Shipping Cost', isCurrency: true },
  { id: 'gross_profit', label: 'Gross Profit', isCurrency: true },
  { id: 'net_profit', label: 'Net Profit', isCurrency: true },
  { id: 'ad_cost', label: 'Ad Cost', isCurrency: true },
  { id: 'refund_amount', label: 'Refund Amount', isCurrency: true },
  { id: 'refund_units', label: 'Refund Units', isCurrency: false },
  { id: 'profit_margin', label: 'Profit Margin', isPercent: true, decimals: 2 },
  { id: 'tacos', label: 'TACOS', isPercent: true, decimals: 2 },
  { id: 'fees_percent', label: 'Fees %', isPercent: true, decimals: 2 },
  { id: 'cogs_percent', label: 'COGS %', isPercent: true, decimals: 2 },
  { id: 'shipping_percent', label: 'Shipping %', isPercent: true, decimals: 2 },
];

// Get column metadata by ID
export const getColumnMeta = (columnId: string, columns: ColumnMeta[] = METRIC_COLUMNS): ColumnMeta | undefined => {
  return columns.find(col => col.id === columnId);
};
