"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

export interface DatePresetValue {
  start: string;
  end: string;
  label: string;
}

interface DatePresetSelectorProps {
  onPresetSelect: (presets: DatePresetValue[]) => void;
  selectedLabel?: string;
}

// Date calculation helper functions
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const getToday = (): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { start: formatDate(today), end: formatDate(today) };
};

const getYesterday = (): { start: string; end: string } => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return { start: formatDate(yesterday), end: formatDate(yesterday) };
};

const getMonthToDate = (): { start: string; end: string } => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: formatDate(firstDay), end: formatDate(today) };
};

const getLastMonth = (): { start: string; end: string } => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const getMonthsAgo = (n: number): { start: string; end: string } => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - n, 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() - n + 1, 0);
  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const getDaysAgo = (n: number): { start: string; end: string } => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(0, 0, 0, 0);
  return { start: formatDate(date), end: formatDate(date) };
};

const getLastNDays = (n: number): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - n + 1);
  return { start: formatDate(startDate), end: formatDate(today) };
};

const getThisWeek = (): { start: string; end: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { start: formatDate(sunday), end: formatDate(saturday) };
};

const getLastWeek = (): { start: string; end: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek - 7);
  lastSunday.setHours(0, 0, 0, 0);
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  return { start: formatDate(lastSunday), end: formatDate(lastSaturday) };
};

const getWeeksAgo = (n: number): { start: string; end: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const targetSunday = new Date(today);
  targetSunday.setDate(today.getDate() - dayOfWeek - (n * 7));
  targetSunday.setHours(0, 0, 0, 0);
  const targetSaturday = new Date(targetSunday);
  targetSaturday.setDate(targetSunday.getDate() + 6);
  return { start: formatDate(targetSunday), end: formatDate(targetSaturday) };
};

const getThisQuarter = (): { start: string; end: string } => {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3);
  const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
  const lastDay = new Date(today.getFullYear(), quarter * 3 + 3, 0);
  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const getLastQuarter = (): { start: string; end: string } => {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3);
  const lastQuarter = quarter === 0 ? 3 : quarter - 1;
  const year = quarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const firstDay = new Date(year, lastQuarter * 3, 1);
  const lastDay = new Date(year, lastQuarter * 3 + 3, 0);
  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const getQuartersAgo = (n: number): { start: string; end: string } => {
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const targetQuarter = currentQuarter - n;
  const year = today.getFullYear() + Math.floor(targetQuarter / 4);
  const quarter = ((targetQuarter % 4) + 4) % 4;
  const firstDay = new Date(year, quarter * 3, 1);
  const lastDay = new Date(year, quarter * 3 + 3, 0);
  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

// Preset groups
export const getPresetGroups = () => [
  // Group 3
  [
    { ...getYesterday(), label: 'Yesterday' },
    { ...getLastNDays(7), label: '7 days' },
    { ...getLastNDays(14), label: '14 days' },
    { ...getLastNDays(30), label: '30 days' },
  ],
  // Group 1
  [
    { ...getToday(), label: 'Today' },
    { ...getYesterday(), label: 'Yesterday' },
    { ...getMonthToDate(), label: 'Month to date' },
    { ...getLastMonth(), label: 'Last month' },
  ],
  // Group 4
  [
    { ...getThisWeek(), label: 'This week' },
    { ...getLastWeek(), label: 'Last week' },
    { ...getWeeksAgo(2), label: '2 weeks ago' },
    { ...getWeeksAgo(3), label: '3 weeks ago' },
  ],
  // Group 5
  [
    { ...getMonthToDate(), label: 'Month to date' },
    { ...getLastMonth(), label: 'Last month' },
    { ...getMonthsAgo(2), label: '2 months ago' },
    { ...getMonthsAgo(3), label: '3 months ago' },
  ],
  // Group 6
  [
    { ...getToday(), label: 'Today' },
    { ...getYesterday(), label: 'Yesterday' },
    { ...getDaysAgo(2), label: '2 days ago' },
    { ...getDaysAgo(3), label: '3 days ago' },
  ],
  // Group 7
  [
    { ...getToday(), label: 'Today' },
    { ...getYesterday(), label: 'Yesterday' },
    { ...getDaysAgo(7), label: '7 days ago' },
    { ...getDaysAgo(8), label: '8 days ago' },
  ],
  // Group 8
  [
    { ...getThisQuarter(), label: 'This quarter' },
    { ...getLastQuarter(), label: 'Last quarter' },
    { ...getQuartersAgo(2), label: '2 quarters ago' },
    { ...getQuartersAgo(3), label: '3 quarters ago' },
  ],
];

export const DatePresetSelector: React.FC<DatePresetSelectorProps> = ({
  onPresetSelect,
  selectedLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const presetGroups = getPresetGroups();

  const handlePresetClick = (presets: DatePresetValue[]) => {
    onPresetSelect(presets);
    setOpen(false);
    setShowCustomCalendar(false);
  };

  const handleCustomRangeClick = () => {
    setShowCustomCalendar(true);
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      const preset: DatePresetValue = {
        start: formatDate(range.from),
        end: formatDate(range.to),
        label: `${format(range.from, 'MMM dd')} - ${format(range.to, 'MMM dd, yyyy')}`,
      };
      // Return array of 4 identical presets for custom range
      onPresetSelect([preset, preset, preset, preset]);
      setOpen(false);
      setShowCustomCalendar(false);
      setCustomDateRange(undefined);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal min-w-[200px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedLabel || 'Select date range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-h-[500px] overflow-y-auto" align="end">
        {!showCustomCalendar ? (
          <div className="p-2">
            {presetGroups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 px-3 text-xs hover:bg-accent my-1"
                  onClick={() => handlePresetClick(group)}
                >
                  {group.map(p => p.label).join(' / ')}
                </Button>
                {groupIndex < presetGroups.length - 1 && <Separator />}
              </React.Fragment>
            ))}
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-xs hover:bg-accent"
              onClick={handleCustomRangeClick}
            >
              Custom range
            </Button>
          </div>
        ) : (
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 text-xs"
              onClick={() => setShowCustomCalendar(false)}
            >
              ← Back to presets
            </Button>
            <Calendar
              mode="range"
              selected={customDateRange}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
              className="rounded-md border shadow-sm"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
