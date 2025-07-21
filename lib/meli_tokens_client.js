import { supabase } from '@/lib/supabase/client';


async function getCurrentUserOrganizationId() {
  console.log('[DEBUG] Getting user...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  console.log('[DEBUG] User data:', user);
  console.log('[DEBUG] User error:', userError);
  
  if (userError || !user) {
    console.log('[DEBUG] Auth failed - userError:', userError, 'user:', user);
    throw new Error('User not authenticated');
  }
  // const { data: { user }, error: userError } = await supabase.auth.getUser();
  // if (userError || !user) throw new Error('User not authenticated');

  const { data: orgUser, error: orgError } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (orgError || !orgUser) throw new Error('No organization found for user');
  return orgUser.organization_id;
}

// export async function getMeliAccounts() {
//   const organization_id = await getCurrentUserOrganizationId();
  
//   const { data, error } = await supabase
//     .from('meli_accounts')
//     .select('*')
//     .eq('organization_id', organization_id);
    
//   if (error) throw error;
//   return data;
// }

export async function getMeliAccounts() {
  try {
    const organization_id = await getCurrentUserOrganizationId();

    const { data, error } = await supabase
      .from('meli_accounts')
      .select('*')
      .eq('organization_id', organization_id);
    return data;
  } catch (err) {
    throw err;
  }
}

export async function updateMeliCurrent(meliUserId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('organization_users')
    .update({ current_meli_user_id: meliUserId })
    .eq('user_id', user.id);
    
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}