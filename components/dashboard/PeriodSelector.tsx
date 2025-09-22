"use client"

import React from 'react';
import { ChevronDown } from 'lucide-react';

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

  const validateDateRange = (newPeriod: 'day' | 'week' | 'month', dates: [Date | null, Date | null]) => {
    if (!dates[0] || !dates[1]) return true;

    const diffTime = Math.abs(dates[1].getTime() - dates[0].getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (newPeriod) {
      case 'day':
        if (diffDays > 30) {
          onDateRangeError?.('Daily view limited to 30 days');
          return false;
        }
        break;
      case 'week':
        if (diffDays > 90) {
          onDateRangeError?.('Weekly view limited to 3 months');
          return false;
        }
        break;
      case 'month':
        // No limit for monthly view
        break;
    }

    onDateRangeError?.(null);
    return true;
  };

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    if (validateDateRange(newPeriod, dateRange)) {
      onChange(newPeriod);
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
    }
  };

  return (
    <div className="relative">
      <select
        value={period}
        onChange={(e) => handlePeriodChange(e.target.value as 'day' | 'week' | 'month')}
        className="appearance-none px-4 py-2 pr-10 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="day">Daily</option>
        <option value="week">Weekly</option>
        <option value="month">Monthly</option>
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"
      />
    </div>
  );
}