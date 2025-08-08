"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatItem {
  label: string;
  value: string | number;
  trend?: string;
}

interface StatsHeaderProps {
  title: string;
  subtitle?: string;
  stats: StatItem[];
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  title,
  subtitle,
  stats
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extralight text-slate-800 tracking-wide">{title}</h1>
        {subtitle && (
          <p className="text-slate-600 mt-1 font-light">{subtitle}</p>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="border-0 shadow-sm bg-white hover:shadow-md transition-all duration-300"
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {stat.label}
                </p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-light text-slate-800">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  {stat.trend && (
                    <span className="text-xs text-slate-500 font-medium">
                      {stat.trend}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StatsHeader;