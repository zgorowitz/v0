import { supabase } from '@/lib/supabase/client';

export async function itemSalesData(organizationId, startDate, endDate) {
  const { data, error } = await supabase.rpc('get_item_sales_aggregated', {
    org_id: organizationId,
    start_date: startDate,
    end_date: endDate
  });
    
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  
  return data;
}

export async function totalSalesData(organizationId, startDate, endDate) {
  const { data, error } = await supabase.rpc('get_total_sales_aggregated', {
    org_id: organizationId,
    start_date: startDate,
    end_date: endDate
  });
    
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  
  return data;
}