import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

export const SimpleTable = ({
  data = [],
  columns = [],
  pageSize = 50,
  enableSorting = true,
  enablePagination = true,
  enableSearch = true,
}) => {
  const [globalFilter, setGlobalFilter] = useState('');

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
          <span>
            {column.getIsSorted() === 'asc' ? ' ↑' : 
             column.getIsSorted() === 'desc' ? ' ↓' : ' ↕'}
          </span>
        )}
      </div>
    ),
  }));

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableSearch ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: { pageSize },
    },
  });

  return (
    <div>
      {/* Search */}
      {enableSearch && (
        <div style={{ marginBottom: '12px' }}>
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

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    textAlign: 'left'
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
                    border: '1px solid #ddd',
                    padding: '8px'
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {enablePagination && (
        <div style={{ 
          marginTop: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          justifyContent: 'space-between'
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