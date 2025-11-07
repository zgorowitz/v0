"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SiteHeader } from "@/components/site-header"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, Upload, Download, FileSpreadsheet, Save, X } from 'lucide-react';
import { fetchAllItems, bulkUpdateItemCogs } from '@/lib/cogs/data';
import { handleFileUpload, generateCSVTemplate, exportToCSV } from '@/lib/cogs/csvHandler';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";

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

export default function Page() {
  const [allItems, setAllItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Lightweight state for tracking edits without triggering cascade re-renders
  const [pendingEdits, setPendingEdits] = useState<Map<string, Partial<ItemRow>>>(new Map());
  const [editedItemIds, setEditedItemIds] = useState<Set<string>>(new Set());

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsFilter = useItemsFilter();

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
    selectAll,
    appliedItemIds
  } = itemsFilter;

  // Filter allItems based on appliedItemIds, or show all if no filter applied
  const filteredItems = useMemo(() => {
    if (appliedItemIds.length === 0) return allItems;
    return allItems.filter(item => appliedItemIds.includes(item.item_id));
  }, [allItems, appliedItemIds]);

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
    selectAll,
    applyFilter: itemsFilter.applyFilter,
    hasPendingChanges: itemsFilter.hasPendingChanges,
    filteredItems
  }), [searchTerm, searchResults, isSearching, selectedItems, addItem, removeItem, clearAll, selectAll, itemsFilter.applyFilter, itemsFilter.hasPendingChanges, filteredItems]);

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

  // Mark an item as edited and store pending changes (doesn't trigger table re-render)
  const markItemEdited = useCallback((itemId: string, changes: Partial<ItemRow>) => {
    setPendingEdits(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId) || {};
      newMap.set(itemId, { ...existing, ...changes });
      return newMap;
    });
    setEditedItemIds(prev => new Set(prev).add(itemId));
  }, []);

  const handleCogsChange = useCallback((itemId: string, value: string) => {
    markItemEdited(itemId, { cogs: value });
  }, [markItemEdited]);

  const handleTagsChange = useCallback((itemId: string, tags: string[]) => {
    markItemEdited(itemId, { tags });
  }, [markItemEdited]);

  const saveChanges = async () => {
    if (pendingEdits.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(pendingEdits.entries()).map(([itemId, changes]) => {
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
      setPendingEdits(new Map());
      setEditedItemIds(new Set());
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
      style={{ width: '50px', height: '40px', objectFit: 'cover', padding: '2px', borderRadius: '6px' }}
    />
  ), []);

  // Simple input component with local state to prevent re-renders
  const CogsInputSimple = React.memo(({ itemId, displayValue, onChange }: any) => {
    const [localValue, setLocalValue] = useState(displayValue);

    // Sync with external changes (from initial load or save)
    useEffect(() => {
      setLocalValue(displayValue);
    }, [displayValue]);

    return (
      <input
        type="number"
        step="0.01"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => onChange(itemId, e.target.value)}
        className="px-2 py-1 border rounded w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0.00"
        data-item-id={itemId}
      />
    );
  });

  const formatCogs = useCallback(({ row }: { row: any }) => {
    const itemId = row.original.item_id;
    const displayValue = row.original.cogs;

    return (
      <CogsInputSimple
        itemId={itemId}
        displayValue={displayValue}
        onChange={handleCogsChange}
      />
    );
  }, [handleCogsChange]);

  // Get all unique tags from all items for suggestions
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) tagsSet.add(tag);
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [allItems]);

  const formatTags = useCallback(({ row }: { row: any }) => {
    const itemId = row.original.item_id;
    // Check pendingEdits first, then fall back to original data
    const pendingTags = pendingEdits.get(itemId)?.tags;
    const displayTags = pendingTags !== undefined ? pendingTags : row.original.tags || [];

    return (
      <TagInput
        value={displayTags}
        onChange={(tags) => handleTagsChange(itemId, tags)}
        availableTags={allUniqueTags}
        placeholder="Select tags..."
      />
    );
  }, [pendingEdits, handleTagsChange, allUniqueTags]);

  const SortableHeader = ({ column, children }: { column: any; children: React.ReactNode }) => (
    <div
      className="flex items-center cursor-pointer select-none"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : null}
    </div>
  );

  const formatItemInfo = ({ row }: { row: any }) => (
    <div style={{ lineHeight: '1.2', padding: '8px' }}>
      <div style={{ fontSize: '11px', color: '#999' }}>{row.original.item_id}</div>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}>{row.original.title}</div>
    </div>
  );

  const columns = useMemo<ColumnDef<ItemRow>[]>(() => [
    { id: 'thumbnail', accessorKey: 'thumbnail', header: '', cell: formatImage, enableSorting: false, meta: { noPadding: true } as any },
    { id: 'item', accessorKey: 'title', header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>, cell: formatItemInfo, meta: { noPadding: true } as any },
    { id: 'cogs', accessorKey: 'cogs', header: ({ column }) => <SortableHeader column={column}>COGS ($)</SortableHeader>, cell: formatCogs },
    { id: 'tags', accessorKey: 'tags', header: 'Tags', cell: formatTags, enableSorting: false }
  ], [formatImage, formatCogs, formatTags]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.item_id,
  });

  return (
    <LayoutWrapper>
      <SiteHeader title="COGS Management" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Placeholder Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 px-4 lg:px-6">
              <div className="col-span-full flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-12">
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    ¿Qué otros gastos te gustaría calcular en tus ganancias?
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground/70">
                    Comparte tus ideas para personalizar este espacio con métricas importantes para tu negocio
                  </p>
                </div>
              </div>
            </div>

            {/* Table Controls */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <div className="min-w-[300px]">
                <ItemsFilter {...stableItemsFilter} />
              </div>
              <div className="flex items-center gap-2">
                {editedItemIds.size > 0 && (
                  <Button
                    onClick={saveChanges}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                  >
                    <Save />
                    <span className="hidden lg:inline">{saving ? 'Saving...' : `Save ${editedItemIds.size} Changes`}</span>
                    <span className="lg:hidden">{saving ? 'Save' : `${editedItemIds.size}`}</span>
                  </Button>
                )}
                <Button
                  onClick={() => generateCSVTemplate()}
                  variant="outline"
                  size="sm"
                >
                  <FileSpreadsheet />
                  <span className="hidden lg:inline">Template</span>
                </Button>
                <Button
                  onClick={() => exportToCSV(filteredItems)}
                  variant="outline"
                  size="sm"
                >
                  <Download />
                  <span className="hidden lg:inline">Export</span>
                </Button>
                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      <Upload />
                      <span className="hidden lg:inline">Upload</span>
                    </span>
                  </Button>
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

            {/* COGS Table */}
            <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-8">
                          Loading data...
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{
                                padding: cell.column.columnDef.meta?.noPadding ? '0' : undefined
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <Button
                onClick={() => setUploadModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUpload}
                disabled={saving}
              >
                {saving ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  )
}
