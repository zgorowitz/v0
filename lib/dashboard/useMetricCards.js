import { useState, useEffect } from 'react';
import { totalSalesData } from './data';

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

export const useMetricCards = (selectedItemIds = []) => {
  const [metricCards, setMetricCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug: Log hook mount and updates
  useEffect(() => {
    console.log('[useMetricCards] Hook mounted/updated with selectedItemIds:', selectedItemIds);
    return () => {
      console.log('[useMetricCards] Hook cleanup');
    };
  });

  useEffect(() => {
    console.log('[useMetricCards] Effect triggered with selectedItemIds:', selectedItemIds);

    const fetchAllMetrics = async () => {
      try {
        console.log('[useMetricCards] Starting to fetch metrics...');
        setLoading(true);
        const ranges = getDateRanges();

        const fetchPromises = Object.entries(ranges).map(async ([key, range]) => {
          console.log(`[useMetricCards] Fetching metrics for ${range.label}`);
          const data = await totalSalesData(range.start, range.end, selectedItemIds.length > 0 ? selectedItemIds : null);
          return { period: range.label, ...(data?.[0] || {}) };
        });

        const results = await Promise.all(fetchPromises);
        console.log('[useMetricCards] Metrics fetched successfully:', results);
        setMetricCards(results);
      } catch (err) {
        console.error('[useMetricCards] Error fetching metric cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log('[useMetricCards] Loading complete');
      }
    };

    fetchAllMetrics();
  }, [JSON.stringify(selectedItemIds)]); // Use JSON.stringify for deep comparison

  const updateCardDate = async (cardIndex, startDate, endDate) => {
    console.log(`[useMetricCards] Updating card ${cardIndex} with date range:`, startDate, 'to', endDate);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const r = await totalSalesData(startStr, endStr, selectedItemIds.length > 0 ? selectedItemIds : null);

    setMetricCards(prev => {
      const updated = [...prev];
      updated[cardIndex] = { ...r?.[0], period: `${startStr} - ${endStr}` };
      console.log(`[useMetricCards] Card ${cardIndex} updated:`, updated[cardIndex]);
      return updated;
    });
  };

  return { metricCards, loading, error, updateCardDate };
};