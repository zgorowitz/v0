"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
  }, []);

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
      
      // Get orders only for the organization's meli_user_ids
      const { data: orders, error: ordersError } = await supabase
        .from('meli_orders')
        .select('*')
        .in('meli_user_id', meliUserIds)
        .order('date_created', { ascending: false })
        .limit(1000); // Limit for performance

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

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
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
      (data) => handleOrderSelect(data.id),
      "+"
    ),
    {
      headerName: 'Order ID',
      field: 'id',
      width: 150,
      cellRenderer: (params) => (
        <span className="font-mono text-sm">{params.value}</span>
      )
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
    },
    AGGridColumnTypes.numeric('Total Amount', 'total_amount', {
      width: 130,
      formatter: (params) => {
        if (!params.value) return '-';
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: params.data.currency_id || 'ARS'
        }).format(params.value);
      }
    }),
    AGGridColumnTypes.numeric('Items', 'items_count', { width: 80 }),
    AGGridColumnTypes.numeric('Qty', 'total_quantity', { width: 80 }),
    {
      headerName: 'Buyer ID',
      field: 'buyer_id',
      width: 120,
      cellRenderer: (params) => (
        <span className="font-mono text-xs">{params.value || '-'}</span>
      )
    },
    {
      headerName: 'Fulfilled',
      field: 'fulfilled',
      width: 100,
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {(item.variation_data?.picture_url || item.item_data?.thumbnail) && (
          <div className="flex-shrink-0">
            <img 
              src={item.variation_data?.picture_url || item.item_data?.thumbnail} 
              alt={item.variation_data?.seller_sku || item.item_id}
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {item.variation_data?.seller_sku || item.item_id}
              </h3>
              {item.item_data?.title && (
                <p className="text-xs text-gray-600 truncate">{item.item_data.title}</p>
              )}
            </div>
            <span className="font-semibold text-gray-900 font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2">
              Qty: {item.quantity}
            </span>
          </div>
          
          {/* Item ID if different from SKU */}
          {item.variation_data?.seller_sku && (
            <p className="text-xs text-gray-500 mb-2 font-mono">
              Item ID: {item.item_id}
            </p>
          )}
          
          {/* Variation ID */}
          {item.variation_id && (
            <p className="text-xs text-gray-500 mb-2 font-mono">
              Variation: {item.variation_id}
            </p>
          )}
          
          {/* User Product ID */}
          {item.variation_data?.user_product_id && (
            <p className="text-xs text-gray-500 mb-2 font-mono">
              Product ID: {item.variation_data.user_product_id}
            </p>
          )}
          
          {/* Variation Attributes */}
          {item.variation_attributes && item.variation_attributes.length > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              <span className="font-medium">Attributes:</span> {formatVariationAttributes(item.variation_attributes)}
            </p>
          )}
          
          {/* Price */}
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-900">
              Unit: {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: item.currency_id || 'ARS'
              }).format(item.unit_price || 0)}
            </p>
            <p className="text-sm font-bold text-gray-900">
              Total: {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: item.currency_id || 'ARS'
              }).format((item.unit_price || 0) * (item.quantity || 0))}
            </p>
          </div>
          
          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            {item.listing_type_id && (
              <div>
                <span className="font-medium">Listing:</span> {item.listing_type_id}
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

  if (loading) {
    return (
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-700">Loading orders...</div>
        </div>
      </div>
    );
  }

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
            <p className="text-2xl font-bold text-green-600">
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

        {/* Main Content Grid */}
        <div className={`grid gap-4 ${showItems ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Orders Grid */}
          <div>
            <div className="p-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Orders</h2>
            </div>

            <AGGridWrapper
              columnDefs={ordersColumnDefs}
              rowData={ordersData}
              filters={filterOptions}
              height="600px"
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
          </div>

          {/* Order Items - Show when order is selected */}
          {showItems && selectedOrder && selectedOrderData && (
            <div>
              <div className="p-3 flex justify-between items-center">
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
                </div>
                <div className="flex gap-3 items-center">
                  <span className="text-sm text-gray-600 px-3 py-1">
                    {selectedOrderItems.length} items
                  </span>
                  <button
                    onClick={() => setShowItems(false)}
                    className="px-3 py-1.5 bg-gray-800 text-stone-50 text-sm rounded-md 
                             hover:bg-gray-700 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                <div className="grid gap-3">
                  {selectedOrderItems.map((item, index) => (
                    <OrderItemCard key={`${item.item_id}-${item.variation_id}-${index}`} item={item} />
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

export default OrdersPage;