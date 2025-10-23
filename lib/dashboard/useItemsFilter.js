import { useState, useEffect, useMemo } from 'react';
import { getAllFilterItems } from './data';

export function useItemsFilter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [appliedItems, setAppliedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[useItemsFilter] selectedItems changed:', selectedItems);
  }, [selectedItems]);

  useEffect(() => {
    console.log('[useItemsFilter] appliedItems changed:', appliedItems);
  }, [appliedItems]);

  // Fetch all items once on mount
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      const items = await getAllFilterItems();
      setAllItems(items);
      setIsLoading(false);
    };
    fetchItems();
  }, []);

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

  const addItem = (item) => {
    if (!selectedItems.find(i => i.item_id === item.item_id)) {
      setSelectedItems(prev => [...prev, item]);
    }
    // Don't clear search term - allow multiple selections
  };

  const removeItem = (itemId) => {
    setSelectedItems(prev => prev.filter(item => item.item_id !== itemId));
  };

  const clearAll = () => {
    setSelectedItems([]);
  };

  const applyFilter = () => {
    setAppliedItems(selectedItems);
  };

  const hasPendingChanges = JSON.stringify(selectedItems) !== JSON.stringify(appliedItems);

  // Memoize the ID arrays to prevent unnecessary re-renders
  const selectedItemIds = useMemo(() => {
    const ids = selectedItems.map(item => item.item_id);
    console.log('[useItemsFilter] Memoizing selectedItemIds:', ids);
    return ids;
  }, [selectedItems]);

  const appliedItemIds = useMemo(() => {
    const ids = appliedItems.map(item => item.item_id);
    console.log('[useItemsFilter] Memoizing appliedItemIds:', ids);
    return ids;
  }, [appliedItems]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: false,
    selectedItems,
    selectedItemIds,
    appliedItemIds,
    addItem,
    removeItem,
    clearAll,
    applyFilter,
    hasPendingChanges,
    isLoading
  };
}