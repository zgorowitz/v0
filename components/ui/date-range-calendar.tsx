import React, { useState } from 'react';
import { DayPicker, DateRange as DayPickerDateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (startDate: string, endDate: string) => void;
}

export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({ 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const [range, setRange] = useState<DateRange>({ from: undefined, to: undefined });

  const formatDateCompact = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleApply = () => {
    if (range.from && range.to) {
      const startDate = range.from.toISOString().split('T')[0];
      const endDate = range.to.toISOString().split('T')[0];
      onSelect(startDate, endDate);
      onClose();
    }
  };

  const handleClear = () => {
    setRange({ from: undefined, to: undefined });
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-fit">
      {/* Compact Header */}
      <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
        <div className="text-xs font-medium text-gray-900">Custom Range</div>
        {range.from && range.to && (
          <div className="text-xs text-gray-600">
            {formatDateCompact(range.from)} - {formatDateCompact(range.to)}
          </div>
        )}
      </div>

      {/* Compact Calendar */}
      <div className="p-2">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={(newRange: DayPickerDateRange | undefined) => {
            setRange(newRange || { from: undefined, to: undefined });
          }}
          numberOfMonths={2}
          showOutsideDays
          className="rdp-compact"
          styles={{
            root: { fontSize: '11px' },
            months: { display: 'flex', gap: '0.75rem' },
            month: { width: 'auto' },
            caption: { 
              marginBottom: '0.25rem',
              color: '#111827',
              fontSize: '12px',
              fontWeight: '600'
            },
            head_cell: { 
              color: '#6b7280',
              fontSize: '10px',
              fontWeight: '500',
              padding: '2px'
            },
            cell: { 
              padding: '0px',
              fontSize: '10px'
            },
            day: {
              borderRadius: '3px',
              border: 'none',
              fontSize: '10px',
              fontWeight: '400',
              color: '#374151',
              width: '20px',
              height: '20px'
            },
            day_today: {
              backgroundColor: '#f3f4f6',
              color: '#111827',
              fontWeight: '600'
            },
            day_selected: {
              backgroundColor: '#000000',
              color: 'white',
              fontWeight: '500'
            },
            day_range_middle: {
              backgroundColor: '#f3f4f6',
              color: '#111827'
            },
            day_outside: {
              color: '#d1d5db'
            },
            day_disabled: {
              color: '#e5e7eb'
            },
            nav_button: {
              color: '#111827',
              width: '16px',
              height: '16px'
            }
          }}
          modifiersStyles={{
            selected: {
              backgroundColor: '#000000',
              color: 'white'
            },
            today: {
              backgroundColor: '#f3f4f6',
              color: '#111827',
              fontWeight: '600'
            },
            range_middle: {
              backgroundColor: '#f9fafb',
              color: '#111827'
            }
          }}
        />
      </div>

      {/* Compact Footer */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex justify-between">
        <button
          onClick={handleClear}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-medium"
        >
          Clear
        </button>
        
        <div className="flex gap-1">
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!range.from || !range.to}
            className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};