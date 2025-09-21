import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ColumnSelector, ExportButton } from '@/components/ui/table-controls';

export const SimpleTable = ({
  data = [],
  columns = [],
  pageSize = 50,
  enableSorting = true,
  enablePagination = true,
  enableSearch = true,
  customControls = null,
  loading = false,
  getRowId = undefined,
  exportFilename = 'table_export',
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({});

  // Enhanced columns with sorting indicators
  const enhancedColumns = columns.map(col => ({
    ...col,
    header: ({ column }) => (
      <div
        style={{ 
          cursor: enableSorting && column.getCanSort() ? 'pointer' : 'default',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onClick={enableSorting ? column.getToggleSortingHandler() : undefined}
      >
        {col.header}
        {enableSorting && column.getCanSort() && (
          <span style={{ fontSize: '12px', opacity: column.getIsSorted() ? 1 : 0.2 }}>
            {column.getIsSorted() === 'asc' ? ' ⌃' :
             column.getIsSorted() === 'desc' ? ' ⌄' : ' ⌄'}
          </span>
        )}
      </div>
    ),
  }));

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableSearch ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    state: {
      globalFilter,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: { pageSize },
    },
  });

  return (
    <div>
      {/* Controls Row */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {enableSearch && (
          <div>
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '300px'
              }}
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                style={{ marginLeft: '8px', padding: '8px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Custom controls with full flex width */}
        {customControls && (
          <div style={{ flex: 1 }}>{customControls}</div>
        )}

        {/* Table Controls - Always visible at extreme right */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <ColumnSelector table={table} />
          <ExportButton table={table} filename={exportFilename} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div>
          <LoadingSpinner message="Loading data..." />
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    style={{
                      border: '1px solid #ddd', padding: '4px 8px', backgroundColor: '#e8f4fcff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px'
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{
                      border: '1px solid #ddd', padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px'
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {enablePagination && (
        <div style={{  marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between'
          }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              First
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              Next
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              Last
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              style={{ padding: '4px' }}
            >
              {[20, 50, 100].map(size => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            Showing {table.getRowModel().rows.length} of {table.getPreFilteredRowModel().rows.length} results
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTable;