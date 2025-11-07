import { DateRange } from "react-day-picker";

export type ComparisonType = "previous_period" | "same_last_year" | "month_before";

export interface DatePresetValue {
  start: string;
  end: string;
  label: string;
}

/**
 * Calculate the comparison period based on the base period and comparison type
 */
export function calculateComparisonPeriod(
  basePeriod: DateRange,
  comparisonType: ComparisonType
): DateRange {
  if (!basePeriod.from || !basePeriod.to) {
    return { from: undefined, to: undefined };
  }

  const baseFrom = new Date(basePeriod.from);
  const baseTo = new Date(basePeriod.to);

  // Calculate the duration of the base period in days
  const durationMs = baseTo.getTime() - baseFrom.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  let compFrom: Date;
  let compTo: Date;

  switch (comparisonType) {
    case "previous_period":
      // Go back by the same duration + 1 day (to not overlap)
      compTo = new Date(baseFrom);
      compTo.setDate(compTo.getDate() - 1);
      compFrom = new Date(compTo);
      compFrom.setDate(compFrom.getDate() - durationDays);
      break;

    case "same_last_year":
      // Same dates, one year earlier
      compFrom = new Date(baseFrom);
      compFrom.setFullYear(compFrom.getFullYear() - 1);
      compTo = new Date(baseTo);
      compTo.setFullYear(compTo.getFullYear() - 1);
      break;

    case "month_before":
      // One month before
      compFrom = new Date(baseFrom);
      compFrom.setMonth(compFrom.getMonth() - 1);
      compTo = new Date(baseTo);
      compTo.setMonth(compTo.getMonth() - 1);
      break;

    default:
      return { from: undefined, to: undefined };
  }

  return { from: compFrom, to: compTo };
}

/**
 * Format a comparison period label
 */
export function formatComparisonLabel(
  comparisonType: ComparisonType,
  basePeriod: DateRange,
  comparisonPeriod: DateRange
): string {
  if (!basePeriod.from || !basePeriod.to || !comparisonPeriod.from || !comparisonPeriod.to) {
    return "";
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  switch (comparisonType) {
    case "previous_period":
      return `Previous Period (${formatDate(comparisonPeriod.from)} - ${formatDate(comparisonPeriod.to)})`;
    case "same_last_year":
      return `Same Time Last Year (${formatDate(comparisonPeriod.from)} - ${formatDate(comparisonPeriod.to)})`;
    case "month_before":
      return `Month Before (${formatDate(comparisonPeriod.from)} - ${formatDate(comparisonPeriod.to)})`;
    default:
      return "";
  }
}

/**
 * Calculate delta between two values
 */
export function calculateDelta(baseValue: number, comparisonValue: number): {
  absolute: number;
  percentage: number;
} {
  const absolute = baseValue - comparisonValue;
  const percentage = comparisonValue !== 0 ? ((baseValue - comparisonValue) / Math.abs(comparisonValue)) * 100 : 0;

  return { absolute, percentage };
}

/**
 * Format delta for display
 */
export function formatDelta(
  delta: { absolute: number; percentage: number },
  isCurrency: boolean = false
): string {
  const sign = delta.absolute >= 0 ? "+" : "";
  const absValue = isCurrency ? `$${Math.abs(Math.round(delta.absolute)).toLocaleString()}` : Math.abs(Math.round(delta.absolute)).toLocaleString();
  const percentValue = Math.abs(Math.round(delta.percentage));

  return `${sign}${delta.absolute >= 0 ? absValue : `-${absValue}`} (${sign}${delta.percentage >= 0 ? percentValue : `-${percentValue}`}%)`;
}

/**
 * Merge chart data for comparison - align by relative position (day 1, day 2, etc.)
 */
export function mergeChartDataForComparison(
  baseData: any[],
  comparisonData: any[],
  period: 'day' | 'week' | 'month'
): any[] {
  const maxLength = Math.max(baseData.length, comparisonData.length);
  const mergedData: any[] = [];

  for (let i = 0; i < maxLength; i++) {
    const baseRow = baseData[i] || {};
    const compRow = comparisonData[i] || {};

    // Create label based on relative position
    let label = "";
    switch (period) {
      case 'day':
        label = `Day ${i + 1}`;
        break;
      case 'week':
        label = `Week ${i + 1}`;
        break;
      case 'month':
        label = `Month ${i + 1}`;
        break;
    }

    // Merge data with prefixes (round monetary values, no cents)
    const merged: any = {
      label,
      position: i,
      // Base period data
      base_total_sales: Math.round(baseRow.total_sales || 0),
      base_net_profit: Math.round(baseRow.net_profit || 0),
      base_total_units: baseRow.total_units || 0,
      base_ad_cost: Math.round(baseRow.ad_cost || 0),
      base_profit_margin: baseRow.profit_margin || 0,
      base_tacos: baseRow.tacos || 0,
      // Comparison period data
      comparison_total_sales: Math.round(compRow.total_sales || 0),
      comparison_net_profit: Math.round(compRow.net_profit || 0),
      comparison_total_units: compRow.total_units || 0,
      comparison_ad_cost: Math.round(compRow.ad_cost || 0),
      comparison_profit_margin: compRow.profit_margin || 0,
      comparison_tacos: compRow.tacos || 0,
    };

    mergedData.push(merged);
  }

  return mergedData;
}

/**
 * Get comparison type label
 */
export function getComparisonTypeLabel(type: ComparisonType): string {
  switch (type) {
    case "previous_period":
      return "Previous Period";
    case "same_last_year":
      return "Same Time Last Year";
    case "month_before":
      return "Month Before";
    default:
      return "";
  }
}
