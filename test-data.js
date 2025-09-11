// Load environment variables
import { config } from 'dotenv';
config();

// Create a local version that doesn't use @/ aliases
import { createClient } from '@supabase/supabase-js';

async function itemSalesData(organizationId, startDate, endDate) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('item_sales')
    .select(`
      family_name,
      item_id,
      title,
      available_quantity,
      thumbnail,
      permalink,
      status,
      sub_status,
      item_orders,
      item_units,
      item_sales,
      item_discount,
      item_fee
    `)
    .eq('organization_id', organizationId)
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }
  
  return data;
}

async function testData() {
  try {
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Replace with actual org ID
    const startDate = '2025-09-08';
    const endDate = '2025-09-10';
    
    console.log('Testing itemSalesData with:', { organizationId, startDate, endDate });
    
    const result = await itemSalesData(organizationId, startDate, endDate);
    
    console.log('Result:', result);
    console.log('Result length:', result?.length);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testData();