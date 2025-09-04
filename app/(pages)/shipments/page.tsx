

"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { AGGridWrapper, AGGridColumnTypes } from '@/components/ui/ag-grid-wrapper';
import { Button } from '@/components/ui/button';
import { Package, Loader2 } from 'lucide-react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';

const ShipmentsPage = () => {
  const [shipmentData, setShipmentData] = useState<any[]>([]);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [packingLoading, setPackingLoading] = useState<string | null>(null);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [selectedShipmentToPack, setSelectedShipmentToPack] = useState<string | null>(null);
  // Initialize date filter with today's date
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState({ from: today, to: today });
  const itemsCardRef = useRef<HTMLDivElement>(null);

  // Filter options for the AG Grid
  const filterOptions = [
    { value: 'sku_list', label: 'SKU' },
    { value: 'account', label: 'Account' },
    { value: 'category', label: 'Category' },
    { value: 'shipment_id', label: 'Shipment ID' },
    { value: 'total_items', label: 'Total Items' },
    { value: 'shipment_status', label: 'status' },
    { value: 'shipment_last_updated', label: 'last_updated' },
  ];


  // Fetch shipments data
  useEffect(() => {
    fetchShipments();
  }, [dateFilter]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      
      const userOrganizationId = await getCurrentUserOrganizationId();
      if (!userOrganizationId) {
        setError('No organization found for user');
        return;
      }
      
      // Build the query with date filtering
      let shipmentsQuery = supabase
        .from('shipments_packing_view')
        .select('*')
        .eq('organization_id', userOrganizationId);

      const startDate = new Date(`${dateFilter.from}T00:00:00`);
      const endDate = new Date(`${dateFilter.to}T23:59:59`);
             
      shipmentsQuery = shipmentsQuery.gte('shipment_created', startDate.toISOString());
      shipmentsQuery = shipmentsQuery.lte('shipment_created', endDate.toISOString());

      // Get shipments data
      const { data, error } = await shipmentsQuery.order('shipment_id');

      if (error) throw error;

      // Get packing data separately
      const { data: packingData } = await supabase
        .from('shipment_packing')
        .select('*');

      // Create packing lookup map
      const packingMap = new Map();
      packingData?.forEach(pack => {
        packingMap.set(pack.shipment_id, pack);
      });

      // Combine data manually
      const enrichedData = data.map(item => ({
        ...item,
        shipment_packing: packingMap.get(item.shipment_id) ? [packingMap.get(item.shipment_id)] : []
      }));

      // Group data by shipment_id
      const { shipments, allItems } = groupShipmentData(enrichedData);
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
        const packingInfo = item.shipment_packing?.[0]; // Get first packing record
        shipmentMap.set(shipmentId, {
          shipment_id: shipmentId,
          shipment_status: item.shipment_status,
          shipment_updated: item.shipment_last_updated,
          account: item.nickname,
          total_orders: item.total_orders,
          total_items: item.total_items,
          category: item.name,
          shipment_created: item.shipment_created,
          sku_list: [item.seller_sku],
          packed_by_name: packingInfo?.packed_by_name || null,
          packed_at: packingInfo?.created_at || null,
          is_packed: !!packingInfo
        });
      } else {
        const existing = shipmentMap.get(shipmentId);
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
        item_thumbnail: item.picture_url,
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
  const handleShipmentSelect = (shipmentId: any) => {
    setSelectedShipment(shipmentId);
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

  // Handle pack shipment
  const handlePackShipment = async (shipmentId: string) => {
    setPackingLoading(shipmentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('shipment_packing')
        .insert({
          shipment_id: shipmentId,
          packed_by_user_id: user.id,
          packed_by_name: user.user_metadata?.name || user.user_metadata?.full_name || 'Usuario',
          packed_by_email: user.email
        })
        .select()
        .single();

      if (error) throw error;

      // Update only the packed shipment row locally
      setShipmentData(prevShipments => 
        prevShipments.map(shipment => 
          shipment.shipment_id === shipmentId 
            ? { 
                ...shipment, 
                is_packed: true, 
                packed_by_name: data.packed_by_name,
                packed_at: data.created_at 
              }
            : shipment
        )
      );
    } catch (err: any) {
      setError(`Error al empacar: ${err.message}`);
      console.error('Packing error:', err);
    } finally {
      setPackingLoading(null);
    }
  };

  // Shipment column definitions using the reusable column types
  const shipmentColumnDefs = useMemo(() => [
    AGGridColumnTypes.actionButton(
      "Abrir",
      (data: any) => handleShipmentSelect(data.shipment_id),
      "+"
    ),
    AGGridColumnTypes.numeric('Items', 'total_items', { width: 120, filter: true }),
    AGGridColumnTypes.array('SKUs', 'sku_list', { width: 120, filter: true, }),
    {
      headerName: 'Status',
      field: 'shipment_status',
      width: 120,
      filter: true
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 120,
      filter: true
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
      headerName: 'Packed By',
      field: 'packed_by_name',
      width: 120,
      filter: true,
      cellRenderer: (params: any) => {
        return params.value || '-';
      }
    },
    AGGridColumnTypes.actionButton(
      "Empacar",
      (data: any) => {
        if (data.is_packed) return; // Do nothing if already packed
        handlePackShipment(data.shipment_id);
      },
      


    ),
    AGGridColumnTypes.date('shipment_created', 'shipment_created'),
    AGGridColumnTypes.date('shipment_updated', 'shipment_updated'),
    AGGridColumnTypes.date('packed_at', 'packed_at')
  ], [packingLoading]);

  // Get items for selected shipment
  const selectedShipmentItems = useMemo(() => {
    if (!selectedShipment) return [];
    return itemsData.filter(item => item.shipment_id === selectedShipment);
  }, [selectedShipment, itemsData]);

  // Item Card Component
  const ItemCard = ({ item }) => (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-colors">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {item.item_thumbnail && (
          <div className="flex-shrink-0">
            <img 
              src={item.item_thumbnail} 
              alt= {item.sku}
              className="w-12 h-12 object-cover rounded border border-gray-200"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-gray-900 text-sm truncate">{item.sku}</h3>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex-shrink-0 ml-2">
              Qty: {item.quantity}
            </span>
          </div>
          
          {/* Title */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.item_title}</p>
          
          {/* Price */}
          {item.unit_price && (
            <p className="text-xs font-medium text-gray-900 mb-1">
              ${item.unit_price} {item.currency_id}
            </p>
          )}
          
          {/* Variation */}
          {item.variation_attributes && formatVariationAttributes(item.variation_attributes) && (
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-medium">Var:</span> {formatVariationAttributes(item.variation_attributes)}
            </p>
          )}
          
          {/* IDs */}
          <div className="flex gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Item:</span> {item.item_id}
            </div>
            <div>
              <span className="font-medium">Order:</span> {item.order_id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // if (loading) {
  //   return (
  //     <div className="p-6 bg-stone-50 min-h-screen">
  //       <div className="flex items-center justify-center h-64">
  //         <div className="text-lg text-gray-700">Loading shipments...</div>
  //       </div>
  //     </div>
  //   );
  // }

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
{/* <div>
<h2 className="text-3xl font-semibold text-red-800 mb-4">Que te Parece Eli?</h2>
</div> */}

      <div className="p-6 space-y-4 bg-stone-50 min-h-screen">
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

        {/* Main Content - Single column */}
        <div className="grid gap-4 grid-cols-1">
          {/* Shipments Grid */}
          <div className="relative">
            <AGGridWrapper
              columnDefs={shipmentColumnDefs}
              rowData={shipmentData}
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

        {/* Items Popup - Show when shipment is selected */}
        {showItems && selectedShipment && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div ref={itemsCardRef} className="bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Items for Shipment #{selectedShipment}
                  </h2>
                  <span className="text-sm text-gray-600">
                    {selectedShipmentItems.length} items
                  </span>
                </div>
                <button
                  onClick={() => setShowItems(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-4">
                <div className="space-y-3">
                  {selectedShipmentItems.map((item, index) => (
                    <ItemCard key={`${item.item_id}-${item.variation_id}-${index}`} item={item} />
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

export default ShipmentsPage;