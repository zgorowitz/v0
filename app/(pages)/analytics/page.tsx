"use client"

import React, { Suspense, useEffect, useState, useMemo, useCallback, startTransition } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { SiteHeader } from '@/components/site-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemsFilter } from '@/components/dashboard/ItemsFilter';
import { useItemsFilter } from '@/lib/dashboard/useItemsFilter';
import { useAnalyticsState, AnalyticsTab } from './hooks/useAnalyticsState';
import { UnifiedDateSelector } from './components/UnifiedDateSelector';
import { DashboardView } from './components/DashboardView';
import { DailyView } from './components/DailyView';
import { ComparisonView } from './components/ComparisonView';
import { DateRange } from 'react-day-picker';
import { DatePresetValue, getPresetGroups, getPresetDateRange, calculateComparisonPeriod, validateDateRange } from './utils/dateUtils';

const AnalyticsContent = () => {
  const { state, updateState } = useAnalyticsState();
  const itemsFilter = useItemsFilter();

  // Memoize applied item IDs
  const appliedItemIds = useMemo(() => {
    return itemsFilter.appliedItemIds;
  }, [JSON.stringify(itemsFilter.appliedItemIds)]);

  // Sync URL itemIds with itemsFilter
  useEffect(() => {
    if (JSON.stringify(appliedItemIds) !== JSON.stringify(state.itemIds)) {
      updateState({ itemIds: appliedItemIds }, true);
    }
  }, [appliedItemIds]);

  // Dashboard state
  const [cardDateRanges, setCardDateRanges] = useState<DatePresetValue[]>(() => {
    return state.dashboardDates || getPresetGroups()[0];
  });
  const [selectedCardIndex, setSelectedCardIndex] = useState(state.selectedCardIndex || 0);

  // Daily state
  const [dailyPeriod, setDailyPeriod] = useState<'day' | 'week' | 'month'>(state.dailyPeriod || 'month');
  const [dailyDateRange, setDailyDateRange] = useState<DateRange>(() => {
    if (state.dailyFrom && state.dailyTo) {
      return {
        from: new Date(state.dailyFrom),
        to: new Date(state.dailyTo),
      };
    }
    return getPresetDateRange('month');
  });
  const [dailyDateRangeError, setDailyDateRangeError] = useState<string | null>(null);

  // Comparison state
  const [comparisonBasePeriod, setComparisonBasePeriod] = useState<DateRange>(() => {
    if (state.comparisonBaseFrom && state.comparisonBaseTo) {
      return {
        from: new Date(state.comparisonBaseFrom),
        to: new Date(state.comparisonBaseTo),
      };
    }
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { from: start, to: end };
  });
  const [comparisonType, setComparisonType] = useState<'previous_period' | 'year_over_year' | 'month_over_month'>(
    state.comparisonType || 'previous_period'
  );
  const [comparisonPeriod, setComparisonPeriod] = useState<DateRange>(() => {
    return calculateComparisonPeriod(comparisonBasePeriod, comparisonType);
  });

  // Update comparison period when base period or type changes
  useEffect(() => {
    const newComparisonPeriod = calculateComparisonPeriod(comparisonBasePeriod, comparisonType);
    setComparisonPeriod(newComparisonPeriod);
  }, [comparisonBasePeriod, comparisonType]);

  // Local tab state for instant UI updates
  const [localTab, setLocalTab] = useState<AnalyticsTab>(state.tab);

  // Sync local tab with URL state
  useEffect(() => {
    setLocalTab(state.tab);
  }, [state.tab]);

  // Handle tab change with optimistic update
  const handleTabChange = (tab: AnalyticsTab) => {
    // Immediate UI update
    setLocalTab(tab);
    // Defer URL update to not block UI
    startTransition(() => {
      updateState({ tab });
    });
  };

  // Dashboard handlers
  const handleDashboardPresetSelect = useCallback((presets: DatePresetValue[]) => {
    setCardDateRanges(presets);
    updateState({ dashboardDates: presets });
  }, [updateState]);

  const handleCardDateChange = useCallback((cardIndex: number, dateRange: DateRange) => {
    if (!dateRange.from || !dateRange.to) return;

    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    const newDatePreset: DatePresetValue = {
      start: formatDate(dateRange.from),
      end: formatDate(dateRange.to),
      label: `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`,
    };

    setCardDateRanges(prev => {
      const updated = [...prev];
      updated[cardIndex] = newDatePreset;
      updateState({ dashboardDates: updated });
      return updated;
    });
  }, [updateState]);

  const handleSelectedCardChange = useCallback((index: number) => {
    setSelectedCardIndex(index);
    updateState({ selectedCardIndex: index });
  }, [updateState]);

  // Daily handlers
  const handleDailyPeriodChange = useCallback((period: 'day' | 'week' | 'month') => {
    setDailyPeriod(period);
    const presetRange = getPresetDateRange(period);
    setDailyDateRange(presetRange);
    setDailyDateRangeError(null);
    updateState({
      dailyPeriod: period,
      dailyFrom: presetRange.from?.toISOString().split('T')[0],
      dailyTo: presetRange.to?.toISOString().split('T')[0],
    });
  }, [updateState]);

  const handleDailyDateRangeChange = useCallback((newDateRange: DateRange) => {
    const validation = validateDateRange(newDateRange, dailyPeriod);
    if (!validation.valid) {
      setDailyDateRangeError(validation.error || null);
      return;
    }

    setDailyDateRangeError(null);
    setDailyDateRange(newDateRange);
    updateState({
      dailyFrom: newDateRange.from?.toISOString().split('T')[0],
      dailyTo: newDateRange.to?.toISOString().split('T')[0],
    });
  }, [dailyPeriod, updateState]);

  // Comparison handlers
  const handleComparisonBasePeriodChange = useCallback((range: DateRange) => {
    setComparisonBasePeriod(range);
    updateState({
      comparisonBaseFrom: range.from?.toISOString().split('T')[0],
      comparisonBaseTo: range.to?.toISOString().split('T')[0],
    });
  }, [updateState]);

  const handleComparisonTypeChange = useCallback((type: 'previous_period' | 'year_over_year' | 'month_over_month') => {
    setComparisonType(type);
    updateState({ comparisonType: type });
  }, [updateState]);

  return (
    <LayoutWrapper>
      <SiteHeader
        leftContent={
          <Tabs value={localTab} onValueChange={(v) => handleTabChange(v as AnalyticsTab)}>
            <TabsList className="bg-transparent border-0 h-auto p-0">
              <TabsTrigger
                value="dashboard"
                className="bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:border-muted-foreground/50 transition-all duration-150"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:border-muted-foreground/50 transition-all duration-150"
              >
                Daily
              </TabsTrigger>
              <TabsTrigger
                value="comparison"
                className="bg-transparent border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:border-muted-foreground/50 transition-all duration-150"
              >
                Comparison
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        {/* Right side: Filters and Date Selector */}
        <ItemsFilter {...itemsFilter} />
        <UnifiedDateSelector
          currentTab={localTab}
          // Dashboard props
          onDashboardPresetSelect={handleDashboardPresetSelect}
          dashboardSelectedLabel="Select date range"
          // Daily props
          dailyPeriod={dailyPeriod}
          onDailyPeriodChange={handleDailyPeriodChange}
          dailyDateRange={dailyDateRange}
          onDailyDateRangeChange={handleDailyDateRangeChange}
          onDailyDateRangeError={setDailyDateRangeError}
          // Comparison props
          comparisonBasePeriod={comparisonBasePeriod}
          comparisonComparisonPeriod={comparisonPeriod}
          comparisonType={comparisonType}
          onComparisonBasePeriodChange={handleComparisonBasePeriodChange}
          onComparisonTypeChange={handleComparisonTypeChange}
        />
      </SiteHeader>

      <div className="p-4">
        {/* Daily date range error */}
        {localTab === 'daily' && dailyDateRangeError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {dailyDateRangeError}
          </div>
        )}

        {/* Tab Content - Render only active tab */}
        {localTab === 'dashboard' && (
          <DashboardView
            itemIds={appliedItemIds}
            cardDateRanges={cardDateRanges}
            selectedCardIndex={selectedCardIndex}
            onCardDateChange={handleCardDateChange}
            onSelectedCardChange={handleSelectedCardChange}
          />
        )}

        {localTab === 'daily' && (
          <DailyView
            itemIds={appliedItemIds}
            period={dailyPeriod}
            dateRange={dailyDateRange}
          />
        )}

        {localTab === 'comparison' && (
          <ComparisonView
            itemIds={appliedItemIds}
            basePeriod={comparisonBasePeriod}
            comparisonPeriod={comparisonPeriod}
            period="day"
          />
        )}
      </div>
    </LayoutWrapper>
  );
};

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <LayoutWrapper>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">Loading analytics...</div>
          </div>
        </LayoutWrapper>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
