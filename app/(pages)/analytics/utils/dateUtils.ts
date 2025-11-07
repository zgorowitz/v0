import { DateRange } from 'react-day-picker';
import { addDays, addMonths, subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export type DatePresetValue = {
  start: string;
  end: string;
  label: string;
};

export type ComparisonType = 'previous_period' | 'year_over_year' | 'month_over_month';

// Get yesterday's date (default end date)
export const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

// Date preset groups for dashboard metric cards
export const getPresetGroups = (): DatePresetValue[][] => {
  const today = new Date();
  const yesterday = getYesterday();

  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  const last7Days = new Date(yesterday);
  last7Days.setDate(last7Days.getDate() - 6);

  const last30Days = new Date(yesterday);
  last30Days.setDate(last30Days.getDate() - 29);

  return [
    [
      { start: formatDate(today), end: formatDate(today), label: 'Today' },
      { start: formatDate(yesterday), end: formatDate(yesterday), label: 'Yesterday' },
      { start: formatDate(last7Days), end: formatDate(yesterday), label: 'Last 7 days' },
      { start: formatDate(last30Days), end: formatDate(yesterday), label: 'Last 30 days' },
    ],
  ];
};

// Get preset date range based on period type for daily view
export const getPresetDateRange = (periodType: 'day' | 'week' | 'month'): DateRange => {
  const end = getYesterday();
  const start = new Date(end);

  switch (periodType) {
    case 'day':
      start.setDate(start.getDate() - 29); // 30 days
      break;
    case 'week':
      start.setDate(start.getDate() - 89); // 90 days
      break;
    case 'month':
      start.setMonth(start.getMonth() - 11); // 12 months
      start.setDate(1);
      break;
  }

  return { from: start, to: end };
};

// Calculate comparison period based on base period and type
export const calculateComparisonPeriod = (
  basePeriod: DateRange,
  comparisonType: ComparisonType
): DateRange => {
  if (!basePeriod.from || !basePeriod.to) {
    return { from: undefined, to: undefined };
  }

  const diffTime = basePeriod.to.getTime() - basePeriod.from.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (comparisonType) {
    case 'previous_period': {
      const compTo = subDays(basePeriod.from, 1);
      const compFrom = subDays(compTo, diffDays);
      return { from: compFrom, to: compTo };
    }
    case 'year_over_year': {
      const compFrom = new Date(basePeriod.from);
      compFrom.setFullYear(compFrom.getFullYear() - 1);
      const compTo = new Date(basePeriod.to);
      compTo.setFullYear(compTo.getFullYear() - 1);
      return { from: compFrom, to: compTo };
    }
    case 'month_over_month': {
      const compFrom = subMonths(basePeriod.from, 1);
      const compTo = subMonths(basePeriod.to, 1);
      return { from: compFrom, to: compTo };
    }
    default:
      return { from: undefined, to: undefined };
  }
};

// Validate date range based on period limits
export const validateDateRange = (
  dateRange: DateRange,
  period: 'day' | 'week' | 'month'
): { valid: boolean; error?: string } => {
  if (!dateRange.from || !dateRange.to) {
    return { valid: true };
  }

  const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (period) {
    case 'day':
      if (diffDays > 30) {
        return { valid: false, error: 'Daily view limited to 30 days' };
      }
      break;
    case 'week':
      if (diffDays > 90) {
        return { valid: false, error: 'Weekly view limited to 3 months' };
      }
      break;
    case 'month':
      // No limit for monthly view
      break;
  }

  return { valid: true };
};

// Format date for display
export const formatDateForDisplay = (date: Date, formatStr: string = 'MMM dd, yyyy'): string => {
  return format(date, formatStr);
};

// Format date for chart based on period
export const formatDateForChart = (dateStr: string, period: 'day' | 'week' | 'month'): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');

  switch (period) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short' });
    default:
      return dateStr;
  }
};

// Convert Date to ISO string for API
export const dateToISOString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
