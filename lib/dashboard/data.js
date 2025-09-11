import { supabase } from '@/lib/supabase/client';

export async function itemSalesData1(organizationId, startDate, endDate) {
  const { data, error } = await supabase
    .from('item_sales')
    .select(`
      item_id,
      title,
      available_quantity,
      thumbnail ,
      permalink,
      status,
      sub_status,
      item_orders.sum(),
      item_units.sum(),
      item_sales.sum(),
      item_discount.sum(),
      item_fee.sum()
    `)
    .eq('organization_id', organizationId)
    .gte('date', startDate)
    .lte('date', endDate)
    
  if (error) {
    console.error('Error fetching data:', error)
    return null
  }
  
  return data
}

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