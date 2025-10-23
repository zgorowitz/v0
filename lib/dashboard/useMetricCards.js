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

export const useMetricCards = (selectedItemIds = [], cardDateRanges = null) => {
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
    console.log('[useMetricCards] Effect triggered with selectedItemIds:', selectedItemIds, 'cardDateRanges:', cardDateRanges);

    const fetchAllMetrics = async () => {
      try {
        // Only fetch if cardDateRanges is provided
        if (!cardDateRanges || !Array.isArray(cardDateRanges) || cardDateRanges.length !== 4) {
          console.log('[useMetricCards] No card date ranges provided, skipping fetch');
          setLoading(false);
          return;
        }

        console.log('[useMetricCards] Starting to fetch metrics...');
        setLoading(true);
        const ranges = getDateRanges();

        const fetchPromises = cardDateRanges.map(async (dateRange, index) => {
          const { start, end, label } = dateRange;

          console.log(`[useMetricCards] Fetching metrics for card ${index} (${label}) with date range: ${start} to ${end}`);
          const data = await totalSalesData(start, end, selectedItemIds.length > 0 ? selectedItemIds : null);
          return {
            period: label,
            startDate: start,
            endDate: end,
            ...(data?.[0] || {})
          };
        });
        const results = await Promise.all(fetchPromises);
        console.log('[useMetricCards] Metrics fetched successfully with card date ranges:', results);
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
  }, [JSON.stringify(selectedItemIds), JSON.stringify(cardDateRanges)]); // Use JSON.stringify for deep comparison

  return { metricCards, loading, error };
};