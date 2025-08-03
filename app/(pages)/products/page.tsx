"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { AGGridExpandableWrapper, AGGridExpandableColumnTypes } from '@/components/ui/ag-grid-expandable-wrapper';

const ProductsPage = () => {
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options for the AG Grid - all relevant columns
  const filterOptions = [
    { value: 'title', label: 'Product Title' },
    { value: 'id', label: 'Item ID' },
    { value: 'category_id', label: 'Category' },
    { value: 'status', label: 'Status' },
    { value: 'price', label: 'Price' },
    { value: 'available_quantity', label: 'Available Quantity' },
    { value: 'condition', label: 'Condition' },
    { value: 'listing_type', label: 'Listing Type' },
  ];

  // Fetch products data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const organizationId = await getCurrentUserOrganizationId();
      
      // First, get total count
      const { count } = await supabase
        .from('items_view')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gt('v_available_quantity', 0)  // Add filter for z_available_quantity > 0
        .gt('v_sold_quantity', 0);   

      console.log('Total records:', count);

      // Then fetch all records using range pagination
      let allData = [];
      const pageSize = 1000;
      const pages = Math.ceil(count / pageSize);

      for (let i = 0; i < pages; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('items_view')
          .select('*')
          .eq('organization_id', organizationId)
          .gt('v_available_quantity', 0)  // Add filter for z_available_quantity > 0
          .gt('v_sold_quantity', 0)  
          .order('sold_quantity', { ascending: false })
          .range(from, to);

        if (error) throw error;
        allData = [...allData, ...data];
      }

      console.log('Fetched all records:', allData.length);
      
      // grouping logic
      const groupedData = new Map();

      allData.forEach(item => {
        const groupKey = item.family_name || item.item_id;
        
        if (!groupedData.has(groupKey)) {
          groupedData.set(groupKey, []);
        }
        groupedData.get(groupKey).push(item);
      });

      // Process each group
      const processedProducts = [];

      groupedData.forEach((groupItems, groupKey) => {
        // Sort by available_quantity descending to find the parent (most stock)
        groupItems.sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
        
        const parentItem = groupItems[0];
        const variations = [];

        // If there are multiple items in group, others become variations
        if (groupItems.length > 1) {
          // Add other items as family variations
          groupItems.slice(1).forEach(item => {
            variations.push({
              id: item.user_product_id || item.item_id,
              user_product_id: item.user_product_id,
              seller_sku: item.seller_sku,
              v_price: item.price,
              v_available_quantity: item.v_available_quantity,
              v_sold_quantity: item.v_sold_quantity,
              v_thumbnail: item.v_thumbnail || item.thumbnail,
              attributes: item.attributes,
              isVariation: true,
              type: 'family_item',
              // Keep reference to original item data
              original_item: item
            });
          });
        }

        // Add traditional variations (where user_product_id exists and is different from main item)
        groupItems.forEach(item => {
          if (item.user_product_id && item.user_product_id !== item.item_id) {
            variations.push({
              id: item.user_product_id,
              user_product_id: item.user_product_id,
              seller_sku: item.seller_sku,
              v_price: item.v_price || item.price,
              v_available_quantity: item.v_available_quantity || item.available_quantity,
              v_sold_quantity: item.v_sold_quantity || item.sold_quantity,
              v_thumbnail: item.v_thumbnail,
              attributes: item.attributes,
              isVariation: true,
              type: 'variation'
            });
          }
        });

        // Remove duplicates based on user_product_id
        const uniqueVariations = variations.filter((variation, index, self) => 
          index === self.findIndex(v => v.user_product_id === variation.user_product_id)
        );

        // Create the parent product
        processedProducts.push({
          id: parentItem.item_id,
          item_id: parentItem.item_id,
          title: parentItem.title,
          thumbnail: parentItem.thumbnail,
          price: parentItem.price,
          available_quantity: parentItem.available_quantity,
          sold_quantity: parentItem.sold_quantity,
          status: parentItem.status,
          permalink: parentItem.permalink,
          family_name: parentItem.family_name,
          variations_count: uniqueVariations.length,
          variations: uniqueVariations,
          group_size: groupItems.length,
          account: parentItem.nickname,
          category: parentItem.name
        });
      });

      // Sort final products by available_quantity descending
      processedProducts.sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));

      console.log('Grouped data size:', groupedData.size);
      console.log('Processed products:', processedProducts.length);

      setProductsData(processedProducts);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to get child rows (variations) for a product
  const getChildRows = (product) => {
    return product.variations || [];
  };

  // Function to identify if a row is a child
  const isChildRow = (row) => {
    return row.isVariation === true;
  };

  // Get status color
  const getStatusText = (status) => {
    return status || 'unknown';
  };

  // Format price
  const formatPrice = (price, currency = 'ARS') => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  // Format attributes for variations
  const formatAttributes = (attributes) => {
    if (!attributes || typeof attributes !== 'object') return '';
    
    return Object.entries(attributes)
      .map(([key, value]) => {
        if (value && typeof value === 'object' && value.value_name) {
          return `${value.name || key}: ${value.value_name}`;
        }
        return `${key}: ${value}`;
      })
      .slice(0, 3) // Limit to first 3 attributes
      .join(', ');
  };

  // Products column definitions
  const productsColumnDefs = useMemo(() => [
    {
      headerName: 'Image',
      field: 'thumbnail',
      width: 80,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          // Variation image
          return params.data.v_thumbnail ? (
            <img 
              src={params.data.v_thumbnail} 
              alt="Variation"
              className="w-10 h-10 object-cover rounded border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-400">No img</span>
            </div>
          );
        }
        // Product image
        return params.value ? (
          <img 
            src={params.value} 
            alt={params.data.title}
            className="w-10 h-10 object-cover rounded border border-gray-200"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
            <span className="text-xs text-gray-400">No img</span>
          </div>
        );
      }
    },
    AGGridExpandableColumnTypes.childIndicator('Product / SKU', 'title', {
      width: 300,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          // Variation row
          return (
            <div className="flex items-center gap-2">
              {/* <span className="text-gray-400 text-xs">└─</span> */}
              <div>
                <div className="font-medium text-sm">{params.data.seller_sku || 'No SKU'}</div>
                <div className="text-xs text-gray-500 font-mono">{params.data.user_product_id}</div>
              </div>
            </div>
          );
        }
        // Parent product row
        return (
          <div>
            <div className="font-medium text-sm">
              {params.data.permalink ? (
                <a 
                  href={params.data.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800 hover:underline"
                >
                  {params.value}
                </a>
              ) : (
                params.value
              )}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-mono">{params.data.item_id}</span>
              {params.data.family_name && (
                <span className="ml-2">• Family: {params.data.family_name}</span>
              )}
            </div>
          </div>
        );
      }
    }),
    AGGridExpandableColumnTypes.numeric('Price', 'price', {
      width: 120,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return formatPrice(params.data.v_price);
        }
        return formatPrice(params.value);
      }
    }),
    AGGridExpandableColumnTypes.numeric('Available', 'available_quantity', { 
      width: 100,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return (
            <span className="font-medium">
              {params.data.v_available_quantity || 0}
            </span>
          );
        }
        return (
          <span className="font-medium">
            {params.value || 0}
          </span>
        );
      }
    }),
    AGGridExpandableColumnTypes.numeric('Sold', 'sold_quantity', { 
      width: 80,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return params.data.v_sold_quantity || 0;
        }
        return params.value || 0;
      }
    }),
    {
      headerName: 'Status / Attributes',
      field: 'status',
      width: 150,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          // Show attributes for variations
          const attributes = formatAttributes(params.data.attributes);
          return (
            <div className="text-xs text-gray-600">
              {attributes || 'No attributes'}
            </div>
          );
        }
        // Show status for parent products
        return (
          <span className="text-sm font-medium">
            {params.value}
          </span>
        );
      }
    },
    {
      headerName: 'Variations',
      field: 'variations_count',
      width: 100,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return null;
        }
        const count = params.value || 0;
        return (
          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
            {count}
          </span>
        );
      }
    },
    {
      headerName: 'Account',
      field: 'account',
      width: 100,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return null;
        }
        return (
          <span className="text-sm font-medium">
            {params.value}
          </span>
        );
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 100,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return null;
        }
        return (
          <span className="text-sm font-medium">
            {params.value}
          </span>
        );
      }
    }
  ], []);

  if (loading) {
    return (
      <div className="p-6 bg-stone-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-700">Loading products...</div>
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
            <h3 className="font-semibold text-gray-700 mb-1">Total Products</h3>
            <p className="text-2xl font-bold text-gray-900">{productsData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Active Products</h3>
            <p className="text-2xl font-bold text-gray-900">
              {productsData.filter(product => product.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Total Variations</h3>
            <p className="text-2xl font-bold text-gray-900">
              {productsData.reduce((sum, product) => sum + (product.variations_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Low Stock</h3>
            <p className="text-2xl font-bold text-gray-900">
              {productsData.filter(product => (product.available_quantity || 0) < 10 && (product.available_quantity || 0) > 0).length}
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div>


          <AGGridExpandableWrapper
            columnDefs={productsColumnDefs}
            rowData={productsData}
            getChildRows={getChildRows}
            isChildRow={isChildRow}
            filters={filterOptions}
            height="800px"
            expandedByDefault={false}
            defaultColDef={{
              resizable: true,
              sortable: true,
            }}
            gridOptions={{
              pagination: true,
              paginationPageSize: 100,
              rowSelection: 'single',
              suppressRowClickSelection: true,
            }}
          />
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default ProductsPage;