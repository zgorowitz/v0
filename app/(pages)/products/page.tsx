// app/(pages)/products/page.tsx
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { EnhancedTableWrapper, TableColumnTypes } from '@/components/ui/enhanced-table-wrapper';

const ProductsPage = () => {
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options for the table
  const filterOptions = [
    { value: 'title', label: 'Product Title' },
    { value: 'id', label: 'Item ID' },
    { value: 'category', label: 'Category' },
    { value: 'status', label: 'Status' },
    { value: 'account', label: 'Account' },
    { value: 'family_name', label: 'Family Name' },
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
        .gt('v_available_quantity', 0)
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
          .gt('v_available_quantity', 0)
          .gt('v_sold_quantity', 0)  
          .order('sold_quantity', { ascending: false })
          .range(from, to);

        if (error) throw error;
        allData = [...allData, ...data];
      }

      console.log('Fetched all records:', allData.length);
      
      // Grouping logic
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
        // Sort by sold_quantity descending to find the parent (most sold)
        groupItems.sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
        
        const parentItem = groupItems[0];
        const variations = [];

        // If there are multiple items in group, others become variations
        if (groupItems.length > 1) {
          // Add other items as family variations
          groupItems.slice(1).forEach((item, index) => {
            variations.push({
              id: `${item.item_id}_var_${index}`,
              item_id: item.item_id,
              user_product_id: item.user_product_id,
              seller_sku: item.seller_sku,
              title: item.seller_sku || `Variation ${index + 1}`,
              thumbnail: item.v_thumbnail || item.thumbnail,
              price: item.price,
              available_quantity: item.v_available_quantity || item.available_quantity,
              sold_quantity: item.v_sold_quantity || item.sold_quantity,
              attributes: item.attributes,
              type: 'family_item',
              isVariation: true,
            });
          });
        }

        // Add traditional variations (where user_product_id exists and is different from main item)
        groupItems.forEach((item, index) => {
          if (item.user_product_id && item.user_product_id !== item.item_id) {
            variations.push({
              id: `${item.user_product_id}_${index}`,
              item_id: item.item_id,
              user_product_id: item.user_product_id,
              seller_sku: item.seller_sku,
              title: item.seller_sku || 'Product Variation',
              thumbnail: item.v_thumbnail,
              price: item.v_price || item.price,
              available_quantity: item.v_available_quantity || item.available_quantity,
              sold_quantity: item.v_sold_quantity || item.sold_quantity,
              attributes: item.attributes,
              type: 'variation',
              isVariation: true,
            });
          }
        });

        // Remove duplicates based on user_product_id
        const uniqueVariations = variations.filter((variation, index, self) => 
          index === self.findIndex(v => v.user_product_id === variation.user_product_id)
        );

        // Create the parent product with subRows for TanStack Table
        const parentProduct = {
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
          group_size: groupItems.length,
          account: parentItem.nickname,
          category: parentItem.name,
          // TanStack Table uses subRows for child data
          subRows: uniqueVariations,
        };

        processedProducts.push(parentProduct);
      });

      // Sort final products by sold_quantity descending
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

  // Table column definitions using TanStack Table
  const columns = useMemo(() => [
    TableColumnTypes.image('Image', 'thumbnail', {
      width: 80,
      alt: 'Product',
    }),
    
    {
      header: 'Product / SKU',
      accessorKey: 'title',
      size: 300,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const data = row.original;
        
        if (data.isVariation) {
          // Variation row
          return (
            <div>
              <span></span>
              <div>
                <div >{data.seller_sku || 'No SKU'}</div>
                <div className="text-xs text-gray-500 font-mono">{data.user_product_id}</div>
              </div>
            </div>
          );
        }
        
        // Parent product row
        return (
          <div>
            <div className="font-medium text-sm">
              {data.permalink ? (
                <a 
                  href={data.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-mono">{data.item_id}</span>
              {data.family_name && (
                <span className="ml-2">• Family: {data.family_name}</span>
              )}
            </div>
          </div>
        );
      }
    },

    TableColumnTypes.currency('Price', 'price', {
      width: 120,
      currency: 'ARS',
    }),

    TableColumnTypes.numeric('Available', 'available_quantity', { 
      width: 100,
      cell: ({ getValue, row }) => {
        const value = getValue();
        return (
          <span>
            {value || 0}
          </span>
        );
      }
    }),

    TableColumnTypes.numeric('Sold', 'sold_quantity', { 
      width: 80,
      cell: ({ getValue }) => {
        const value = getValue();
        return value || 0;
      }
    }),

    {
      header: 'Status / Attributes',
      accessorKey: 'status',
      size: 150,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const data = row.original;
        
        if (data.isVariation) {
          return (
            <div>

              {data.attributes && (
                <div>
                  {formatAttributes(data.attributes)}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <span>
            {value || 'Active'}
          </span>
        );
      }
    },

    TableColumnTypes.badge('Variations', 'variations_count', {
      width: 100,
      cell: ({ getValue, row }) => {
        if (row.original.isVariation) {
          return null;
        }
        const count = getValue() || 0;
        return (
          <span>
            {count}
          </span>
        );
      }
    }),

    TableColumnTypes.text('Account', 'account', {
      width: 100,
      cell: ({ getValue, row }) => {
        if (row.original.isVariation) {
          return null;
        }
        return (
          <span>
            {getValue()}
          </span>
        );
      }
    }),

    TableColumnTypes.text('Category', 'category', {
      width: 120,
      cell: ({ getValue, row }) => {
        if (row.original.isVariation) {
          return null;
        }
        return (
          <span>
            {getValue()}
          </span>
        );
      }
    }),
  ], []);

  // Function to get sub-rows (variations) for TanStack Table
  const getSubRows = (row) => {
    return row.subRows || [];
  };

  // if (loading) {
  //   return (
  //     <div className="p-6 bg-stone-50 min-h-screen">
  //       <div className="flex items-center justify-center h-64">
  //         <div className="text-lg text-gray-700">Loading products...</div>
  //       </div>
  //     </div>
  //   );
  // }

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
      <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Products</h3>
            <p className="text-2xl font-bold text-gray-900">{productsData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-1">Variations</h3>
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

        {/* Products Table */}
        <div>
          <EnhancedTableWrapper
            data={productsData}
            columns={columns}
            getSubRows={getSubRows}
            enableExpanding={true}
            enableSorting={true}
            enableFiltering={true}
            enablePagination={true}
            pageSize={50}
            filterColumns={filterOptions}
            height="700px"
            expandedByDefault={false}
            onRefresh={fetchProducts}
            onRowClick={(row) => {
              if (row.permalink) {
                window.open(row.permalink, '_blank');
              }
            }}
          />
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default ProductsPage;