"use client"

import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Check } from 'lucide-react';
import { ComparisonType, calculateComparisonPeriod } from '../utils/comparisonUtils';
import { cn } from '@/lib/utils';

interface PeriodComparisonSelectorProps {
  basePeriod: DateRange;
  comparisonPeriod: DateRange;
  comparisonType: ComparisonType;
  onBasePeriodChange: (period: DateRange) => void;
  onComparisonTypeChange: (type: ComparisonType) => void;
}

type PresetType = 'today' | 'yesterday' | '7d' | '14d' | '30d' | 'mtd' | 'last_month' | '2m' | '3m' | 'ytd' | 'last_year' | 'custom';

interface DatePreset {
  label: string;
  type: PresetType;
  getRange: () => DateRange;
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    type: 'today',
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: 'Yesterday',
    type: 'yesterday',
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: 'Last 7 days',
    type: '7d',
    getRange: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { from: start, to: end };
    },
  },
  {
    label: 'Last 14 days',
    type: '14d',
    getRange: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      return { from: start, to: end };
    },
  },
  {
    label: 'Last 30 days',
    type: '30d',
    getRange: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { from: start, to: end };
    },
  },
  {
    label: 'Month to date',
    type: 'mtd',
    getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: today };
    },
  },
  {
    label: 'Last month',
    type: 'last_month',
    getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: start, to: end };
    },
  },
  {
    label: 'Last 2 months',
    type: '2m',
    getRange: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 2);
      return { from: start, to: end };
    },
  },
  {
    label: 'Last 3 months',
    type: '3m',
    getRange: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 3);
      return { from: start, to: end };
    },
  },
  {
    label: 'Year to date',
    type: 'ytd',
    getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: start, to: today };
    },
  },
  {
    label: 'Last year',
    type: 'last_year',
    getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { from: start, to: end };
    },
  },
  {
    label: 'Custom',
    type: 'custom',
    getRange: () => ({ from: undefined, to: undefined }),
  },
];

const COMPARISON_TYPES: Array<{ label: string; type: ComparisonType }> = [
  { label: 'Previous Period', type: 'previous_period' },
  { label: 'Same Time Last Year', type: 'same_last_year' },
  { label: 'Month Before', type: 'month_before' },
];

export function PeriodComparisonSelector({
  basePeriod,
  comparisonPeriod,
  comparisonType,
  onBasePeriodChange,
  onComparisonTypeChange,
}: PeriodComparisonSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('30d');
  const [calendarMode, setCalendarMode] = useState<'base' | 'comparison'>('base');
  const [tempBasePeriod, setTempBasePeriod] = useState<DateRange>(basePeriod);

  const handlePresetClick = (preset: DatePreset) => {
    const range = preset.getRange();
    setSelectedPreset(preset.type);
    if (range.from && range.to) {
      onBasePeriodChange(range);
    }
    if (preset.type === 'custom') {
      setCalendarMode('base');
    }
  };

  const handleComparisonTypeClick = (type: ComparisonType) => {
    onComparisonTypeChange(type);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) return;

    if (calendarMode === 'base') {
      setTempBasePeriod(range);
      if (range.from && range.to) {
        onBasePeriodChange(range);
        setSelectedPreset('custom');
      }
    } else {
      // For comparison calendar, we need to calculate what base period would give us this comparison
      // This is complex, so for now just allow base period editing
      if (range.from && range.to) {
        onBasePeriodChange(range);
      }
    }
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.from || !range.to) return 'Select dates';
    if (range.from.getTime() === range.to.getTime()) {
      return format(range.from, 'yyyy-MM-dd');
    }
    return `${format(range.from, 'yyyy-MM-dd')} - ${format(range.to, 'yyyy-MM-dd')}`;
  };

  const getButtonLabel = () => {
    if (!basePeriod.from || !basePeriod.to) {
      return 'Select date range...';
    }
    const baseLabel = formatDateRange(basePeriod);
    const compLabel = formatDateRange(comparisonPeriod);
    return `Select date range`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-auto min-w-64 justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getButtonLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Left Column: Date Presets */}
          <div className="border-r p-2 w-44">
            <div className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Period A</div>
            <div className="space-y-0.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors",
                    selectedPreset === preset.type && "bg-accent font-medium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    {preset.label}
                    {selectedPreset === preset.type && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Middle Column: Comparison Types */}
          <div className="border-r p-2 w-44">
            <div className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Period B</div>
            <div className="space-y-0.5">
              {COMPARISON_TYPES.map((comp) => (
                <button
                  key={comp.type}
                  onClick={() => handleComparisonTypeClick(comp.type)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors",
                    comparisonType === comp.type && "bg-accent font-medium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    {comp.label}
                    {comparisonType === comp.type && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Calendar & Date Display */}
          <div className="p-3 w-80">
            {/* Date Display Headers */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Period A</div>
                <div
                  className={cn(
                    "text-xs font-mono p-1.5 rounded border cursor-pointer hover:bg-accent transition-colors",
                    calendarMode === 'base' && "bg-accent border-primary"
                  )}
                  onClick={() => setCalendarMode('base')}
                >
                  {formatDateRange(basePeriod)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Period B</div>
                <div
                  className={cn(
                    "text-xs font-mono p-1.5 rounded border",
                    "bg-muted/50"
                  )}
                >
                  {formatDateRange(comparisonPeriod)}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="border rounded-md">
              <DateRangePicker
                dateRange={basePeriod}
                onDateRangeChange={onBasePeriodChange}
                align="center"
                numberOfMonths={2}
              >
                <div className="p-2 cursor-pointer hover:bg-accent rounded transition-colors">
                  <div className="text-xs text-muted-foreground text-center mb-1">
                    Click to select custom date range
                  </div>
                  <div className="text-sm text-center">
                    📅 Custom Date Picker
                  </div>
                </div>
              </DateRangePicker>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
