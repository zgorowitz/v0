import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';

export async function getAllFilterItems() {
  const organizationId = await getCurrentUserOrganizationId();
  
  let query = supabase
    .from('filter_items')
    .select('item_id, title, thumbnail');
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching filter items:', error);
    return [];
  }
  
  return data || [];
}

export async function itemSalesData(startDate, endDate, itemIds = null) {
  const organizationId = await getCurrentUserOrganizationId();

  const params = {
    org_id: organizationId,
    start_date: startDate,
    end_date: endDate
  };
  
  if (itemIds && itemIds.length > 0) {
    params.item_ids = itemIds;
  }
  
  const { data, error } = await supabase.rpc('get_item_sales_aggregated', params);
    
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  
  return data;
}

export async function totalSalesData(startDate, endDate, itemIds = null) {
  const organizationId = await getCurrentUserOrganizationId();

  const params = {
    org_id: organizationId,
    start_date: startDate,
    end_date: endDate
  };
  
  if (itemIds && itemIds.length > 0) {
    params.item_ids = itemIds;
  }
  
  const { data, error } = await supabase.rpc('get_total_sales_aggregated', params);
    
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  
  return data;
}