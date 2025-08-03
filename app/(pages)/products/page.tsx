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
      
      // Get products only for the organization's meli_user_ids
      const { data: products, error: productsError } = await supabase
        .from('meli_items')
        .select('*')
        .in('meli_user_id', meliUserIds)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit for performance

      if (productsError) throw productsError;

      // Get all variations for these products
      const productIds = products.map(product => product.id);
      const { data: variations, error: variationsError } = await supabase
        .from('meli_variations')
        .select('*')
        .in('item_id', productIds);

      if (variationsError) throw variationsError;

      // Group products by family_name to handle family-based variations
      const productsByFamily = new Map();
      const standaloneProducts = [];

      products.forEach(product => {
        if (product.family_name) {
          if (!productsByFamily.has(product.family_name)) {
            productsByFamily.set(product.family_name, []);
          }
          productsByFamily.get(product.family_name).push(product);
        } else {
          standaloneProducts.push(product);
        }
      });

      // Group variations by item_id
      const variationsByProduct = variations.reduce((acc, variation) => {
        if (!acc[variation.item_id]) {
          acc[variation.item_id] = [];
        }
        acc[variation.item_id].push({
          ...variation,
          id: variation.user_product_id || variation.variation_id || `${variation.item_id}_${variation.id}`,
          isVariation: true,
          type: 'variation'
        });
        return acc;
      }, {});

      const processedProducts = [];

      // Process family-based products
      productsByFamily.forEach((familyProducts, familyName) => {
        // Sort family products by created_at to get the "main" product (first one)
        familyProducts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const mainProduct = familyProducts[0];
        const siblingProducts = familyProducts.slice(1);

        // Collect all variations for this family
        const allVariations = [];
        
        // Add traditional variations from all family products
        familyProducts.forEach(product => {
          const productVariations = variationsByProduct[product.id] || [];
          allVariations.push(...productVariations);
        });

        // Add sibling products as "family variations"
        siblingProducts.forEach(siblingProduct => {
          allVariations.push({
            ...siblingProduct,
            id: siblingProduct.id,
            isVariation: true,
            type: 'family_item',
            // Keep original product fields but mark as variation
            item_id: siblingProduct.id,
            seller_sku: `ITEM-${siblingProduct.id}`, // Generate SKU for family items
            picture_url: siblingProduct.thumbnail,
            price: siblingProduct.price,
            available_quantity: siblingProduct.available_quantity,
            sold_quantity: siblingProduct.sold_quantity
          });
        });

        // Create enhanced main product
        processedProducts.push({
          ...mainProduct,
          variations_count: allVariations.length,
          variations: allVariations,
          family_size: familyProducts.length
        });
      });

      // Process standalone products (no family_name)
      standaloneProducts.forEach(product => {
        const productVariations = variationsByProduct[product.id] || [];
        processedProducts.push({
          ...product,
          variations_count: productVariations.length,
          variations: productVariations,
          family_size: 1
        });
      });

      // Sort final products by created_at
      processedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
          return params.data.picture_url ? (
            <img 
              src={params.data.picture_url} 
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
    AGGridExpandableColumnTypes.childIndicator('Title / SKU', 'title', {
      width: 250,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          // Handle different types of variations
          if (params.data.type === 'family_item') {
            // Family item (sibling product)
            return (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">└─</span>
                <div>
                  <div className="font-medium text-sm">{params.data.title}</div>
                  <div className="text-xs text-gray-500">Family Item • {params.data.seller_sku}</div>
                </div>
              </div>
            );
          } else {
            // Traditional variation
            return (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">└─</span>
                <div>
                  <div className="font-medium text-sm">{params.data.seller_sku || 'No SKU'}</div>
                  <div className="text-xs text-gray-500">Variation • {params.data.variation_id || params.data.user_product_id}</div>
                </div>
              </div>
            );
          }
        }
        return (
          <div>
            <div className="font-medium text-sm">{params.value}</div>
            <div className="text-xs text-gray-500">
              <span className="font-mono">{params.data.id}</span>
              {params.data.family_name && (
                <span className="ml-2">• Family: {params.data.family_name}</span>
              )}
            </div>
          </div>
        );
      }
    }),
    {
      headerName: 'Category',
      field: 'category_id',
      width: 120,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          const attributes = formatAttributes(params.data.attributes);
          return (
            <div className="text-xs text-gray-600">
              {attributes || 'No attributes'}
            </div>
          );
        }
        return params.value;
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 100,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return (
            <span className="text-xs text-gray-500">
              Variation
            </span>
          );
        }
        return (
          <span className="text-sm font-medium">
            {params.value}
          </span>
        );
      }
    },
    AGGridExpandableColumnTypes.numeric('Price', 'price', {
      width: 120,
      formatter: (params) => formatPrice(params.value)
    }),
    AGGridExpandableColumnTypes.numeric('Available', 'available_quantity', { 
      width: 100,
      cellRenderer: (params) => {
        const value = params.value || 0;
        return (
          <span className="font-medium">
            {value}
          </span>
        );
      }
    }),
    AGGridExpandableColumnTypes.numeric('Sold', 'sold_quantity', { width: 80 }),
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
      headerName: 'Listing Type',
      field: 'listing_type',
      width: 120,
      cellRenderer: (params) => {
        if (params.data._isChild) {
          return null;
        }
        return params.value;
      }
    },
    AGGridExpandableColumnTypes.date('Created', 'created_at', { width: 160 }),
    AGGridExpandableColumnTypes.date('Updated', 'updated_at', { width: 160 })
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
          <div className="p-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Products & Variations</h2>
          </div>

          <AGGridExpandableWrapper
            columnDefs={productsColumnDefs}
            rowData={productsData}
            getChildRows={getChildRows}
            isChildRow={isChildRow}
            filters={filterOptions}
            height="700px"
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