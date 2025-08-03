// components/ui/ag-grid-expandable-wrapper.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Centralized AG Grid styles (same as original wrapper)
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
  .ag-grid-child-row {
    background-color: #f8fafc !important;
    border-left: 3px solid #3b82f6;
  }
  .ag-grid-child-row:hover {
    background-color: #f1f5f9 !important;
  }
  .ag-grid-child-row .ag-cell {
    padding-left: 24px;
  }
  .ag-grid-child-row .ag-cell:first-child {
    padding-left: 32px;
  }
`;

export const AGGridExpandableWrapper = ({
  columnDefs,
  rowData,
  getChildRows, // Function: (parentRow) => childRows[]
  isChildRow,   // Function: (row) => boolean
  childRowRenderer, // Optional: custom renderer for child rows
  defaultColDef,
  gridOptions = {},
  filters = [],
  onGridReady,
  height = '600px',
  className = '',
  showFilters = true,
  expandedByDefault = false,
  ...props
}) => {
  const [gridApi, setGridApi] = useState(null);
  const [filterColumn, setFilterColumn] = useState(filters[0]?.value || '');
  const [filterValue, setFilterValue] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [flattenedData, setFlattenedData] = useState([]);

  // Flatten data with parent-child relationships
  const flattenData = useCallback((data, expanded) => {
    const flattened = [];
    
    data.forEach(parentRow => {
      // Add parent row
      flattened.push({
        ...parentRow,
        _isParent: true,
        _isExpanded: expanded.has(parentRow.id),
        _rowId: parentRow.id
      });

      // Add child rows if parent is expanded
      if (expanded.has(parentRow.id)) {
        const children = getChildRows(parentRow);
        if (children && children.length > 0) {
          children.forEach((child, index) => {
            flattened.push({
              ...child,
              _isChild: true,
              _parentId: parentRow.id,
              _rowId: `${parentRow.id}_child_${index}`
            });
          });
        }
      }
    });

    return flattened;
  }, [getChildRows]);

  // Update flattened data when rowData or expandedRows changes
  React.useEffect(() => {
    if (expandedByDefault && rowData.length > 0 && expandedRows.size === 0) {
      const allIds = new Set(rowData.map(row => row.id));
      setExpandedRows(allIds);
    }
  }, [rowData, expandedByDefault, expandedRows.size]);

  React.useEffect(() => {
    setFlattenedData(flattenData(rowData, expandedRows));
  }, [rowData, expandedRows, flattenData]);

  // Toggle expand/collapse
  const toggleExpand = useCallback((rowId) => {
    setExpandedRows(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(rowId)) {
        newExpanded.delete(rowId);
      } else {
        newExpanded.add(rowId);
      }
      return newExpanded;
    });
  }, []);

  // Enhanced column definitions with expand button
  const enhancedColumnDefs = useMemo(() => {
    const columns = [...columnDefs];
    
    // Add expand button column if not already present
    const hasExpandColumn = columns.some(col => col.field === '_expand');
    if (!hasExpandColumn) {
      columns.unshift({
        headerName: '',
        field: '_expand',
        width: 60,
        cellClass: 'no-padding-cell',
        cellStyle: { padding: 5 },
        cellRenderer: (params) => {
          if (params.data._isChild) {
            return null; // No expand button for child rows
          }
          
          const hasChildren = getChildRows(params.data)?.length > 0;
          if (!hasChildren) {
            return null; // No expand button if no children
          }

          const isExpanded = expandedRows.has(params.data.id);
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(params.data.id);
              }}
              className="ag-grid-custom-button px-2 py-1 bg-gray-800 text-stone-50 text-xs hover:bg-gray-700"
            >
              {isExpanded ? '−' : '+'}
            </button>
          );
        },
        pinned: 'left'
      });
    }

    return columns;
  }, [columnDefs, getChildRows, toggleExpand]);

  // Default column definitions
  const defaultColumnDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: false,
    ...defaultColDef
  }), [defaultColDef]);

  // Default grid options
  const defaultGridOptions = useMemo(() => ({
    theme: "legacy",
    animateRows: true,
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'single',
    getRowClass: (params) => {
      if (params.data._isChild) {
        return 'ag-grid-child-row';
      }
      return '';
    },
    ...gridOptions
  }), [gridOptions]);

  // External filter logic
  const isExternalFilterPresent = () => {
    return filterColumn && filterValue;
  };

  const doesExternalFilterPass = (node) => {
    const data = node.data;
    if (!filterColumn || !filterValue) return true;
    
    // Don't filter child rows individually - they follow their parent
    if (data._isChild) return true;
    
    const fieldValue = data[filterColumn];
    
    // Handle array fields
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
    columnDefs: enhancedColumnDefs,
    rowData: flattenedData,
    defaultColDef: defaultColumnDef,
    ...props
  }), [defaultGridOptions, enhancedColumnDefs, flattenedData, defaultColumnDef, props]);

  // Expand/Collapse all functions
  const expandAll = () => {
    const allParentIds = new Set(rowData.map(row => row.id));
    setExpandedRows(allParentIds);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AG_GRID_STYLES }} />
      
      <div className={`ag-grid-container ${className}`}>
        {/* Filter Controls */}
        {showFilters && filters.length > 0 && (
          <div className="ag-grid-filter-container">
            <div className="flex items-center gap-3 justify-between">
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

              {/* Expand/Collapse controls */}
              <div className="flex gap-2">
                <button
                  onClick={collapseAll}
                  className="ag-grid-filter-select px-3 py-1 text-xs"
                >
                  Collapse All
                </button>
                <button
                  onClick={expandAll}
                  className="ag-grid-filter-select px-3 py-1 text-xs"
                >
                  Expand All
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

// Enhanced column types for expandable grids
export const AGGridExpandableColumnTypes = {
  // All previous column types from original wrapper
  numeric: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 120,
    type: 'numericColumn',
    valueFormatter: options.formatter || ((params) => {
      if (params.value == null) return '';
      return params.value.toLocaleString();
    }),
    ...options
  }),

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

  array: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 150,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return Array.isArray(params.value) ? params.value.join(', ') : params.value;
    },
    ...options
  }),

  // New: Child row indicator
  childIndicator: (headerName, field, options = {}) => ({
    headerName,
    field,
    width: options.width || 150,
    cellRenderer: (params) => {
      if (params.data._isChild) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">└─</span>
            <span>{params.value}</span>
          </div>
        );
      }
      return params.value;
    },
    ...options
  })
};

export default AGGridExpandableWrapper;