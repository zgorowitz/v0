// lib/cogs/data.js
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';

export async function fetchAllItems() {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    const { data, error } = await supabase
      .from('cogs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('title');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
}

export async function updateItemCogs(itemId, updates) {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    const { data, error } = await supabase
      .from('cogs')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating item COGS:', error);
    throw error;
  }
}

// Validate and sanitize item data
function validateItemData(item, organizationId) {
  if (!item.item_id) {
    throw new Error(`Invalid item: missing item_id`);
  }

  return {
    organization_id: organizationId,
    item_id: String(item.item_id).trim(),
    title: String(item.title || '').trim(),
    cogs: Math.max(0, parseFloat(item.cogs) || 0), // Ensure non-negative number
    tags: Array.isArray(item.tags) ? item.tags.filter(tag => tag && tag.trim()) : [],
    notes: String(item.notes || '').trim()
  };
}

// Process items in smaller batches to avoid timeouts
export async function bulkUpdateItemCogs(items) {
  if (!items || items.length === 0) {
    return [];
  }

  try {
    const organizationId = await getCurrentUserOrganizationId();

    // Validate all items first
    const validatedItems = [];
    const errors = [];

    items.forEach((item, index) => {
      try {
        validatedItems.push(validateItemData(item, organizationId));
      } catch (error) {
        errors.push({ index, item_id: item.item_id, error: error.message });
      }
    });

    // If there are validation errors, log them but continue with valid items
    if (errors.length > 0) {
      console.warn(`Validation errors for ${errors.length} items:`, errors);
    }

    if (validatedItems.length === 0) {
      throw new Error('No valid items to update');
    }

    // Process in batches to avoid large transaction issues
    const BATCH_SIZE = 50;
    const results = [];

    for (let i = 0; i < validatedItems.length; i += BATCH_SIZE) {
      const batch = validatedItems.slice(i, i + BATCH_SIZE);

      try {
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validatedItems.length / BATCH_SIZE)} (${batch.length} items)`);

        // For upsert, we don't need an id column since item_id is the primary key

        const { data, error } = await supabase
          .from('cogs')
          .upsert(batch, {
            onConflict: 'organization_id,item_id',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, {
            error: error,
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            batch_size: batch.length,
            batch_items: batch.slice(0, 3).map(item => item.item_id) // First 3 items for debugging
          });
          throw error;
        }

        if (data) {
          results.push(...data);
        }

        // Small delay between batches to reduce database load
        if (i + BATCH_SIZE < validatedItems.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error(`Error in batch starting at index ${i}:`, batchError);

        // Try to process items individually in this batch
        for (const item of batch) {
          try {
            const { data, error } = await supabase
              .from('cogs')
              .upsert([item], {
                onConflict: 'organization_id,item_id',
                ignoreDuplicates: false
              })
              .select();

            if (error) {
              console.error(`Failed to update item ${item.item_id}:`, error);
            } else if (data) {
              results.push(...data);
            }
          } catch (itemError) {
            console.error(`Individual item update failed for ${item.item_id}:`, itemError);
          }
        }
      }
    }

    console.log(`Successfully processed ${results.length} out of ${validatedItems.length} valid items`);

    return {
      success: true,
      processed: results.length,
      total: items.length,
      validItems: validatedItems.length,
      errors: errors,
      data: results
    };

  } catch (error) {
    console.error('Error in bulk update operation:', error);
    throw new Error(`Bulk update failed: ${error.message}`);
  }
}

// Helper function for individual item updates with retry logic
export async function updateSingleItemWithRetry(itemId, updates, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await updateItemCogs(itemId, updates);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed for item ${itemId}, retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Exponential backoff
    }
  }
}

// Batch delete function
export async function bulkDeleteItemCogs(itemIds) {
  try {
    const organizationId = await getCurrentUserOrganizationId();

    const { data, error } = await supabase
      .from('cogs')
      .delete()
      .eq('organization_id', organizationId)
      .in('item_id', itemIds)
      .select();

    if (error) throw error;

    return {
      success: true,
      deleted: data?.length || 0,
      data: data
    };
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    throw error;
  }
}