"use client"

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';

interface MetricCardData {
  period?: string;
  total_orders?: number;
  total_units?: number;
  total_sales?: number;
  total_discount?: number;
  total_fee?: number;
}

interface MetricCardsProps {
  data: MetricCardData[];
  loading?: boolean;
  onDateChange?: (index: number, startDate: Date, endDate: Date) => void;
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
  { header: 'bg-emerald-200', text: 'text-emerald-800' }, // Fuller greenish
  { header: 'bg-teal-200', text: 'text-teal-800' },      // Fuller teal/greenish-blue
  { header: 'bg-cyan-200', text: 'text-cyan-800' },    // Fuller brownish
  { header: 'bg-sky-200', text: 'text-sky-800' },          // Fuller blueish
];

const MetricCard: React.FC<{ data: MetricCardData; onDateChange?: (startDate: Date, endDate: Date) => void; colorIndex: number }> = ({ data, onDateChange, colorIndex }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const colors = colorSchemes[colorIndex % colorSchemes.length];
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Creamy header section */}
      <div className={`${colors.header} px-4 pt-4 pb-3`}>
        <h3 className="text-sm font-medium text-gray-700 mb-2 cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
          {data.period}
        </h3>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-600">Sales</span>
          <span className={`text-2xl font-bold ${colors.text}`}>{formatCurrency(data.total_sales || 0)}</span>
        </div>
      </div>
      
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 bg-white border shadow-lg">
            <DatePicker selected={startDate} onChange={(dates) => { const [start, end] = dates; setStartDate(start); setEndDate(end); if (start && end) { onDateChange?.(start, end); setShowPicker(false); } }} startDate={startDate} endDate={endDate} selectsRange inline />
          </div>
        </>
      )}
      
      {/* White body section */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Orders</span>
          <span className="text-sm font-medium text-gray-800">{formatNumber(data.total_orders || 0)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Units</span>
          <span className="text-sm font-medium text-gray-800">{formatNumber(data.total_units || 0)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Discount</span>
          <span className="text-sm font-medium text-gray-800">{formatCurrency(data.total_discount || 0)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Fee</span>
          <span className="text-sm font-medium text-gray-800">{formatCurrency(data.total_fee || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({ data, loading, onDateChange }) => {
  if (loading) {
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

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {data.map((cardData, index) => (
        <MetricCard 
          key={index} 
          data={cardData} 
          colorIndex={index}
          onDateChange={(start, end) => onDateChange?.(index, start, end)} 
        />
      ))}
    </div>
  );
};