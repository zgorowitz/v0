// lib/cogs/actions.js
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';

/**
 * Fetch COGS values as a map { item_id: cogs_value }
 * Lightweight - only returns item_id and cogs columns
 */
export async function fetchCogsMap() {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    const { data, error } = await supabase
      .from('cogs')
      .select('item_id, cogs')
      .eq('organization_id', organizationId);

    if (error) throw error;

    // Convert array to map for fast lookup
    const cogsMap = {};
    (data || []).forEach(item => {
      cogsMap[item.item_id] = parseFloat(item.cogs) || 0;
    });

    return cogsMap;
  } catch (error) {
    console.error('Error fetching COGS map:', error);
    return {};
  }
}

/**
 * Update COGS for a single item
 * Returns the updated COGS value
 */
export async function updateSingleCogs(itemId, cogsValue) {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    const numericCogs = Math.max(0, parseFloat(cogsValue) || 0);

    const { data, error } = await supabase
      .from('cogs')
      .update({ cogs: numericCogs })
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .select('cogs')
      .single();

    if (error) throw error;
    return parseFloat(data.cogs) || 0;
  } catch (error) {
    console.error('Error updating COGS:', error);
    throw error;
  }
}
