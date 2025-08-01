"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const ShipmentsPage = () => {
  const [shipmentData, setShipmentData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [filterColumn, setFilterColumn] = useState('sku_list');
  const [filterValue, setFilterValue] = useState('');
  const [gridApi, setGridApi] = useState(null);

  // Modified filter options
  const filterOptions = [
    { value: 'sku_list', label: 'SKU' }, // Make SKU default
    { value: 'account', label: 'Account' },
    { value: 'category', label: 'Category' },
    { value: 'shipment_id', label: 'Shipment ID' },
    { value: 'total_items', label: 'Total Items' },
  ];

  // Fetch shipments data
  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('shipments_packing_view')
        .select('*')
        .order('shipment_id');

      if (error) throw error;

      // Group data by shipment_id
      const { shipments, allItems } = groupShipmentData(data);
      setShipmentData(shipments);
      setItemsData(allItems);
      
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group shipment data by shipment_id
  const groupShipmentData = (data) => {
    const shipmentMap = new Map();
    const allItems = [];
    
    data.forEach(item => {
      const shipmentId = item.shipment_id;
      
      // Create shipment summary
      if (!shipmentMap.has(shipmentId)) {
        shipmentMap.set(shipmentId, {
          shipment_id: shipmentId,
        //   meli_user_id: item.meli_user_id,
          account: item.nickname,
          total_orders: item.total_orders,
          total_items: item.total_items,
          category: item.name,
          shipment_created: item.shipment_created,
          sku_list: [item.seller_sku] // Initialize as array
        });
      } else {
        const existing = shipmentMap.get(shipmentId);
        // Add seller_sku if not already present
        if (!existing.sku_list.includes(item.seller_sku)) {
          existing.sku_list.push(item.seller_sku);
        }
      }
      
      // Add to items list
      allItems.push({
        sku: item.seller_sku,
        shipment_id: shipmentId,
        order_id: item.order_id,
        item_id: item.item_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        available_quantity: item.available_quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id,
        item_title: item.item_title,
        item_full_title: item.item_full_title,
        item_thumbnail: item.item_thumbnail,
        variation_attributes: item.variation_attributes
      });
    });

    return {
      shipments: Array.from(shipmentMap.values()),
      allItems
    };
  };

  // Format variation attributes for display
  const formatVariationAttributes = (attributes) => {
    if (!attributes || typeof attributes !== 'object') return '';
    
    return Object.entries(attributes)
      .map(([key, value]) => {
        if (value && typeof value === 'object' && value.value_name) {
          return `${value.name || key}: ${value.value_name}`;
        }
        return `${key}: ${value}`;
      })
      .join(', ');
  };

  // Handle shipment selection
  const handleShipmentSelect = (shipmentId) => {
    setSelectedShipment(shipmentId);
    setShowItems(true);
  };

  // Shipment column definitions
  const shipmentColumnDefs = useMemo(() => [
  {
    headerName: 'Items',
    width: 50,
    cellClass: 'no-padding-cell', // Add this class
    cellStyle: { padding: 5 }, // Remove default cell padding
    cellRenderer: (params) => (
      <button
        onClick={() => handleShipmentSelect(params.data.shipment_id)}
        className="px-3 py-1 bg-gray-800 text-stone-50 text-sm rounded-md hover:bg-gray-700 custom-button border border-gray-600"
      >
        +
      </button>
    ),
    pinned: 'left'
  },
    // {
    //   headerName: 'Total Orders',
    //   field: 'total_orders',
    //   width: 120,
    //   type: 'numericColumn'
    // },
    {
      headerName: 'Total Items',
      field: 'total_items',
      width: 100,
      type: 'numericColumn',
      // filter: true
    },
    {
      headerName: 'SKUs',
      field: 'sku_list',
      width: 120,
      valueFormatter: (params) => Array.isArray(params.value) ? params.value.join(', ') : params.value,
      // filter: true

    },
    {
      headerName: 'Category',
      field: 'category',
      width: 120,
    },
    {
      headerName: 'Account',
      field: 'account',
      width: 150,
      // filter: true
    },
    {
      headerName: 'Shipment ID',
      field: 'shipment_id',
      width: 150,
      // filter: true
    },
    {
      headerName: 'Created',
      field: 'shipment_created',
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString();
      }
    }
  ], []);

  // Get items for selected shipment
  const selectedShipmentItems = useMemo(() => {
    if (!selectedShipment) return [];
    return itemsData.filter(item => item.shipment_id === selectedShipment);
  }, [selectedShipment, itemsData]);

  // External filter logic
  const isExternalFilterPresent = () => {
    return filterColumn && filterValue;
  };

  const doesExternalFilterPass = (node) => {
    const data = node.data;
    if (!filterColumn || !filterValue) return true;
    
    if (filterColumn === 'sku_list') {
      return data[filterColumn]?.some(sku => 
        sku.toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    
    if (filterColumn === 'total_items') {
      const numValue = parseInt(filterValue);
      if (isNaN(numValue)) return true;
      return data[filterColumn] === numValue;
    }
    
    return data[filterColumn]?.toString().toLowerCase().includes(filterValue.toLowerCase());
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

  // Update shipmentGridOptions
  const shipmentGridOptions = {
    theme: "legacy", // Use legacy theming to avoid v33+ theming conflicts
    columnDefs: shipmentColumnDefs,
    rowData: shipmentData,
    defaultColDef: {
      resizable: true,
      sortable: true,
      // Remove column filters since we're using the global filter
      filter: false
    },
    animateRows: true,
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'single',
    // Update the filter logic
    isExternalFilterPresent,
    doesExternalFilterPass,
    onGridReady: (params) => {
      setGridApi(params.api);
    }
  };

  // Item Card Component
  const ItemCard = ({ item }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {item.item_thumbnail && (
          <div className="flex-shrink-0">
            <img 
              src={item.item_thumbnail} 
              alt= {item.sku}
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{item.sku}</h3>
            <span className="font-semibold text-gray-900 font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2">
              Cantidad: {item.quantity}
            </span>
          </div>
          
          {/* Title */}
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.item_title}</p>
          
          {/* Variation */}
          {item.variation_attributes && formatVariationAttributes(item.variation_attributes) && (
            <p className="text-xs text-gray-500 mb-2">
              <span className="font-medium">Variation:</span> {formatVariationAttributes(item.variation_attributes)}
            </p>
          )}
          
          {/* Price */}
          {item.unit_price && (
            <p className="text-sm font-medium text-gray-900 mb-2">
              ${item.unit_price} {item.currency_id}
            </p>
          )}
          
          {/* IDs */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <span className="font-medium">Item ID:</span> {item.item_id}
            </div>
            <div>
              <span className="font-medium">Order ID:</span> {item.order_id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-700">Loading shipments...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="bg-stone-50 border border-gray-400 text-gray-800 px-4 py-3 rounded-lg">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <LayoutWrapper>
    <div className="p-6 space-y-4 bg-stone-50 min-h-screen">
      <style dangerouslySetInnerHTML={{
        __html: `
          .ag-theme-alpine {
            --ag-header-padding: 0; /* Add this line to remove header padding */

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
          .custom-button {
            transition: all 0.2s ease;
          }
          .custom-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `
      }} />
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-1">Total Shipments</h3>
          <p className="text-2xl font-bold text-gray-900">{shipmentData.length}</p>
        </div>
        <div className="bg-stone-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-1">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900">
            {shipmentData.reduce((sum, s) => sum + s.total_orders, 0)}
          </p>
        </div>
        <div className="bg-stone-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-1">Total Items</h3>
          <p className="text-2xl font-bold text-gray-900">
            {shipmentData.reduce((sum, s) => sum + s.total_items, 0)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={`grid gap-4 ${showItems ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Shipments Grid */}
        <div>
          <div className="p-3">
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">Que te Parece Eli?</h2>
              
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <select 
                  className="px-3 py-1.5 bg-gray-800 text-stone-50 text-sm rounded-md
                             hover:bg-gray-700 transition-colors duration-200
                             focus:outline-none cursor-pointer"
                  value={filterColumn}
                  onChange={onColumnChange}
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-1.5 bg-gray-50 text-sm rounded-md
                               focus:outline-none focus:bg-white transition-colors
                               placeholder-gray-400"
                    value={filterValue}
                    onChange={onFilterChange}
                  />
                  {(filterColumn || filterValue) && (
                    <button
                      onClick={() => {
                        setFilterColumn('sku_list');
                        setFilterValue('');
                        if (gridApi) {
                          gridApi.onFilterChanged();
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 
                                 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* <button
                onClick={fetchShipments}
                className="px-4 py-1.5 bg-gray-800 text-stone-50 text-sm rounded-md 
                           hover:bg-gray-700 transition-colors duration-200"
              >
                Refresh
              </button> */}
            </div>
          </div>

          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact {...shipmentGridOptions} />
          </div>
        </div>

        {/* Items Cards - Show when shipment is selected */}
        {showItems && selectedShipment && (
          <div>
            <div className="p-3 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Items for Shipment #{selectedShipment}
              </h2>
              <div className="flex gap-3 items-center">
                <span className="text-sm text-gray-600 px-3 py-1">
                  {selectedShipmentItems.length} items
                </span>
                <button
                  onClick={() => setShowItems(false)}
                  className="px-3 py-1.5 bg-gray-800 text-stone-50 text-sm rounded-md 
                           hover:bg-gray-700 transition-colors duration-200 custom-button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid gap-3">
                {selectedShipmentItems.map((item, index) => (
                  <ItemCard key={`${item.item_id}-${item.variation_id}-${index}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </LayoutWrapper>
  );
};

export default ShipmentsPage;