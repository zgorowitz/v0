"use client"

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Item {
  item_id: string;
  title: string;
  thumbnail?: string;
}

interface ItemsFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: Item[];
  isSearching: boolean;
  selectedItems: Item[];
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  clearAll: () => void;
}

export function ItemsFilter({
  searchTerm,
  setSearchTerm,
  searchResults,
  isSearching,
  selectedItems,
  addItem,
  removeItem,
  clearAll
}: ItemsFilterProps) {
  return (
    <div className="space-y-2">
      {/* Search Input with Dropdown Results */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by item ID or title..."
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          </div>
        )}
        
        {/* Dropdown with search results */}
        {searchResults.length > 0 && !isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map(item => (
              <button
                key={item.item_id}
                onClick={() => addItem(item)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
              >
                {item.thumbnail && (
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.item_id}</div>
                  <div className="text-xs text-gray-600 truncate">{item.title}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Items as Badges */}
      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map(item => (
              <Badge key={item.item_id} variant="secondary" className="pr-1">
                <span className="max-w-[150px] truncate" title={item.title}>
                  {item.item_id}
                </span>
                <button
                  onClick={() => removeItem(item.item_id)}
                  className="ml-2 hover:text-red-500 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}