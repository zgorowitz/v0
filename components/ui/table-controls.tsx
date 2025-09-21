"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Download } from 'lucide-react';
import { exportTableToCSV } from '@/lib/utils/table-export';

interface ColumnSelectorProps {
  table: any;
}

export function ColumnSelector({ table }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const columns = table.getAllColumns()
    .filter((column: any) => column.id !== 'actions' && column.getCanHide());

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded hover:bg-gray-100 transition-colors"
        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Select columns"
      >
        <Settings size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
             style={{ minWidth: '180px', maxHeight: '300px', overflowY: 'auto' }}>
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-700 px-2 py-1 border-b mb-1">
              Toggle Columns
            </div>
            {columns.map((column: any) => {
              const isVisible = column.getIsVisible();
              return (
                <label
                  key={column.id}
                  className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded"
                  style={{
                    backgroundColor: isVisible ? '#e8f4fc' : 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                    className="mr-2"
                    style={{ width: '14px', height: '14px' }}
                  />
                  <span className="text-sm" style={{ color: isVisible ? '#000' : '#666' }}>
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.columnDef.accessorKey || column.id}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExportButtonProps {
  table: any;
  filename?: string;
}

export function ExportButton({ table, filename = 'table_export' }: ExportButtonProps) {
  return (
    <button
      onClick={() => exportTableToCSV(table, filename)}
      className="p-2 rounded hover:bg-gray-100 transition-colors"
      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      title="Export to CSV"
    >
      <Download size={14} />
    </button>
  );
}