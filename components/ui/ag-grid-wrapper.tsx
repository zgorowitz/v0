// components/ui/ag-grid-wrapper.jsx
import React, { useMemo, useState } from 'react';
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
  ...props
}) => {
  const [gridApi, setGridApi] = useState(null);
  const [filterColumn, setFilterColumn] = useState(filters[0]?.value || '');
  const [filterValue, setFilterValue] = useState('');

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
    columnDefs,
    rowData,
    defaultColDef: defaultColumnDef,
    ...props
  }), [defaultGridOptions, columnDefs, rowData, defaultColumnDef, props]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AG_GRID_STYLES }} />
      
      <div className={`ag-grid-container ${className}`}>
        {/* Filter Controls */}
        {showFilters && filters.length > 0 && (
          <div className="ag-grid-filter-container">
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
  actionButton: (onClick, buttonText = "+") => ({
    headerName: 'Actions',
    width: 100,
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