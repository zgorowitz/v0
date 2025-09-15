// lib/cogs/useItemsFilter.js
import { useState, useMemo, useCallback } from 'react';

export function useItemsFilter(allItems = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [appliedItems, setAppliedItems] = useState([]);

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

  const applyFilter = useCallback(() => {
    setAppliedItems(selectedItems);
  }, [selectedItems]);

  const hasPendingChanges = JSON.stringify(selectedItems) !== JSON.stringify(appliedItems);

  // Get filtered data based on applied items (not selected)
  const filteredItems = useMemo(() => {
    if (appliedItems.length === 0) return allItems;

    const appliedIds = appliedItems.map(item => item.item_id);
    return allItems.filter(item => appliedIds.includes(item.item_id));
  }, [allItems, appliedItems]);

  // Memoize selectedItemIds to prevent array recreation
  const selectedItemIds = useMemo(() =>
    selectedItems.map(item => item.item_id),
    [selectedItems]
  );

  const appliedItemIds = useMemo(() =>
    appliedItems.map(item => item.item_id),
    [appliedItems]
  );

  // Memoize the return object to prevent reference changes
  return useMemo(() => ({
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: false, // No async searching, just filtering locally
    selectedItems,
    selectedItemIds,
    appliedItemIds,
    addItem,
    removeItem,
    clearAll,
    applyFilter,
    hasPendingChanges,
    filteredItems // Return filtered data for the table
  }), [searchTerm, searchResults, selectedItems, selectedItemIds, appliedItemIds, addItem, removeItem, clearAll, applyFilter, hasPendingChanges, filteredItems]);
}