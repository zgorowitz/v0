"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper";
import { SimpleTable } from '@/components/ui/t_wrapper_v2';
import { fetchAllItems, bulkUpdateItemCogs } from '@/lib/cogs/data';
import { handleFileUpload, generateCSVTemplate, exportToCSV } from '@/lib/cogs/csvHandler';
import { useItemsFilter } from '@/lib/cogs/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { Upload, Download, FileSpreadsheet, Save, X } from 'lucide-react';

interface ItemRow {
  item_id: string;
  title: string;
  thumbnail: string;
  available_quantity: number;
  status: string;
  permalink: string;
  price: number;
  cogs: string; // Always string after normalization for consistent editing
  tags: string[];
  notes: string;
  cogs_id?: string;
}

// Helper function to normalize COGS values to strings
const normalizeCogs = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0';
  return String(value);
};

const CogsManagementPage = () => {
  const [allItems, setAllItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedItems, setEditedItems] = useState<Map<string, Partial<ItemRow>>>(new Map());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsFilter = useItemsFilter(allItems);

  // Destructure and memoize individual properties to prevent reference changes
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedItems,
    addItem,
    removeItem,
    clearAll,
    filteredItems: baseFilteredItems
  } = itemsFilter;

  // Merge edited values into the filtered items data
  const filteredItemsWithEdits = useMemo(() => {
    return baseFilteredItems.map((item: ItemRow) => ({
      ...item,
      // Add edited values to the data itself
      _editedCogs: editedItems.get(item.item_id)?.cogs,
      _editedTags: editedItems.get(item.item_id)?.tags
    }));
  }, [baseFilteredItems, editedItems]);

  // Use the merged data
  const filteredItems = filteredItemsWithEdits;

  // Create a stable filter props object
  const stableItemsFilter = useMemo(() => ({
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    selectedItems,
    addItem,
    removeItem,
    clearAll,
    filteredItems
  }), [searchTerm, searchResults, isSearching, selectedItems, addItem, removeItem, clearAll, filteredItems]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllItems();

      // Normalize all COGS values to strings to prevent conversion issues
      const normalizedData = data.map((item: any) => ({
        ...item,
        cogs: normalizeCogs(item.cogs)  // Ensure COGS is always a string
      }));

      setAllItems(normalizedData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCogsChange = useCallback((itemId: string, value: string) => {
    setEditedItems(prev => {
      const newMap = new Map(prev);
      const updatedItem = {
        ...newMap.get(itemId),
        cogs: value
      };
      newMap.set(itemId, updatedItem);
      return newMap;
    });
  }, []);

  const handleTagsChange = useCallback((itemId: string, value: string) => {
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setEditedItems(prev => {
      const newMap = new Map(prev);
      const updatedItem = {
        ...newMap.get(itemId),
        tags: tagsArray
      };
      newMap.set(itemId, updatedItem);
      return newMap;
    });
  }, []);

  const saveChanges = async () => {
    if (editedItems.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(editedItems.entries()).map(([itemId, changes]) => {
        const item = allItems.find(i => i.item_id === itemId);
        const processedChanges = {
          ...changes,
          // Convert string COGS values to numbers for saving
          ...(changes.cogs !== undefined && { cogs: parseFloat(String(changes.cogs)) || 0 })
        };
        return {
          item_id: itemId,
          title: item?.title || '',
          ...processedChanges
        };
      });

      const result = await bulkUpdateItemCogs(updates);
      setEditedItems(new Map());
      await fetchData();

      // Handle both old array return and new object return
      if (result && typeof result === 'object' && 'processed' in result) {
        if (result.errors && result.errors.length > 0) {
          alert(`Changes saved! ${result.processed} items updated successfully. ${result.errors.length} items had validation errors (check console for details).`);
        } else {
          alert(`Changes saved successfully! ${result.processed} items updated.`);
        }
      } else {
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await handleFileUpload(file);
      setUploadedData(data);
      setUploadModalOpen(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format and try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const confirmUpload = async () => {
    if (uploadedData.length === 0) return;

    setSaving(true);
    try {
      // Ensure COGS values are numbers for upload
      const processedUploadData = uploadedData.map(item => ({
        ...item,
        cogs: parseFloat(String(item.cogs)) || 0
      }));
      const result = await bulkUpdateItemCogs(processedUploadData);
      setUploadModalOpen(false);
      setUploadedData([]);
      await fetchData();

      // Handle both old array return and new object return
      if (result && typeof result === 'object' && 'processed' in result) {
        if (result.errors && result.errors.length > 0) {
          alert(`Upload completed! ${result.processed} out of ${result.total} items uploaded successfully. ${result.errors.length} items had validation errors (check console for details).`);
        } else {
          alert(`Data uploaded successfully! ${result.processed} items processed.`);
        }
      } else {
        alert('Data uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      alert('Error uploading data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatImage = useCallback(({ getValue }: { getValue: () => any }) => (
    <img
      src={getValue()}
      alt="Product"
      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
    />
  ), []);

  // Simple input component that uses data from the row
  const CogsInputSimple = React.memo(({ itemId, displayValue, onChange }: any) => {
    return (
      <input
        type="number"
        step="0.01"
        value={displayValue}
        onChange={(e) => onChange(itemId, e.target.value)}
        className="px-2 py-1 border rounded w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0.00"
        data-item-id={itemId}
      />
    );
  });

  const formatCogs = useCallback(({ row }: { row: any }) => {
    const itemId = row.original.item_id;
    // Get edited value from the row data itself (passed through filteredItemsWithEdits)
    const displayValue = row.original._editedCogs !== undefined
      ? row.original._editedCogs
      : row.original.cogs;

    return (
      <CogsInputSimple
        itemId={itemId}
        displayValue={displayValue}
        onChange={handleCogsChange}
      />
    );
  }, [handleCogsChange]); // Only depends on stable handleCogsChange!

  const formatTags = useCallback(({ row }: { row: any }) => {
    const editedTags = editedItems.get(row.original.item_id)?.tags;
    const displayTags = editedTags !== undefined ? editedTags : row.original.tags;

    return (
      <input
        type="text"
        value={displayTags?.join(', ') || ''}
        onChange={(e) => handleTagsChange(row.original.item_id, e.target.value)}
        className="px-2 py-1 border rounded w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="tag1, tag2, tag3"
        key={`tags-${row.original.item_id}`}
      />
    );
  }, [editedItems, handleTagsChange]);

  const columns = useMemo(() => [
      { accessorKey: 'thumbnail', header: 'Image', cell: formatImage },
      { accessorKey: 'item_id', header: 'Item ID' },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'cogs', header: 'COGS ($)', cell: formatCogs },
      { accessorKey: 'tags', header: 'Tags', cell: formatTags },
    { accessorKey: 'available_quantity', header: 'Stock' },
    { accessorKey: 'status', header: 'Status' }
  ], [formatImage, formatCogs, formatTags]);

  const customControls = useMemo(() => (
    <div className="flex justify-between items-start w-full">
      <div className="min-w-[300px]">
        <ItemsFilter {...stableItemsFilter} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {editedItems.size > 0 && (
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : `Save ${editedItems.size} Changes`}
          </button>
        )}
        <button
          onClick={() => generateCSVTemplate()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-gray-600 rounded hover:bg-gray-50"
        >
          <FileSpreadsheet size={14} />
          Template
        </button>
        <button
          onClick={() => exportToCSV(filteredItems)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-gray-600 rounded hover:bg-gray-50"
        >
          <Download size={14} />
          Export
        </button>
        <label className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-gray-600 rounded hover:bg-gray-50 cursor-pointer">
          <Upload size={14} />
          Upload
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
    </div>
  ), [stableItemsFilter, editedItems.size, saving, filteredItems, handleFileSelect]);

  return (
    <LayoutWrapper>
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">COGS Management</h1>
        </div>

        <SimpleTable
          data={filteredItems as any}
          columns={columns as any}
          loading={loading}
          pageSize={50}
          enableSearch={false}
          customControls={customControls as any}
          getRowId={(row) => row.item_id}
        />

        {/* Upload Preview Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Preview Upload Data</h2>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Found {uploadedData.length} items to update. Review the data below:
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Item ID</th>
                      <th className="border px-4 py-2 text-left">Title</th>
                      <th className="border px-4 py-2 text-left">COGS</th>
                      <th className="border px-4 py-2 text-left">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedData.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="border px-4 py-2">{item.item_id}</td>
                        <td className="border px-4 py-2">{item.title}</td>
                        <td className="border px-4 py-2">${item.cogs}</td>
                        <td className="border px-4 py-2">
                          {item.tags?.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedData.length > 10 && (
                  <p className="text-sm text-gray-600 mt-2">
                    ... and {uploadedData.length - 10} more items
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
};

export default CogsManagementPage;