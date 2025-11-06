"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { ChevronDown } from 'lucide-react';

interface MetricCardData {
  period?: string;
  total_orders?: number;
  total_units?: number;
  total_sales?: number;
  total_discount?: number;
  total_fee?: number;
  total_cogs?: number;
  total_shipping_cost?: number;
  gross_profit?: number;
  net_profit?: number;
  ad_cost?: number;
  refund_amount?: number;
  refund_units?: number;

  // New calculated metrics
  profit_margin?: number;
  tacos?: number;
  fees_percent?: number;
  cogs_percent?: number;
  shipping_percent?: number;
  refund_rate?: number;

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
  loading?: boolean;
}> = ({ data, colorIndex, isSelected, onClick, onDateChange, loading = false }) => {
  const colors = colorSchemes[colorIndex % colorSchemes.length];
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Skeleton component for loading state
  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-300 rounded ${className}`}></div>
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        setIsDetailsOpen(false);
      }
    };

    if (isDetailsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDetailsOpen]);

  return (
    <div className="relative" ref={detailsRef}>
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
        {/* Revenue */}
        <div className="mb-4">
          <div className="text-xs font-light text-gray-500 mb-1">Sales</div>
          <div className="text-2xl text-gray-800">
            {loading ? <Skeleton className="h-8 w-32" /> : formatCurrency(data.total_sales || 0)}
          </div>
        </div>

        {/* Orders / Units (smaller, under revenue) */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-light text-gray-500 mb-1">Orders / Units</div>
            <div className="text-sm text-gray-800">
              {loading ? <Skeleton className="h-5 w-20" /> : `${formatNumber(data.total_orders || 0)} / ${formatNumber(data.total_units || 0)}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-light text-gray-500 mb-1">Refund Rate</div>
            <div className="text-sm text-gray-800">
              {loading ? <Skeleton className="h-5 w-12" /> : `${data.refund_rate?.toFixed(2)}%`}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-3"></div>

        {/* Ad Spend and TACOS */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs font-light text-gray-500 mb-1">Ad Spend</div>
            <div className="text-lg text-gray-800">
              {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(data.ad_cost || 0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-light text-gray-500 mb-1">TACOS</div>
            <div className="text-lg text-gray-800">
              {loading ? <Skeleton className="h-6 w-16" /> : `${data.tacos?.toFixed(2)}%`}
            </div>
          </div>
        </div>

        {/* Profit and Margin */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-light text-gray-500 mb-1">Profit</div>
            <div className="text-lg text-gray-800">
              {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(data.net_profit || 0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-light text-gray-500 mb-1">Margin</div>
            <div className="text-lg text-gray-800">
              {loading ? <Skeleton className="h-6 w-16" /> : `${data.profit_margin?.toFixed(2)}%`}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Bottom Border with Details Button */}
      <div
        className="flex items-center justify-center px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsDetailsOpen(!isDetailsOpen);
        }}
      >
        <span className="text-xs font-medium text-gray-700">Details</span>
        <ChevronDown className={cn(
          "ml-1 h-4 w-4 text-gray-700 transition-transform duration-200",
          isDetailsOpen && "rotate-180"
        )} />
      </div>
    </Card>

    {/* Details Dropdown Overlay */}
    {isDetailsOpen && (
      <div
        className="absolute top-0 left-0 w-full bg-white rounded-xl shadow-xl z-50 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section - Period and Date Range */}
        <div className="flex justify-between items-center px-4 py-3 border-b-2 border-gray-300">
          <div className="flex gap-6">
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <span className="text-sm font-semibold text-gray-900">{data.period}</span>
            </div>
            {/* <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.startDate === data.endDate ? data.startDate : `${data.startDate} - ${data.endDate}`}
              </span>
            </div> */}
          </div>
        </div>

        {/* Metrics List */}
        <div className="divide-y divide-gray-200 [&>*]:flex [&>*]:justify-between [&>*]:items-center [&>*]:px-4 [&>*]:py-1 [&_span:first-child]:text-sm [&_span:first-child]:text-gray-600 [&_span:last-child]:text-sm [&_span:last-child]:font-semibold [&_span:last-child]:text-gray-900">
        <div><span>Total Sales</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.total_sales || 0)}</span></div>
        <div><span>Total Units</span><span>{loading ? <Skeleton className="h-4 w-16" /> : formatNumber(data.total_units || 0)}</span></div>
        <div><span>Total Fees</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.total_fee || 0)}</span></div>
        <div><span>Total COGS</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.total_cogs || 0)}</span></div>
        <div><span>Total Shipping Cost</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.total_shipping_cost || 0)}</span></div>
        <div><span>Ad Cost</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.ad_cost || 0)}</span></div>
        <div><span>Refund Amount</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.refund_amount || 0)}</span></div>
        <div><span>Net Profit</span><span>{loading ? <Skeleton className="h-4 w-20" /> : formatCurrency(data.net_profit || 0)}</span></div>
        <div><span>Profit Margin</span><span>{loading ? <Skeleton className="h-4 w-16" /> : `${data.profit_margin?.toFixed(2)}%`}</span></div>
        <div><span>Fees %</span><span>{loading ? <Skeleton className="h-4 w-16" /> : `${data.fees_percent?.toFixed(2)}%`}</span></div>
        <div><span>Shipping %</span><span>{loading ? <Skeleton className="h-4 w-16" /> : `${data.shipping_percent?.toFixed(2)}%`}</span></div>
        <div><span>COGS %</span><span>{loading ? <Skeleton className="h-4 w-16" /> : `${data.cogs_percent?.toFixed(2)}%`}</span></div>
        <div><span>TACOS</span><span>{loading ? <Skeleton className="h-4 w-16" /> : `${data.tacos?.toFixed(2)}%`}</span></div>
        {/* <div><span>Total Discount</span><span>{formatCurrency(data.total_discount || 0)}</span></div> */}
        {/* <div><span>Total Orders</span><span>{formatNumber(data.total_orders || 0)}</span></div> */}
        {/* <div><span>Gross Profit</span><span>{formatCurrency(data.gross_profit || 0)}</span></div> */}
        {/* <div><span>Refund Units</span><span>{formatNumber(data.refund_units || 0)}</span></div> */}
        {/* <div><span>Refund Rate</span><span>{data.refund_rate?.toFixed(2)}%</span></div> */}
        </div>
      </div>
      )}
    </div>
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

  console.log('[MetricCards] Rendering metric cards:', data?.length, 'loading:', loading);

  // Always show 4 cards, even when loading
  const cardsToRender = data.length > 0 ? data : [{}, {}, {}, {}];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cardsToRender.map((cardData, index) => (
        <MetricCard
          key={index}
          data={cardData}
          colorIndex={index}
          isSelected={index === selectedIndex}
          onClick={() => onCardClick?.(index)}
          onDateChange={(dateRange) => onCardDateChange?.(index, dateRange)}
          loading={loading}
        />
      ))}
    </div>
  );
};