"use client"

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface MetricCardData {
  period?: string;
  total_orders?: number;
  total_units?: number;
  total_sales?: number;
  total_discount?: number;
  total_fee?: number;
  total_cogs?: number;
  gross_profit?: number;
  net_profit?: number;
  ad_cost?: number;
  refund_amount?: number;
  refund_units?: number;
  startDate?: string;
  endDate?: string;
}

interface MetricCardsProps {
  data: MetricCardData[];
  loading?: boolean;
  selectedIndex?: number;
  onCardClick?: (index: number) => void;
  onCardDateChange?: (cardIndex: number, dateRange: DateRange) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

const colorSchemes = [
  { header: 'bg-emerald-200/75', text: 'text-emerald-800' }, // Fuller greenish
  { header: 'bg-teal-200/75', text: 'text-teal-800' },      // Fuller teal/greenish-blue
  { header: 'bg-cyan-200/75', text: 'text-cyan-800' },    // Fuller brownish
  { header: 'bg-sky-200/75', text: 'text-sky-800' },          // Fuller blueish
];

const MetricCard: React.FC<{
  data: MetricCardData;
  colorIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onDateChange?: (dateRange: DateRange) => void;
}> = ({ data, colorIndex, isSelected, onClick, onDateChange }) => {
  const colors = colorSchemes[colorIndex % colorSchemes.length];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg rounded-xl overflow-hidden",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
      onClick={onClick}
    >
      <CardHeader className={cn(colors.header, "px-4 pt-4 pb-3 rounded-t-xl")}>
        <div>
          <h3 className="text-sm font-medium text-gray-700">
            {data.period}
          </h3>
          <DateRangePicker
            onDateRangeChange={onDateChange}
            align="start"
            numberOfMonths={2}
          >
            <div
              className="text-xs text-gray-600 mt-0.5 cursor-pointer hover:text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {data.startDate === data.endDate
                ? data.startDate
                : `${data.startDate} - ${data.endDate}`}
            </div>
          </DateRangePicker>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-4">
        {/* Orders / Units - Single Row */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">Orders / Units</span>
          <span className="text-2xl font-bold text-gray-800">
            {formatNumber(data.total_orders || 0)} / {formatNumber(data.total_units || 0)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-3"></div>

        {/* Revenue - Single Row */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">Revenue</span>
          <span className="text-2xl font-bold text-gray-800">
            {formatCurrency(data.total_sales || 0)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-3"></div>

        {/* Ad Spend - Single Row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-600">Ad Spend</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatCurrency(data.ad_cost || 0)}
          </span>
        </div>

        {/* Profit - Single Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Profit</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatCurrency(data.net_profit || 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({ data, loading, selectedIndex = 0, onCardClick, onCardDateChange }) => {
  // Debug: Log component renders
  useEffect(() => {
    console.log('[MetricCards] Component rendered with:', {
      dataLength: data?.length,
      loading,
      selectedIndex,
      hasOnCardClick: !!onCardClick
    });
  });

  // Debug: Log data changes
  useEffect(() => {
    console.log('[MetricCards] Data changed:', data);
  }, [data]);

  // Debug: Log loading changes
  useEffect(() => {
    console.log('[MetricCards] Loading state changed:', loading);
  }, [loading]);

  if (loading) {
    console.log('[MetricCards] Rendering loading state');
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ))}
      </div>
    );
  }

  console.log('[MetricCards] Rendering metric cards:', data?.length);
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {data.map((cardData, index) => (
        <MetricCard
          key={index}
          data={cardData}
          colorIndex={index}
          isSelected={index === selectedIndex}
          onClick={() => onCardClick?.(index)}
          onDateChange={(dateRange) => onCardDateChange?.(index, dateRange)}
        />
      ))}
    </div>
  );
};