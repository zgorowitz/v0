export function exportTableToCSV(table: any, filename: string = 'export') {
  // Get visible columns
  const visibleColumns = table.getAllColumns()
    .filter((col: any) => col.getIsVisible() && col.id !== 'actions')
    .map((col: any) => ({
      id: col.id,
      header: typeof col.columnDef.header === 'string'
        ? col.columnDef.header
        : col.columnDef.accessorKey || col.id
    }));

  // Get filtered and sorted rows
  const rows = table.getFilteredRowModel().rows;

  // Build CSV content
  const headers = visibleColumns.map((col: any) =>
    typeof col.header === 'string' ? col.header : col.id
  );

  const csvRows = [headers.join(',')];

  rows.forEach((row: any) => {
    const rowData = visibleColumns.map((col: any) => {
      const value = row.getValue(col.id);
      // Handle different value types
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(rowData.join(','));
  });

  // Create and download CSV file
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}