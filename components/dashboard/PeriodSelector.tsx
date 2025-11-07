"use client"

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PeriodSelectorProps {
  period: 'day' | 'week' | 'month';
  onChange: (period: 'day' | 'week' | 'month') => void;
  dateRange: [Date | null, Date | null];
  onDateRangeError?: (error: string | null) => void;
}

export function PeriodSelector({
  period,
  onChange,
  dateRange,
  onDateRangeError
}: PeriodSelectorProps) {

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    // Always allow period change - the parent component will handle date range adjustment
    onChange(newPeriod);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
    }
  };

  const getPeriodDescription = () => {
    switch (period) {
      case 'day': return 'Last 30 days';
      case 'week': return 'Last 3 months';
      case 'month': return 'Last 12 months';
    }
  };

  return (
    <Select value={period} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue>
          {getPeriodLabel()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">
          <div className="flex flex-col items-start">
            <span className="font-medium">Daily</span>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>
        </SelectItem>
        <SelectItem value="week">
          <div className="flex flex-col items-start">
            <span className="font-medium">Weekly</span>
            <span className="text-xs text-muted-foreground">Last 3 months</span>
          </div>
        </SelectItem>
        <SelectItem value="month">
          <div className="flex flex-col items-start">
            <span className="font-medium">Monthly</span>
            <span className="text-xs text-muted-foreground">Last 12 months</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}