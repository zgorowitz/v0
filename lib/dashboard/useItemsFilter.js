import { useState, useEffect, useMemo } from 'react';
import { getAllFilterItems } from './data';

export function useItemsFilter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    setSearchTerm('');
  };

  const removeItem = (itemId) => {
    setSelectedItems(prev => prev.filter(item => item.item_id !== itemId));
  };

  const clearAll = () => {
    setSelectedItems([]);
  };

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: false, // No longer searching, just filtering locally
    selectedItems,
    selectedItemIds: selectedItems.map(item => item.item_id),
    addItem,
    removeItem,
    clearAll,
    isLoading // Initial loading state
  };
}