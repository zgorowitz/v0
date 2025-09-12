import { useState, useEffect } from 'react';
import { totalSalesData } from './data';
import { getCurrentUserOrganizationId } from '@/lib/supabase/client';

const getDateRanges = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  return {
    today: {
      start: formatDate(today),
      end: formatDate(today),
      label: 'Today'
    },
    yesterday: {
      start: formatDate(yesterday),
      end: formatDate(yesterday),
      label: 'Yesterday'
    },
    last7Days: {
      start: formatDate(sevenDaysAgo),
      end: formatDate(today),
      label: 'Last 7 Days'
    },
    last30Days: {
      start: formatDate(thirtyDaysAgo),
      end: formatDate(today),
      label: 'Last 30 Days'
    }
  };
};

export const useMetricCards = () => {
  const [metricCards, setMetricCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllMetrics = async () => {
      try {
        setLoading(true);
        const organizationId = await getCurrentUserOrganizationId();
        const ranges = getDateRanges();
        
        const fetchPromises = Object.entries(ranges).map(async ([key, range]) => {
          const data = await totalSalesData(organizationId, range.start, range.end);
          return { period: range.label, ...(data?.[0] || {}) };
        });
        
        const results = await Promise.all(fetchPromises);
        setMetricCards(results);
      } catch (err) {
        console.error('Error fetching metric cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();
  }, []);

  const updateCardDate = async (cardIndex, startDate, endDate) => {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const orgId = await getCurrentUserOrganizationId();
    const r = await totalSalesData(orgId, startStr, endStr);
    
    setMetricCards(prev => {
      const updated = [...prev];
      updated[cardIndex] = { ...r?.[0], period: `${startStr} - ${endStr}` };
      return updated;
    });
  };

  return { metricCards, loading, error, updateCardDate };
};