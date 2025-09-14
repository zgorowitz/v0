// lib/cogs/useItemsFilter.js
import { useState, useMemo, useCallback } from 'react';

export function useItemsFilter(allItems = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Filter items locally based on search term
  const searchResults = useMemo(() => {
    if (searchTerm.length <= 1) return [];

    const term = searchTerm.toLowerCase();
    return allItems
      .filter(item =>
        item.item_id.toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term)
      )
      .slice(0, 20); // Limit to 20 results for performance
  }, [searchTerm, allItems]);

  const addItem = useCallback((item) => {
    setSelectedItems(prev => {
      if (!prev.find(i => i.item_id === item.item_id)) {
        return [...prev, item];
      }
      return prev;
    });
    setSearchTerm('');
  }, []);

  const removeItem = useCallback((itemId) => {
    setSelectedItems(prev => prev.filter(item => item.item_id !== itemId));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Get filtered data based on selected items
  const filteredItems = useMemo(() => {
    if (selectedItems.length === 0) return allItems;

    const selectedIds = selectedItems.map(item => item.item_id);
    return allItems.filter(item => selectedIds.includes(item.item_id));
  }, [allItems, selectedItems]);

  // Memoize selectedItemIds to prevent array recreation
  const selectedItemIds = useMemo(() =>
    selectedItems.map(item => item.item_id),
    [selectedItems]
  );

  // Memoize the return object to prevent reference changes
  return useMemo(() => ({
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: false, // No async searching, just filtering locally
    selectedItems,
    selectedItemIds,
    addItem,
    removeItem,
    clearAll,
    filteredItems // Return filtered data for the table
  }), [searchTerm, searchResults, selectedItems, selectedItemIds, addItem, removeItem, clearAll, filteredItems]);
}