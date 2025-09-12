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

const MetricCard: React.FC<{ data: MetricCardData; onDateChange?: (startDate: Date, endDate: Date) => void }> = ({ data, onDateChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
        {data.period}
      </h3>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 bg-white border shadow-lg">
            <DatePicker selected={startDate} onChange={(dates) => { const [start, end] = dates; setStartDate(start); setEndDate(end); if (start && end) { onDateChange?.(start, end); setShowPicker(false); } }} startDate={startDate} endDate={endDate} selectsRange inline />
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Sales</span>
          <span className="text-sm font-semibold text-gray-900">{formatCurrency(data.total_sales || 0)}</span>
        </div>
        
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
        <MetricCard key={index} data={cardData} onDateChange={(start, end) => onDateChange?.(index, start, end)} />
      ))}
    </div>
  );
};