// components/ui/ag-grid-wrapper.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Centralized AG Grid styles
const AG_GRID_STYLES = `
  .ag-theme-alpine {
    --ag-header-padding: 0;
    --ag-background-color: #fefefe;
    --ag-header-background-color: #f8f8f8;
    --ag-odd-row-background-color: #fdfdfd;
    --ag-border-color: #d1d5db;
    --ag-header-column-separator-color: #d1d5db;
    --ag-row-border-color: #e5e7eb;
    --ag-cell-horizontal-border: #f3f4f6;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #d1d5db;
  }
  .ag-theme-alpine .ag-header {
    border-radius: 8px 8px 0 0;
  }
  .ag-theme-alpine .ag-paging-panel {
    border-radius: 0 0 8px 8px;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }
  .ag-grid-custom-button {
    transition: all 0.2s ease;
    border-radius: 4px;
    border: 1px solid #374151;
  }
  .ag-grid-custom-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #4b5563;
  }
  .ag-grid-filter-container {
    background-color: #f9fafb;
    border-radius: 8px 8px 0 0;
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  .ag-grid-filter-select {
    background-color: #374151;
    color: #f9fafb;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .ag-grid-filter-select:hover {
    background-color: #4b5563;
  }
  .ag-grid-filter-input {
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    transition: all 0.2s;
  }
  .ag-grid-filter-input:focus {
    outline: none;
    background-color: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .ag-grid-clear-filter {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }
  .ag-grid-clear-filter:hover {
    color: #374151;
  }
`;

export const AGGridWrapper = ({
  columnDefs,
  rowData,
  defaultColDef,
  gridOptions = {},
  filters = [],
  onGridReady,
  height = '600px',
  className = '',
  showFilters = true,
  showDateSelector = false,
  onDateChange,
  showColumnSelector = true,
  ...props
}) => {
  const [gridApi, setGridApi] = useState(null);
  const [filterColumn, setFilterColumn] = useState(filters[0]?.value || '');
  const [filterValue, setFilterValue] = useState('');
  
  // Date selector state
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Column visibility state
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    // Initialize all columns as visible by default
    const initialVisibility = {};
    columnDefs?.forEach((col, index) => {
      const key = col.field || col.headerName || `col_${index}`;
      initialVisibility[key] = col.hide !== true; // Default to visible unless explicitly hidden
    });
    return initialVisibility;
  });

  // Default column definitions
  const defaultColumnDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: false, // We use external filtering
    ...defaultColDef
  }), [defaultColDef]);

  // Default grid options
  const defaultGridOptions = useMemo(() => ({
    theme: "legacy",
    animateRows: true,
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'single',
    ...gridOptions
  }), [gridOptions]);

  // External filter logic
  const isExternalFilterPresent = () => {
    return filterColumn && filterValue;
  };

  const doesExternalFilterPass = (node) => {
    const data = node.data;
    if (!filterColumn || !filterValue) return true;
    
    const fieldValue = data[filterColumn];
    
    // Handle array fields (like sku_list)
    if (Array.isArray(fieldValue)) {
      return fieldValue.some(item => 
        item.toString().toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    
    // Handle numeric fields
    if (typeof fieldValue === 'number') {
      const numValue = parseFloat(filterValue);
      if (!isNaN(numValue)) {
        return fieldValue === numValue;
      }
    }
    
    // Handle string fields
    return fieldValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
  };

  // Handle filter changes
  const onFilterChange = (e) => {
    setFilterValue(e.target.value);
    if (gridApi) {
      gridApi.onFilterChanged();
    }
  };

  const onColumnChange = (e) => {
    setFilterColumn(e.target.value);
    if (gridApi) {
      gridApi.onFilterChanged();
    }
  };

  const clearFilters = () => {
    setFilterColumn(filters[0]?.value || '');
    setFilterValue('');
    if (gridApi) {
      gridApi.onFilterChanged();
    }
  };

  // Handle date changes
  const handleFromDateChange = (e) => {
    const newFromDate = e.target.value;
    setFromDate(newFromDate);
    if (onDateChange) {
      onDateChange({ from: newFromDate, to: toDate });
    }
  };

  const handleToDateChange = (e) => {
    const newToDate = e.target.value;
    setToDate(newToDate);
    if (onDateChange) {
      onDateChange({ from: fromDate, to: newToDate });
    }
  };

  // Initialize with today's date on mount
  useEffect(() => {
    if (showDateSelector && onDateChange) {
      onDateChange({ from: fromDate, to: toDate });
    }
  }, []); // Only run on mount

  // Update column visibility when columnDefs change
  useEffect(() => {
    const newVisibility = {};
    columnDefs?.forEach((col, index) => {
      const key = col.field || col.headerName || `col_${index}`;
      newVisibility[key] = columnVisibility[key] !== undefined ? columnVisibility[key] : (col.hide !== true);
    });
    setColumnVisibility(newVisibility);
  }, [columnDefs]);

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Apply column visibility to column definitions
  const visibleColumnDefs = useMemo(() => {
    return columnDefs?.map((col, index) => {
      const key = col.field || col.headerName || `col_${index}`;
      return {
        ...col,
        hide: !columnVisibility[key]
      };
    });
  }, [columnDefs, columnVisibility]);

  const handleGridReady = (params) => {
    setGridApi(params.api);
    if (onGridReady) {
      onGridReady(params);
    }
  };

  // Final grid options with external filtering
  const finalGridOptions = useMemo(() => ({
    ...defaultGridOptions,
    isExternalFilterPresent,
    doesExternalFilterPass,
    onGridReady: handleGridReady,
    columnDefs: visibleColumnDefs,
    rowData,
    defaultColDef: defaultColumnDef,
    ...props
  }), [defaultGridOptions, visibleColumnDefs, rowData, defaultColumnDef, props]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AG_GRID_STYLES }} />
      
      <div className={`ag-grid-container ${className}`}>
        {/* Filter Controls */}
        {(showFilters && filters.length > 0) || showDateSelector ? (
          <div className="ag-grid-filter-container">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Standard filters - Left side */}
              {showFilters && filters.length > 0 && (
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <select 
                    className="ag-grid-filter-select"
                    value={filterColumn}
                    onChange={onColumnChange}
                  >
                    {filters.map(filter => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                  
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="ag-grid-filter-input w-full pr-8"
                      value={filterValue}
                      onChange={onFilterChange}
                    />
                    {filterValue && (
                      <button
                        onClick={clearFilters}
                        className="ag-grid-clear-filter"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Date Selector - Right side */}
              {showDateSelector && (
                <div className="flex items-center gap-3 ml-auto">
                  <label className="text-sm font-medium text-gray-500">From:</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={handleFromDateChange}
                    className="ag-grid-filter-input text-sm text-gray-500"
                  />
                  <label className="text-sm font-medium text-gray-500">To:</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={handleToDateChange}
                    className="ag-grid-filter-input text-sm text-gray-500"
                  />
                </div>
              )}

              {/* Column Selector Button */}
              {showColumnSelector && (
                <button
                  onClick={() => setShowColumnModal(true)}
                  className="ag-grid-filter-select text-sm px-3 py-1 ml-2"
                >
                  Columns
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Column Selection Modal */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Customize columns</h3>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {columnDefs?.map((col, index) => {
                    const key = col.field || col.headerName || `col_${index}`;
                    const displayName = col.headerName || col.field || `Column ${index + 1}`;
                    
                    return (
                      <div key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`col-${key}`}
                          checked={columnVisibility[key] || false}
                          onChange={() => toggleColumnVisibility(key)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label 
                          htmlFor={`col-${key}`}
                          className="ml-2 text-sm text-gray-900 cursor-pointer"
                        >
                          {displayName}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AG Grid */}
        <div 
          className="ag-theme-alpine" 
          style={{ height, width: '100%' }}
        >
          <AgGridReact {...finalGridOptions} />
        </div>
      </div>
    </>
  );
};

// Custom button cell renderer that uses consistent styling
export const AGGridButton = ({ onClick, children, className = "", ...props }) => (
  <button
    onClick={onClick}
    className={`ag-grid-custom-button px-3 py-1 bg-gray-800 text-stone-50 text-sm hover:bg-gray-700 ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Pre-configured column types for common use cases
export const AGGridColumnTypes = {
  // Button column for actions
  actionButton: (headerName, onClick, buttonText = "+") => ({
    headerName,
    width: 70,
    cellClass: 'no-padding-cell',
    cellStyle: { padding: 5 },
    cellRenderer: (params) => (
      <AGGridButton onClick={() => onClick(params.data)}>
        {buttonText}
      </AGGridButton>
    ),
    pinned: 'left'
  }),

  // Numeric column with formatting
  numeric: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 120,
    type: 'numericColumn',
    filter: 'agNumberColumnFilter',
    valueFormatter: options.formatter || ((params) => {
      if (params.value == null) return '';
      return params.value.toLocaleString();
    }),
    ...options
  }),

  // Date column with formatting
  date: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 180,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return new Date(params.value).toLocaleString();
    },
    ...options
  }),

  // Array column (like SKU lists)
  array: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 150,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return Array.isArray(params.value) ? params.value.join(', ') : params.value;
    },
    ...options
  })
};

export default AGGridWrapper;