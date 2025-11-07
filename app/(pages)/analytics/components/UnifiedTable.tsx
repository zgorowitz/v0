import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowUp, ArrowDown } from 'lucide-react';
import { UnifiedTableControls } from './UnifiedTableControls';
import { ColumnMeta } from '../utils/tableUtils';

interface UnifiedTableProps {
  data: any[];
  columns: ColumnDef<any>[];
  columnMeta: ColumnMeta[];
  loading?: boolean;
  initialVisibility?: VisibilityState;
  filename?: string;
  onDownload?: () => void;
}

export const UnifiedTable: React.FC<UnifiedTableProps> = ({
  data,
  columns,
  columnMeta,
  loading = false,
  initialVisibility = {},
  filename = 'export.csv',
  onDownload,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const table = useReactTable({
    data,
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

  return (
    <>
      <UnifiedTableControls
        table={table}
        columns={columnMeta}
        filename={filename}
        onDownload={onDownload}
      />

      <div className="rounded-md border overflow-auto relative">
        {/* Loading spinner overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 pointer-events-none">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
          </div>
        )}

        <Table style={{ width: '100%' }}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="bg-muted"
                    style={{
                      position: 'relative',
                    }}
                  >
                    <div
                      className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('columnId', header.column.id);
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const draggedColumnId = e.dataTransfer.getData('columnId');
                        const targetColumnId = header.column.id;

                        if (draggedColumnId !== targetColumnId) {
                          const newColumnOrder = [
                            ...(table.getState().columnOrder.length
                              ? table.getState().columnOrder
                              : table.getAllLeafColumns().map(c => c.id)),
                          ];
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
              // Show skeleton rows
              [...Array(10)].map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {table.getVisibleLeafColumns().map(column => (
                    <TableCell key={column.id}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{
                        padding: cell.column.columnDef.meta?.noPadding ? '0' : undefined,
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
    </>
  );
};

// Sortable header component helper
export const SortableHeader = ({ column, children }: { column: any; children: React.ReactNode }) => (
  <div
    className="flex items-center cursor-pointer select-none"
    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
  >
    {children}
    {column.getIsSorted() === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : column.getIsSorted() === 'desc' ? (
      <ArrowDown className="ml-2 h-4 w-4" />
    ) : null}
  </div>
);
