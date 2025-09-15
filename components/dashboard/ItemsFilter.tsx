"use client"

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
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
  applyFilter: () => void;
  hasPendingChanges: boolean;
}

export function ItemsFilter({
  searchTerm,
  setSearchTerm,
  searchResults,
  isSearching,
  selectedItems,
  addItem,
  removeItem,
  clearAll,
  applyFilter,
  hasPendingChanges
}: ItemsFilterProps) {
  const [showSelectedDropdown, setShowSelectedDropdown] = useState(false);

  return (
    <div className="space-y-2">
      {/* Search Input with Dropdown Results */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item ID or title..."
            className="flex-1 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Selected Items Button */}
          {selectedItems.length > 0 && (
            <button
              onClick={() => setShowSelectedDropdown(!showSelectedDropdown)}
              className="flex items-center gap-1 px-3 py-2 bg-white text-gray-600 rounded hover:bg-gray-50"
            >
              <span className="text-sm font-medium">
                {selectedItems.length}
              </span>
              <ChevronDown size={14} className={`transition-transform ${showSelectedDropdown ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Filter Button */}
          {hasPendingChanges && (
            <button
              onClick={applyFilter}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium text-sm"
            >
              Filter
            </button>
          )}
        </div>

        {/* Selected Items Dropdown */}
        {showSelectedDropdown && selectedItems.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowSelectedDropdown(false)}
            />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg right-0 max-h-48 overflow-auto">
                    <div className="px-2 py-1.5 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        {selectedItems.length} selected
                      </span>
                      <button
                        onClick={clearAll}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-1 space-y-0.5">
                      {selectedItems.map(item => (
                        <div
                          key={item.item_id}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-4 h-4 object-cover rounded"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900">{item.item_id}</div>
                              <div className="text-xs text-gray-500 truncate">{item.title}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.item_id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

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
    </div>
  );
}