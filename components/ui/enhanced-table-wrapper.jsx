// components/ui/enhanced-table-wrapper.jsx
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronUp, X, RotateCcw, Settings, Search } from 'lucide-react';

// Enhanced Table Styles
const TABLE_STYLES = `
  .enhanced-table-container {
    overflow: hidden;
    width: 100%;
  }
  
  .enhanced-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    color: #070707;
    font-family: "Helvetica Neue", Arial, sans-serif;
    table-layout: fixed;
  }
  
  .enhanced-table-header {
    background-color: #f8f9fa;
  }
  
  .enhanced-table-header th {
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    color: #171717;
    position: relative;
  }
  
  .enhanced-table-header th:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    bottom: 25%;
    width: 1px;
    background-color: #d1d5db;
  }
  
  .enhanced-table-header th.sortable {
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .enhanced-table-header th.sortable:hover {
    background-color: #e5e7eb;
  }
  
  .enhanced-table-header th .resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    height: 100%;
    width: 4px;
    background-color: transparent;
    cursor: col-resize;
    touch-action: none;
    transition: background-color 0.2s;
    z-index: 1;
  }
  
  .enhanced-table-header th .resize-handle:hover {
    background-color: #3b82f6;
  }
  
  .enhanced-table-row {
    transition: background-color 0.2s;
  }
  
  .enhanced-table-row:hover {
    background-color: #f9fafb;
  }
  
  .enhanced-table-cell {
    padding: 4px 12px;
    color: #374151;
    vertical-align: middle;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 0;
    border-bottom: 1px solid #cdd0d5ff;
  }
  

  
  .expand-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: none;
    background-color: #f3f4f6;
    cursor: pointer;
    transition: all 0.2s;
    color: #6b7280;
  }
  
  .expand-button:hover {
    background-color: #e5e7eb;
    color: #374151;
    transform: scale(1.05);
  }
  
  .filter-container {
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 16px;
  }
  
  .filter-input {
    background-color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    transition: all 0.2s;
    width: 100%;
  }
  
  .filter-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  .filter-select {
    background-color: white;
    color: #374151;
    border: none;
    border-radius: 8px;
    padding: 6px 16px;
    width: 150px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
    background-position: right 12px center;
    background-repeat: no-repeat;
    background-size: 16px;
    padding-right: 40px;
  }
  
  .filter-select:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
    background-color: #4b5563;
    color: white;
  }
  
  .control-button {
    background-color: white;
    color: black;
    border: none !important;
    border-radius: 8px;
    padding: 6px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .control-button:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  .pagination-container {
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: between;
    gap: 16px;
  }
  
  .pagination-button {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .pagination-button:hover:not(:disabled) {
    background-color: #f3f4f6;
  }
  
  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-info {
    font-size: 14px;
    color: #6b7280;
  }

  .column-selector-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .column-selector-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    display: flex;
    overflow: hidden;
  }

  .column-selector-left {
    flex: 1;
    padding: 24px;
    border-right: 1px solid #e5e7eb;
  }

  .column-selector-right {
    flex: 1;
    padding: 24px;
    background-color: #f9fafb;
  }

  .column-selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .column-selector-title {
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }

  .column-selector-close {
    background: none;
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
  }

  .column-selector-close:hover {
    background-color: #f3f4f6;
    color: #374151;
  }

  .column-search {
    position: relative;
    margin-bottom: 16px;
  }

  .column-search-input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background-color: #f9fafb;
  }

  .column-search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .column-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
  }

  .column-select-all {
    color: #3b82f6;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .column-select-all:hover {
    text-decoration: underline;
  }

  .column-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    cursor: pointer;
  }

  .column-item:hover {
    background-color: rgba(59, 130, 246, 0.05);
    margin: 0 -12px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 6px;
  }

  .column-checkbox {
    width: 16px;
    height: 16px;
    border: 2px solid #d1d5db;
    border-radius: 4px;
    background: white;
    position: relative;
    transition: all 0.2s;
  }

  .column-checkbox.checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .column-checkbox.checked::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 12px;
    font-weight: bold;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .column-label {
    font-size: 14px;
    color: #374151;
    flex-1;
  }

  .selected-columns-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .selected-count {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .remove-all-btn {
    color: #3b82f6;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .remove-all-btn:hover {
    text-decoration: underline;
  }

  .selected-column-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    margin-bottom: 8px;
    border: 1px solid #e5e7eb;
  }

  .selected-column-name {
    font-size: 14px;
    color: #374151;
  }

  .remove-column-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .remove-column-btn:hover {
    background-color: #f3f4f6;
    color: #374151;
  }

  .column-selector-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background-color: #f9fafb;
  }

  .apply-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #111827;
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .apply-btn:hover {
    background: #1f2937;
  }
`;

export const EnhancedTableWrapper = ({
  data = [],
  columns = [],
  getSubRows, // Function to get child rows: (row) => row.subRows
  enableExpanding = true,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableColumnSelector = true, // New prop
  pageSize = 50,
  filterColumns = [],
  height = '600px',
  autoHeight = false, // New prop for dynamic height
  className = '',
  expandedByDefault = false,
  onRowClick,
  onRefresh, // New prop for refresh functionality
  onColumnsChange, // New prop for column changes
  customControls, // New prop for custom controls
  ...props
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterColumn, setFilterColumn] = useState(filterColumns[0]?.value || '');
  const [allExpanded, setAllExpanded] = useState(expandedByDefault);
  const [sizing, setSizing] = useState({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(() => 
    columns.reduce((acc, col) => ({ ...acc, [col.accessorKey || col.id]: true }), {})
  );
  
  // Enhanced columns with expand functionality
  const enhancedColumns = useMemo(() => {
    let cols = [...columns];
    
    // Filter columns based on selection
    if (enableColumnSelector) {
      cols = cols.filter(col => selectedColumns[col.accessorKey || col.id]);
    }
    
    // Add expand column if expanding is enabled and not already present
    if (enableExpanding && !cols.some(col => col.id === 'expander')) {
      cols.unshift({
        id: 'expander',
        header: '',
        size: 40,
        cell: ({ row, getValue }) => {
          const hasSubRows = row.subRows?.length > 0 || (getSubRows && getSubRows(row.original)?.length > 0);
          
          if (!hasSubRows) {
            return null;
          }

          return (
            <button
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
            >
              {row.getIsExpanded() ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          );
        },
      });
    }

    return cols;
  }, [columns, enableExpanding, getSubRows, selectedColumns, enableColumnSelector]);

  // Table configuration
  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSubRows: getSubRows,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnSizing: sizing,
      globalFilter,
      ...(expandedByDefault && enableExpanding ? { expanded: true } : {}),
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize,
      },
      ...(expandedByDefault && enableExpanding ? { expanded: true } : {}),
    },
    onColumnSizingChange: setSizing,
    ...props,
  });

  // Filter by specific column
  const handleColumnFilter = (value) => {
    if (filterColumn && value) {
      table.getColumn(filterColumn)?.setFilterValue(value);
    } else {
      // Clear all column filters
      table.getAllColumns().forEach(column => {
        column.setFilterValue(undefined);
      });
    }
  };

  // Expand/Collapse all
  const toggleAllExpanded = () => {
    if (allExpanded) {
      table.toggleAllRowsExpanded(false);
      setAllExpanded(false);
    } else {
      table.toggleAllRowsExpanded(true);
      setAllExpanded(true);
    }
  };

  // Column selector functions
  const filteredColumns = useMemo(() => {
    if (!columnSearch) return columns;
    return columns.filter(col => 
      (col.header || col.id || col.accessorKey || '').toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [columns, columnSearch]);

  const handleColumnToggle = (columnKey) => {
    setSelectedColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredColumns.every(col => selectedColumns[col.accessorKey || col.id]);
    const newSelection = { ...selectedColumns };
    
    filteredColumns.forEach(col => {
      newSelection[col.accessorKey || col.id] = !allSelected;
    });
    
    setSelectedColumns(newSelection);
  };

  const handleRemoveAll = () => {
    setSelectedColumns({});
  };

  const handleApplyColumns = () => {
    if (onColumnsChange) {
      onColumnsChange(selectedColumns);
    }
    setShowColumnSelector(false);
  };

  const handleCancelColumns = () => {
    // Reset to current state
    setSelectedColumns(columns.reduce((acc, col) => ({ ...acc, [col.accessorKey || col.id]: true }), {}));
    setShowColumnSelector(false);
  };

  const selectedCount = Object.values(selectedColumns).filter(Boolean).length;

  // Calculate dynamic height when autoHeight is enabled
  const calculatedHeight = useMemo(() => {
    if (!autoHeight) return height;
    
    const ROW_HEIGHT = 32; // Height per table row
    const HEADER_HEIGHT = 40; // Table header height
    const FILTER_HEIGHT = enableFiltering ? 80 : 0; // Filter controls height
    const PAGINATION_HEIGHT = enablePagination ? 60 : 0; // Pagination controls height
    
    const currentPageRows = 100;
    const tableContentHeight = HEADER_HEIGHT + (currentPageRows * ROW_HEIGHT);
    const totalHeight = tableContentHeight + FILTER_HEIGHT + PAGINATION_HEIGHT;
    
    return `${totalHeight}px`;
  }, [autoHeight, height, enableFiltering, enablePagination, table]);


  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TABLE_STYLES }} />
      
      <div className={`enhanced-table-container ${className}`} style={{ height: calculatedHeight }}>
        {/* Filter Controls */}
        {enableFiltering && (
          <div className="filter-container">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                {filterColumns.length > 0 && (
                  <select 
                    className="filter-select"
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                  >
                    <option value="">All Columns</option>
                    {filterColumns.map(filter => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="filter-input w-full pr-8"
                    value={globalFilter ?? ''}
                    onChange={(e) => {
                      setGlobalFilter(e.target.value);
                      if (filterColumn) {
                        handleColumnFilter(e.target.value);
                      }
                    }}
                  />
                  {globalFilter && (
                    <button
                      onClick={() => {
                        setGlobalFilter('');
                        handleColumnFilter('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Controls */}
              {(enableExpanding || onRefresh || enableColumnSelector || customControls) && (
                <div className="flex gap-2">
                  {customControls && customControls}
                  {enableColumnSelector && (
                    <button
                      onClick={() => setShowColumnSelector(true)}
                      className="control-button flex items-center gap-2"
                      title="Customize columns"
                    >
                      <Settings size={14} />
                      Columns
                    </button>
                  )}
                  {enableExpanding && (
                    <button
                      onClick={toggleAllExpanded}
                      className="control-button px-3 py-1 text-xs"
                    >
                      {allExpanded ? '-' : '+'}
                    </button>
                  )}
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="control-button flex items-center gap-2"
                      title="Refresh data"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ 
          height: autoHeight ? 'auto' : (enablePagination ? 'calc(100% - 120px)' : '100%'), 
          overflow: autoHeight ? 'visible' : 'auto',
          width: '100%' 
        }}>
          <table className="enhanced-table">
            <thead className="enhanced-table-header">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={enableSorting && header.column.getCanSort() ? 'sortable' : ''}
                      onClick={enableSorting ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder ? null : (
                          <>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {enableSorting && header.column.getCanSort() && (
                              <span className="flex flex-col">
                                {header.column.getIsSorted() === 'asc' && <ChevronUp size={14} />}
                                {header.column.getIsSorted() === 'desc' && <ChevronDown size={14} />}
                                {!header.column.getIsSorted() && (
                                  <div className="w-3.5 h-3.5 opacity-50">
                                    <ChevronUp size={14} className="opacity-50" />
                                  </div>
                                )}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`resize-handle ${header.column.getIsResizing() ? 'resizing' : ''}`}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="enhanced-table-row"
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="enhanced-table-cell"
                      style={{ paddingLeft: row.depth > 0 ? `${32 + (row.depth - 1) * 20}px` : undefined }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {enablePagination && (
          <div className="pagination-container">
            <div className="flex items-center gap-2">
              <button
                className="pagination-button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </button>
            <div className="flex items-center gap-2">
              <span className="pagination-info">
                Page{' '}
                <strong>
                  {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </strong>
              </span>
            </div>
              <button
                className="pagination-button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </button>
            </div>
            
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value));
              }}
              className="filter-select"
            >
              {[20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
            
            <div className="pagination-info">
              Showing {table.getRowModel().rows.length} of{' '}
              {table.getPreFilteredRowModel().rows.length} results
            </div>
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="column-selector-overlay" onClick={() => setShowColumnSelector(false)}>
          <div className="column-selector-modal" onClick={e => e.stopPropagation()}>
            {/* Left Panel - Available Columns */}
            <div className="column-selector-left">
              <div className="column-selector-header">
                <h3 className="column-selector-title">Customize columns</h3>
                <button 
                  className="column-selector-close"
                  onClick={() => setShowColumnSelector(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  Available columns
                </h4>
                
                <div className="column-search">
                  <Search className="column-search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Quick search"
                    className="column-search-input"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                  />
                </div>

                <button className="column-select-all" onClick={handleSelectAll}>
                  Select all
                </button>

                <div className="column-list">
                  {filteredColumns.map(column => {
                    const columnKey = column.accessorKey || column.id;
                    const isSelected = selectedColumns[columnKey];
                    const columnName = column.header || columnKey;
                    
                    return (
                      <div
                        key={columnKey}
                        className="column-item"
                        onClick={() => handleColumnToggle(columnKey)}
                      >
                        <div className={`column-checkbox ${isSelected ? 'checked' : ''}`} />
                        <span className="column-label">{columnName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel - Selected Columns */}
            <div className="column-selector-right">
              <div className="selected-columns-header">
                <span className="selected-count">{selectedCount} selected</span>
                <button className="remove-all-btn" onClick={handleRemoveAll}>
                  Remove all
                </button>
              </div>

              <div className="column-list">
                {columns.map(column => {
                  const columnKey = column.accessorKey || column.id;
                  const isSelected = selectedColumns[columnKey];
                  const columnName = column.header || columnKey;
                  
                  if (!isSelected) return null;
                  
                  return (
                    <div key={columnKey} className="selected-column-item">
                      <span className="selected-column-name">{columnName}</span>
                      <button
                        className="remove-column-btn"
                        onClick={() => handleColumnToggle(columnKey)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="column-selector-actions">
                <button className="cancel-btn" onClick={handleCancelColumns}>
                  Cancel
                </button>
                <button className="apply-btn" onClick={handleApplyColumns}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper functions for column definitions
export const TableColumnTypes = {
  // Text column with optional child indicator
  text: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 150,
    cell: ({ getValue, row }) => {
      const value = getValue();
      if (row.depth > 0 && options.showChildIndicator) {
        return (
          <div>
            <span></span>
            <span>{value}</span>
          </div>
        );
      }
      return value;
    },
    ...options,
  }),

  // Numeric column with formatting
  numeric: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 120,
    cell: ({ getValue }) => {
      const value = getValue();
      if (value == null) return '';
      if (options.formatter) {
        return options.formatter(value);
      }
      return typeof value === 'number' ? value.toLocaleString() : value;
    },
    ...options,
  }),

  // Currency column
  currency: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 120,
    cell: ({ getValue }) => {
      const value = getValue();
      if (!value) return '-';
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: options.currency || 'ARS'
      }).format(value);
    },
    ...options,
  }),

  // Image column
  image: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 80,
    cell: ({ getValue, row }) => {
      const value = getValue();
      return value ? (
        <img 
          src={value} 
          alt={options.alt || 'Image'}
          className={options.className || "w-10 h-10 object-cover rounded"}
        />
      ) : (
        <div className={options.placeholderClassName || "w-10 h-10 bg-gray-100 rounded flex items-center justify-center"}>
          <span className="text-xs text-gray-400">No img</span>
        </div>
      );
    },
    ...options,
  }),

  // Link column
  link: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 200,
    cell: ({ getValue, row }) => {
      const value = getValue();
      const url = options.getUrl ? options.getUrl(row.original) : row.original[options.urlField];
      
      return url ? (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      ) : value;
    },
    ...options,
  }),

  // Badge/Status column
  badge: (header, accessorKey, options = {}) => ({
    header,
    accessorKey,
    size: options.width || 100,
    cell: ({ getValue }) => {
      const value = getValue();
      const className = options.getClassName ? options.getClassName(value) : 'px-2 py-1 rounded text-xs bg-gray-100 text-gray-800';
      return (
        <span className={className}>
          {options.formatter ? options.formatter(value) : value}
        </span>
      );
    },
    ...options,
  }),
};

export default EnhancedTableWrapper;