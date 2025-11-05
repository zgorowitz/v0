"use client"

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  selectAll: () => void;
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
  selectAll,
  applyFilter,
  hasPendingChanges
}: ItemsFilterProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAddItem = (item: Item) => {
    addItem(item);
    // Don't close dropdown after adding item
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
    // Don't close dropdown after removing item
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  return (
    <div className="space-y-2 w-full">
      {/* Search Input with Dropdown Results */}
      <div className="relative w-full">
        <div className="flex gap-2">
          <Input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search by item ID or title..."
            className="flex-1 max-w-2xl"
          />

          {/* Filter Button */}
          <Button onClick={applyFilter} variant="outline" disabled={!hasPendingChanges}>
            Search{selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}
          </Button>
        </div>

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          </div>
        )}

        {/* Combined Dropdown - Selected Items + Search Results */}
        {showDropdown && (searchResults.length > 0 || selectedItems.length > 0) && !isSearching && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[500px] overflow-auto">
              {/* Selected Items Section */}
              {selectedItems.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Selected ({selectedItems.length})
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAll();
                        }}
                        className="h-6 text-xs text-blue-500 hover:text-blue-700"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAll();
                        }}
                        className="h-6 text-xs text-red-500 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    {selectedItems.map(item => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.thumbnail && (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900">{item.item_id}</div>
                            <div className="text-xs text-gray-600 truncate">{item.title}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.item_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:text-red-500"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results Section */}
              {searchResults.length > 0 && (
                <div>
                  {selectedItems.length > 0 && (
                    <div className="px-3 py-2 bg-gray-50 sticky top-0 z-10">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Search Results
                      </span>
                    </div>
                  )}
                  {searchResults.map(item => {
                    const isSelected = selectedItems.some(s => s.item_id === item.item_id);
                    return (
                      <Button
                        key={item.item_id}
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelected) {
                            handleAddItem(item);
                          }
                        }}
                        disabled={isSelected}
                        className={`w-full h-auto justify-start px-3 py-2 border-b last:border-b-0 rounded-none ${
                          isSelected
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                      >
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-8 h-8 object-cover rounded mr-2"
                          />
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-sm">{item.item_id}</div>
                          <div className="text-xs text-gray-600 truncate">{item.title}</div>
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs ml-2">Selected</Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}