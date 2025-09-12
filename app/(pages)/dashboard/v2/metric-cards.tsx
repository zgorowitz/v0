"use client"

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { totalSalesData } from '@/lib/dashboard/data';
import { getCurrentUserOrganizationId } from '@/lib/supabase/client';

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
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

const MetricCard: React.FC<{ initialData: MetricCardData }> = ({ initialData }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const r = await totalSalesData(await getCurrentUserOrganizationId(), dateStr, dateStr);
      setData(r?.[0] || initialData);
      setLoading(false);
    };
    fetchData();
  }, [selectedDate, initialData]);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
        {loading ? 'Loading...' : data.period}
      </h3>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 bg-white border shadow-lg">
            <DatePicker selected={selectedDate} onChange={(date) => { date && setSelectedDate(date); setShowPicker(false); }} inline />
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

export const MetricCards: React.FC<MetricCardsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-40 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {data.map((cardData, index) => (
        <MetricCard key={index} initialData={cardData} />
      ))}
    </div>
  );
};