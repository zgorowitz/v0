import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { DatePresetValue } from '../utils/dateUtils';

export type AnalyticsTab = 'dashboard' | 'daily' | 'comparison';

export interface AnalyticsState {
  // Common
  tab: AnalyticsTab;
  itemIds: string[];

  // Dashboard specific
  dashboardDates?: DatePresetValue[];
  selectedCardIndex?: number;

  // Daily specific
  dailyPeriod?: 'day' | 'week' | 'month';
  dailyFrom?: string;
  dailyTo?: string;

  // Comparison specific
  comparisonBaseFrom?: string;
  comparisonBaseTo?: string;
  comparisonType?: 'previous_period' | 'year_over_year' | 'month_over_month';
}

export const useAnalyticsState = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const state: AnalyticsState = useMemo(() => {
    const tab = (searchParams.get('tab') as AnalyticsTab) || 'dashboard';
    const itemIds = searchParams.get('items')?.split(',').filter(Boolean) || [];

    // Dashboard params
    const dashboardDatesParam = searchParams.get('dates');
    let dashboardDates: DatePresetValue[] | undefined;
    if (dashboardDatesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dashboardDatesParam));
        if (Array.isArray(parsed)) {
          dashboardDates = parsed;
        }
      } catch (e) {
        console.error('Failed to parse dashboard dates:', e);
      }
    }
    const selectedCardIndex = parseInt(searchParams.get('cardIndex') || '0', 10);

    // Daily params
    const dailyPeriod = (searchParams.get('period') as 'day' | 'week' | 'month') || 'month';
    const dailyFrom = searchParams.get('from') || undefined;
    const dailyTo = searchParams.get('to') || undefined;

    // Comparison params
    const comparisonBaseFrom = searchParams.get('base_from') || undefined;
    const comparisonBaseTo = searchParams.get('base_to') || undefined;
    const comparisonType = (searchParams.get('comp_type') as any) || 'previous_period';

    return {
      tab,
      itemIds,
      dashboardDates,
      selectedCardIndex,
      dailyPeriod,
      dailyFrom,
      dailyTo,
      comparisonBaseFrom,
      comparisonBaseTo,
      comparisonType,
    };
  }, [searchParams]);

  // Update URL state
  const updateState = useCallback(
    (updates: Partial<AnalyticsState>, replace: boolean = false) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update common params
      if (updates.tab !== undefined) {
        params.set('tab', updates.tab);
      }
      if (updates.itemIds !== undefined) {
        if (updates.itemIds.length > 0) {
          params.set('items', updates.itemIds.join(','));
        } else {
          params.delete('items');
        }
      }

      // Update dashboard params
      if (updates.dashboardDates !== undefined) {
        params.set('dates', encodeURIComponent(JSON.stringify(updates.dashboardDates)));
      }
      if (updates.selectedCardIndex !== undefined) {
        params.set('cardIndex', updates.selectedCardIndex.toString());
      }

      // Update daily params
      if (updates.dailyPeriod !== undefined) {
        params.set('period', updates.dailyPeriod);
      }
      if (updates.dailyFrom !== undefined) {
        params.set('from', updates.dailyFrom);
      }
      if (updates.dailyTo !== undefined) {
        params.set('to', updates.dailyTo);
      }

      // Update comparison params
      if (updates.comparisonBaseFrom !== undefined) {
        params.set('base_from', updates.comparisonBaseFrom);
      }
      if (updates.comparisonBaseTo !== undefined) {
        params.set('base_to', updates.comparisonBaseTo);
      }
      if (updates.comparisonType !== undefined) {
        params.set('comp_type', updates.comparisonType);
      }

      const method = replace ? router.replace : router.push;
      method(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  return { state, updateState };
};
