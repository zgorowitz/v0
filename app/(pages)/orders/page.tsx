"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { AGGridWrapper, AGGridColumnTypes } from '@/components/ui/ag-grid-wrapper';

const OrdersPage = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [orderItemsData, setOrderItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const itemsCardRef = useRef<HTMLDivElement>(null);

  // Filter options for the AG Grid - all columns
  const filterOptions = [
    { value: 'id', label: 'Order ID' },
    { value: 'status', label: 'Status' },
    { value: 'buyer_id', label: 'Buyer ID' },
    { value: 'currency_id', label: 'Currency' },
    { value: 'total_amount', label: 'Total Amount' },
    { value: 'items_count', label: 'Items Count' },
    { value: 'total_quantity', label: 'Total Quantity' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'date_created', label: 'Created Date' },
    { value: 'date_last_updated', label: 'Updated Date' },
  ];

  // Fetch orders data
  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Get current user's organization ID
      const organizationId = await getCurrentUserOrganizationId();
      if (!organizationId) {
        throw new Error('User organization not found');
      }
      
      // Get all meli_user_ids connected to this organization
      const { data: meliAccounts, error: accountsError } = await supabase
        .from('meli_accounts')
        .select('meli_user_id')
        .eq('organization_id', organizationId);
      
      if (accountsError) throw accountsError;
      
      if (!meliAccounts || meliAccounts.length === 0) {
        throw new Error('No MercadoLibre accounts found for this organization');
      }
      
      const meliUserIds = meliAccounts.map(account => account.meli_user_id);
      
      // Build the query with date filtering
      let ordersQuery = supabase
        .from('meli_orders')
        .select('*')
        .in('meli_user_id', meliUserIds);

      // Apply date filtering if dates are set
      if (dateFilter.from) {
        ordersQuery = ordersQuery.gte('date_created', `${dateFilter.from}T00:00:00.000Z`);
      }
      if (dateFilter.to) {
        ordersQuery = ordersQuery.lte('date_created', `${dateFilter.to}T23:59:59.999Z`);
      }

      // Get orders only for the organization's meli_user_ids
      const { data: orders, error: ordersError } = await ordersQuery
        .order('date_created', { ascending: false })
        .limit(3000); 

      if (ordersError) throw ordersError;

      // Get all order items for these orders
      const orderIds = orders.map(order => order.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('meli_order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Get unique item IDs from order items
      const itemIds = [...new Set(orderItems.map(item => item.item_id).filter(Boolean))];
      
      // Get item data
      const { data: items, error: itemsDataError } = await supabase
        .from('meli_items')
        .select('id, title, thumbnail, user_product_id')
        .in('id', itemIds);

      if (itemsDataError) throw itemsDataError;

      // Get variations data - we need to handle both variation_id and user_product_id cases
      const variationQueries = [];
      
      // Get variations by variation_id
      const variationIds = orderItems
        .map(item => item.variation_id)
        .filter(Boolean);
      
      if (variationIds.length > 0) {
        variationQueries.push(
          supabase
            .from('meli_variations')
            .select('item_id, variation_id, user_product_id, seller_sku, picture_url')
            .in('variation_id', variationIds)
        );
      }
      
      // Get variations by user_product_id (for items without variation_id)
      const userProductIds = items
        .map(item => item.user_product_id)
        .filter(Boolean);
        
      if (userProductIds.length > 0) {
        variationQueries.push(
          supabase
            .from('meli_variations')
            .select('item_id, variation_id, user_product_id, seller_sku, picture_url')
            .in('user_product_id', userProductIds)
        );
      }

      // Execute variation queries
      let allVariations = [];
      for (const query of variationQueries) {
        const { data, error } = await query;
        if (!error && data) {
          allVariations = [...allVariations, ...data];
        }
      }

      // Create lookup maps
      const itemsMap = new Map(items.map(item => [item.id, item]));
      const variationsByVariationId = new Map();
      const variationsByUserProductId = new Map();
      
      allVariations.forEach(variation => {
        if (variation.variation_id) {
          variationsByVariationId.set(variation.variation_id, variation);
        }
        if (variation.user_product_id) {
          variationsByUserProductId.set(variation.user_product_id, variation);
        }
      });

      // Enrich order items with variation and item data
      const enrichedOrderItems = orderItems.map(orderItem => {
        const item = itemsMap.get(orderItem.item_id);
        let variation = null;

        // Try to find variation by variation_id first
        if (orderItem.variation_id) {
          variation = variationsByVariationId.get(orderItem.variation_id);
        }
        
        // If no variation found and item has user_product_id, try that
        if (!variation && item?.user_product_id) {
          variation = variationsByUserProductId.get(item.user_product_id);
        }

        return {
          ...orderItem,
          item_data: item,
          variation_data: variation
        };
      });

      // Group order items by order_id
      const itemsByOrder = enrichedOrderItems.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      // Enrich orders with item count and total items quantity
      const enrichedOrders = orders.map(order => ({
        ...order,
        items_count: itemsByOrder[order.id]?.length || 0,
        total_quantity: itemsByOrder[order.id]?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      }));

      setOrdersData(enrichedOrders);
      setOrderItemsData(enrichedOrderItems);
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle order selection
  const handleOrderSelect = (orderId) => {
    setSelectedOrder(orderId);
    setShowItems(true);
  };

  // Handle date filter changes
  const handleDateChange = (dates) => {
    setDateFilter(dates);
  };

  // Handle click outside to close items card
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemsCardRef.current && !itemsCardRef.current.contains(event.target)) {
        setShowItems(false);
      }
    };

    if (showItems) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showItems]);

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-gray-100 text-gray-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Orders column definitions
  const ordersColumnDefs = useMemo(() => [
    AGGridColumnTypes.actionButton(
      "Abrir",
      (data) => handleOrderSelect(data.id),
      "+"
    ),
    {
      headerName: 'Order ID',
      field: 'id',
      width: 150,
      filter: true,
      cellRenderer: (params) => (
        <span className="font-mono text-sm">{params.value}</span>
      )
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      filter: true,
    },
    AGGridColumnTypes.numeric('Total Amount', 'total_amount', {
      width: 130,
      filter: true,
      formatter: (params) => {
        if (!params.value) return '-';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: params.data.currency_id || 'ARS'
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Items', 'items_count', { width: 80, filter: true }),
    AGGridColumnTypes.numeric('Qty', 'total_quantity', { width: 80, filter: true, }),
    {
      headerName: 'Buyer ID',
      field: 'buyer_id',
      width: 120,
      filter: true,
      cellRenderer: (params) => (
        <span className="font-mono text-xs">{params.value || '-'}</span>
      )
    },
    {
      headerName: 'Fulfilled',
      field: 'fulfilled',
      width: 100,
      filter: true,
      valueFormatter: (params) => params.value ? 'Yes' : 'No'
    },
    AGGridColumnTypes.date('Created', 'date_created', { width: 160 }),
    AGGridColumnTypes.date('Updated', 'date_last_updated', { width: 160 })
  ], []);

  // Get items for selected order
  const selectedOrderItems = useMemo(() => {
    if (!selectedOrder) return [];
    return orderItemsData.filter(item => item.order_id === selectedOrder);
  }, [selectedOrder, orderItemsData]);

  // Get selected order data
  const selectedOrderData = useMemo(() => {
    if (!selectedOrder) return null;
    return ordersData.find(order => order.id === selectedOrder);
  }, [selectedOrder, ordersData]);

  // Format variation attributes for display
  const formatVariationAttributes = (attributes) => {
    if (!attributes || !Array.isArray(attributes)) return '';
    
    return attributes
      .map(attr => `${attr.name}: ${attr.value_name}`)
      .join(', ');
  };

  // Order Item Card Component
  const OrderItemCard = ({ item }) => (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-colors">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {(item.variation_data?.picture_url || item.item_data?.thumbnail) && (
          <div className="flex-shrink-0">
            <img 
              src={item.variation_data?.picture_url || item.item_data?.thumbnail} 
              alt={item.variation_data?.seller_sku || item.item_id}
              className="w-12 h-12 object-cover rounded border border-gray-200"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {item.variation_data?.seller_sku || item.item_id}
              </h3>
              {item.item_data?.title && (
                <p className="text-xs text-gray-600 truncate">{item.item_data.title}</p>
              )}
            </div>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex-shrink-0 ml-2">
              Qty: {item.quantity}
            </span>
          </div>
          
          {/* Price */}
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-medium text-gray-900">
              Unit: {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: item.currency_id || 'ARS'
              }).format(item.unit_price || 0)}
            </p>
            <p className="text-xs font-bold text-gray-900">
              Total: {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: item.currency_id || 'ARS'
              }).format((item.unit_price || 0) * (item.quantity || 0))}
            </p>
          </div>
          
          {/* Variation Attributes */}
          {item.variation_attributes && item.variation_attributes.length > 0 && (
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-medium">Attr:</span> {formatVariationAttributes(item.variation_attributes)}
            </p>
          )}

          {/* IDs and Additional Info */}
          <div className="flex gap-4 text-xs text-gray-500">
            {item.variation_id && (
              <div>
                <span className="font-medium">Var:</span> {item.variation_id}
              </div>
            )}
            {item.sale_fee && (
              <div>
                <span className="font-medium">Fee:</span> {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: item.currency_id || 'ARS'
                }).format(item.sale_fee)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );



  if (error) {
    return (
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-4 bg-stone-50 min-h-screen">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Total Orders</h3>
            <p className="text-2xl font-bold text-gray-900">{ordersData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS'
              }).format(
                ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0)
              )}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Fulfilled</h3>
            <p className="text-2xl font-bold text-gray-600">
              {ordersData.filter(order => order.fulfilled).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {ordersData.filter(order => !order.fulfilled).length}
            </p>
          </div>
        </div>

        {/* Main Content - Single column */}
        <div className="grid gap-4 grid-cols-1">
          {/* Orders Grid */}
          <div className="relative">
            <AGGridWrapper
              columnDefs={ordersColumnDefs}
              rowData={ordersData}
              filters={filterOptions}
              height="800px"
              showDateSelector={true}
              onDateChange={handleDateChange}
              defaultColDef={{
                resizable: true,
                sortable: true,
              }}
              gridOptions={{
                pagination: true,
                paginationPageSize: 50,
                rowSelection: 'single',
              }}
            />

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-10 pointer-events-none">
                <span className="w-10 h-10 mb-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <div className="text-lg text-gray-700">Loading...</div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items Popup - Show when order is selected */}
        {showItems && selectedOrder && selectedOrderData && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div ref={itemsCardRef} className="bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Order #{selectedOrder}
                  </h2>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>Status: <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrderData.status)}`}>{selectedOrderData.status}</span></span>
                    <span>Total: {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: selectedOrderData.currency_id || 'ARS'
                    }).format(selectedOrderData.total_amount || 0)}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedOrderItems.length} items
                  </span>
                </div>
                <button
                  onClick={() => setShowItems(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
                <div className="space-y-3">
                  {selectedOrderItems.map((item, index) => (
                    <OrderItemCard key={`${item.item_id}-${item.variation_id}-${index}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
};

export default OrdersPage;