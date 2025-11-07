import React from 'react';
import { DateRange } from 'react-day-picker';
import { DatePresetSelector, DatePresetValue } from '@/components/dashboard/DatePresetSelector';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { AnalyticsTab } from '../hooks/useAnalyticsState';

interface UnifiedDateSelectorProps {
  currentTab: AnalyticsTab;

  // Dashboard props
  onDashboardPresetSelect?: (presets: DatePresetValue[]) => void;
  dashboardSelectedLabel?: string;

  // Daily props
  dailyPeriod?: 'day' | 'week' | 'month';
  onDailyPeriodChange?: (period: 'day' | 'week' | 'month') => void;
  dailyDateRange?: DateRange;
  onDailyDateRangeChange?: (range: DateRange) => void;
  onDailyDateRangeError?: (error: string | null) => void;

  // Comparison props
  comparisonBasePeriod?: DateRange;
  comparisonComparisonPeriod?: DateRange;
  comparisonType?: 'previous_period' | 'year_over_year' | 'month_over_month';
  onComparisonBasePeriodChange?: (range: DateRange) => void;
  onComparisonTypeChange?: (type: 'previous_period' | 'year_over_year' | 'month_over_month') => void;
}

export const UnifiedDateSelector: React.FC<UnifiedDateSelectorProps> = ({
  currentTab,
  // Dashboard
  onDashboardPresetSelect,
  dashboardSelectedLabel = 'Select date range',
  // Daily
  dailyPeriod = 'month',
  onDailyPeriodChange,
  dailyDateRange,
  onDailyDateRangeChange,
  onDailyDateRangeError,
  // Comparison
  comparisonBasePeriod,
  comparisonComparisonPeriod,
  comparisonType = 'previous_period',
  onComparisonBasePeriodChange,
  onComparisonTypeChange,
}) => {
  if (currentTab === 'dashboard') {
    return (
      <DatePresetSelector
        onPresetSelect={onDashboardPresetSelect || (() => {})}
        selectedLabel={dashboardSelectedLabel}
      />
    );
  }

  if (currentTab === 'daily') {
    return (
      <>
        <PeriodSelector
          period={dailyPeriod}
          onChange={onDailyPeriodChange || (() => {})}
          dateRange={[dailyDateRange?.from || null, dailyDateRange?.to || null]}
          onDateRangeError={onDailyDateRangeError}
        />
        <DateRangePicker
          dateRange={dailyDateRange}
          onDateRangeChange={onDailyDateRangeChange || (() => {})}
          align="end"
          numberOfMonths={2}
        >
          <Button variant="outline" className="w-64">
            {dailyDateRange?.from && dailyDateRange?.to
              ? `${format(dailyDateRange.from, 'MMM dd, yyyy')} - ${format(dailyDateRange.to, 'MMM dd, yyyy')}`
              : 'Select date range...'}
          </Button>
        </DateRangePicker>
      </>
    );
  }

  if (currentTab === 'comparison') {
    // Import PeriodComparisonSelector dynamically to avoid circular dependencies
    const PeriodComparisonSelector = require('@/app/(pages)/comparison/components/PeriodComparisonSelector').PeriodComparisonSelector;

    return (
      <PeriodComparisonSelector
        basePeriod={comparisonBasePeriod || { from: undefined, to: undefined }}
        comparisonPeriod={comparisonComparisonPeriod || { from: undefined, to: undefined }}
        comparisonType={comparisonType}
        onBasePeriodChange={onComparisonBasePeriodChange || (() => {})}
        onComparisonTypeChange={onComparisonTypeChange || (() => {})}
      />
    );
  }

  return null;
};
