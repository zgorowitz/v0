"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '@/lib/supabase/client';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const ShipmentsPage = () => {
  const [shipmentData, setShipmentData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showItems, setShowItems] = useState(false);

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
          categoty: item.name,
          shipment_created: item.shipment_created,
          max_seller_sku: item.seller_sku // Initialize with first value
        });
      } else {
        const existing = shipmentMap.get(shipmentId);
        // Update max_seller_sku if needed
        if (item.seller_sku > existing.max_seller_sku) {
          existing.max_seller_sku = item.seller_sku;
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
        item_thumbnail: item.picture_url || item.item_thumbnail,
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
      headerName: 'Actions',
      width: 150,
      cellRenderer: (params) => (
        <button
          onClick={() => handleShipmentSelect(params.data.shipment_id)}
          className="px-3 py-1 bg-gray-800 text-stone-50 text-sm rounded-md hover:bg-gray-700 custom-button border border-gray-600"
        >
          View Items
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
      width: 120,
      type: 'numericColumn',
      filter: true
    },
    {
      headerName: 'Producto Principal',
      field: 'max_seller_sku',
      width: 120,
      type: 'numericColumn'
    },
    {
      headerName: 'Category',
      field: 'name',
      width: 120,
    },
    {
      headerName: 'Account',
      field: 'account',
      width: 150,
      filter: true
    },
    {
      headerName: 'Shipment ID',
      field: 'shipment_id',
      width: 150,
      filter: true
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

  // Items column definitions
  const itemsColumnDefs = useMemo(() => [
    {
      headerName: 'Item',
      field: 'item_title',
      width: 300,
      cellRenderer: (params) => {
        const { item_thumbnail, item_title } = params.data;
        return (
          <div className="flex items-center gap-2 py-1">
            {item_thumbnail && (
              <img 
                src={item_thumbnail} 
                alt={item_title}
                className="w-8 h-8 object-cover rounded"
              />
            )}
            <span className="text-sm">{item_title}</span>
          </div>
        );
      }
    },
    {
      headerName: 'Variation',
      field: 'variation_attributes',
      width: 250,
      valueFormatter: (params) => formatVariationAttributes(params.value),
      filter: true
    },
    {
      headerName: 'Qty',
      field: 'quantity',
      width: 80,
      type: 'numericColumn'
    },
    {
      headerName: 'Price',
      field: 'unit_price',
      width: 100,
      type: 'numericColumn',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return `${params.value}`;
      }
    },
    {
      headerName: 'Item ID',
      field: 'item_id',
      width: 150,
      filter: true
    },
    {
      headerName: 'SKU',
      field: 'seller_sku',
      width: 150,
      filter: true
    },    
    {
      headerName: 'Order ID',
      field: 'order_id',
      width: 120,
      filter: true
      }
  ], []);

  // Get items for selected shipment
  const selectedShipmentItems = useMemo(() => {
    if (!selectedShipment) return [];
    return itemsData.filter(item => item.shipment_id === selectedShipment);
  }, [selectedShipment, itemsData]);

  const shipmentGridOptions = {
    theme: "legacy", // Use legacy theming to avoid v33+ theming conflicts
    columnDefs: shipmentColumnDefs,
    rowData: shipmentData,
    defaultColDef: {
      resizable: true,
      sortable: true
    },
    animateRows: true,
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'single'
  };

  const itemsGridOptions = {
    theme: "legacy", // Use legacy theming to avoid v33+ theming conflicts
    columnDefs: itemsColumnDefs,
    rowData: selectedShipmentItems,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true
    },
    animateRows: true,
    domLayout: 'autoHeight'
  };

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
    <div className="p-6 space-y-4 bg-stone-50 min-h-screen">
      <style dangerouslySetInnerHTML={{
        __html: `
          .ag-theme-alpine {
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
        `
      }} />
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shipments to Pack</h1>
        <p className="text-gray-600 mt-1">
          {shipmentData.length} shipments ready for packing
        </p>
      </div>

      {/* Summary Stats - Made shorter */}
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

      {/* Shipments Grid - Made shorter title */}
      <div className="bg-stone-50 rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Packing Queue</h2>
            <button
              onClick={fetchShipments}
              className="px-3 py-1.5 bg-gray-800 text-stone-50 text-sm rounded-md hover:bg-gray-700 custom-button border border-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
          <AgGridReact {...shipmentGridOptions} />
        </div>
      </div>

      {/* Items Grid - Show when shipment is selected */}
      {showItems && selectedShipment && (
        <div className="bg-stone-50 rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Items for Shipment #{selectedShipment}
              </h2>
              <div className="flex gap-3 items-center">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {selectedShipmentItems.length} items
                </span>
                <button
                  onClick={() => setShowItems(false)}
                  className="px-3 py-1.5 bg-gray-600 text-stone-50 text-sm rounded-md hover:bg-gray-500 custom-button border border-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <div className="ag-theme-alpine" style={{ width: '100%' }}>
            <AgGridReact {...itemsGridOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentsPage;