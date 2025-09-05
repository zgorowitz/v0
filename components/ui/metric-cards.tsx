import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface MetricCardProps {
  title: string;
  subtitle: string | React.ReactNode;
  value: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  bgClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, subtitle, value, secondaryValue, secondaryLabel, bgClass }) => {
  return (
    <div className="flex-1 rounded-lg overflow-hidden border border-gray-200">
      <div className={`${bgClass} px-4 py-3`}>
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <div className="text-xs text-white/80 mt-1">{subtitle}</div>
      </div>
      <div className="px-6 py-6 bg-white">
        <div className="text-2xl font-semibold text-gray-800">{value}</div>
        {secondaryValue && (
          <div className="mt-2 text-sm text-gray-600">
            {secondaryLabel}: <span className="font-medium">{secondaryValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeSelectProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

interface CustomRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (range: DateRange) => void;
}

const CustomRangeModal: React.FC<CustomRangeModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [range, setRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[200]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-auto">
          <Dialog.Title className="text-lg font-medium mb-4">Select Date Range</Dialog.Title>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={(newRange) => {
              setRange(newRange || { from: undefined, to: undefined });
            }}
            className="border rounded-lg p-3"
            styles={{
              head_cell: { color: '#666' },
              caption: { color: '#374151' },
              table: { margin: '0 auto' }
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
              onClick={() => {
                if (range.from && range.to) {
                  onSelect({ start: range.from, end: range.to });
                  onClose();
                }
              }}
              disabled={!range.from || !range.to}
            >
              Apply
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const DateRangeSelect: React.FC<DateRangeSelectProps> = ({ range, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const presetRanges = [
    { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
    { label: 'Yesterday', getValue: () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return { start: date, end: date };
    }},
    { label: '2 days ago', getValue: () => {
      const date = new Date();
      date.setDate(date.getDate() - 2);
      return { start: date, end: date };
    }},
    { label: '3 days ago', getValue: () => {
      const date = new Date();
      date.setDate(date.getDate() - 3);
      return { start: date, end: date };
    }},
    { label: 'Last 7 days', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    }},
    { label: 'Last 14 days', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 14);
      return { start, end };
    }},
    { label: 'Last 30 days', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    }},
    { label: 'Month to date', getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    }},
    { label: 'Last month', getValue: () => {
      const date = new Date();
      const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const end = new Date(date.getFullYear(), date.getMonth(), 0);
      return { start, end };
    }},
    { label: 'Last 2 months', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 2);
      return { start, end };
    }},
    { label: 'Last 3 months', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    }},
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-white/80 hover:text-white flex items-center gap-1"
      >
        {formatDateShort(range.start)} - {formatDateShort(range.end)}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48"
            style={{
              top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 4 : 0,
              left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
            }}
          >
            {presetRanges.map((preset) => (
              <button
                key={preset.label}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  onChange(preset.getValue());
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </button>
            ))}
            
            <div className="border-t border-gray-200 mt-1">
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  setIsCustomRangeOpen(true);
                  setIsOpen(false);
                }}
              >
                Custom Range
              </button>
            </div>
          </div>
        </>
      )}

      <CustomRangeModal
        isOpen={isCustomRangeOpen}
        onClose={() => setIsCustomRangeOpen(false)}
        onSelect={onChange}
      />
    </div>
  );
};

export const MetricCards: React.FC<{
  yesterdayRevenue: number;
  sevenDayRevenue: number;
  fourteenDayRevenue: number;
  thirtyDayRevenue: number;
  yesterdayOrders?: number;
  sevenDayOrders?: number;
  fourteenDayOrders?: number;
  thirtyDayOrders?: number;
  onDateRangeChange?: (period: string, range: DateRange) => void;
}> = ({ 
  yesterdayRevenue, 
  sevenDayRevenue, 
  fourteenDayRevenue, 
  thirtyDayRevenue,
  yesterdayOrders = 0, 
  sevenDayOrders = 0, 
  fourteenDayOrders = 0, 
  thirtyDayOrders = 0,
  onDateRangeChange 
}) => {
  const [dateRanges, setDateRanges] = useState({
    yesterday: { start: new Date(new Date().setDate(new Date().getDate() - 1)), end: new Date() },
    sevenDays: { start: new Date(new Date().setDate(new Date().getDate() - 7)), end: new Date() },
    fourteenDays: { start: new Date(new Date().setDate(new Date().getDate() - 14)), end: new Date() },
    thirtyDays: { start: new Date(new Date().setDate(new Date().getDate() - 30)), end: new Date() }
  });

  const handleDateRangeChange = (period: string, range: DateRange) => {
    setDateRanges(prev => ({ ...prev, [period]: range }));
    onDateRangeChange?.(period, range);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatOrders = (orders: number) => {
    return orders > 0 ? orders.toString() : undefined;
  };

  return (
    <div className="grid grid-cols-4 gap-4 w-full">
      <MetricCard
        title="Yesterday"
        subtitle={
          <DateRangeSelect
            range={dateRanges.yesterday}
            onChange={(range) => handleDateRangeChange('yesterday', range)}
          />
        }
        value={formatCurrency(yesterdayRevenue)}
        secondaryValue={formatOrders(yesterdayOrders)}
        secondaryLabel="Orders"
        bgClass="bg-stone-400"
      />
      <MetricCard
        title="7-Day"
        subtitle={
          <DateRangeSelect
            range={dateRanges.sevenDays}
            onChange={(range) => handleDateRangeChange('sevenDays', range)}
          />
        }
        value={formatCurrency(sevenDayRevenue)}
        secondaryValue={formatOrders(sevenDayOrders)}
        secondaryLabel="Orders"
        bgClass="bg-zinc-400"
      />
      <MetricCard
        title="14-Day"
        subtitle={
          <DateRangeSelect
            range={dateRanges.fourteenDays}
            onChange={(range) => handleDateRangeChange('fourteenDays', range)}
          />
        }
        value={formatCurrency(fourteenDayRevenue)}
        secondaryValue={formatOrders(fourteenDayOrders)}
        secondaryLabel="Orders"
        bgClass="bg-slate-400"
      />
      <MetricCard
        title="30-Day"
        subtitle={
          <DateRangeSelect
            range={dateRanges.thirtyDays}
            onChange={(range) => handleDateRangeChange('thirtyDays', range)}
          />
        }
        value={formatCurrency(thirtyDayRevenue)}
        secondaryValue={formatOrders(thirtyDayOrders)}
        secondaryLabel="Orders"
        bgClass="bg-slate-400"
      />
    </div>
  );
};
