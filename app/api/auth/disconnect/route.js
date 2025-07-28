// app/api/auth/disconnect/route.js
import { deleteMeliTokens } from '@/lib/meliTokens'
import { createClient, getUserOrganization, getUser } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const user = await getUser()
    const organization_id = await getUserOrganization()

    // Get current active meli_user_id (same logic as getCurrentMeliUserId)
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('current_meli_user_id')
      .eq('user_id', user.id)
      .single()

    if (orgUserError) {
      console.error('Error fetching organization user:', orgUserError)
      return Response.json(
        { error: 'Failed to fetch user organization data', success: false }, 
        { status: 500 }
      )
    }

    let currentMeliUserId = orgUser?.current_meli_user_id

    // If no user choice, get organization default
    if (!currentMeliUserId) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('default_meli_user_id')
        .eq('id', organization_id)
        .single()

      if (orgError) {
        console.error('Error fetching organization:', orgError)
        return Response.json(
          { error: 'Failed to fetch organization data', success: false }, 
          { status: 500 }
        )
      }

      currentMeliUserId = org?.default_meli_user_id
    }

    // Delete tokens regardless of whether currentMeliUserId is set
    // This handles the case where tokens exist but current_meli_user_id is not set
    try {
      await deleteMeliTokens()
    } catch (tokenError) {
      console.error('Error deleting tokens:', tokenError)
      return Response.json(
        { error: 'Failed to delete authentication tokens', success: false }, 
        { status: 500 }
      )
    }

    // Clear current meli user ID from organization_users
    const { error: updateUserError } = await supabase
      .from('organization_users')
      .update({ current_meli_user_id: null })
      .eq('user_id', user.id)

    if (updateUserError) {
      console.error('Error updating organization user:', updateUserError)
      return Response.json(
        { error: 'Failed to update user organization settings', success: false }, 
        { status: 500 }
      )
    }

    // Clear default meli user ID from organizations if it matches the disconnected account
    if (currentMeliUserId) {
      const { data: org, error: orgFetchError } = await supabase
        .from('organizations')
        .select('default_meli_user_id')
        .eq('id', organization_id)
        .single()

      if (orgFetchError) {
        console.error('Error fetching organization for cleanup:', orgFetchError)
        // Don't fail the entire operation for this cleanup step
      } else if (org?.default_meli_user_id === currentMeliUserId) {
        const { error: updateOrgError } = await supabase
          .from('organizations')
          .update({ default_meli_user_id: null })
          .eq('id', organization_id)

        if (updateOrgError) {
          console.error('Error updating organization default:', updateOrgError)
          // Don't fail the entire operation for this cleanup step
        }
      }
    }

    console.log(`MercadoLibre account disconnected successfully${currentMeliUserId ? ` (${currentMeliUserId})` : ''}`)
    return Response.json({ 
      success: true, 
      message: 'MercadoLibre account disconnected successfully',
      disconnectedAccountId: currentMeliUserId || null
    })

  } catch (error) {
    console.error('Disconnect error:', error)
    
    // Handle authentication errors
    if (error.message === 'User not authenticated') {
      return Response.json(
        { error: 'User not authenticated. Please log in again.', success: false }, 
        { status: 401 }
      )
    }
    
    if (error.message === 'No organization found') {
      return Response.json(
        { error: 'No organization found. Please contact support.', success: false }, 
        { status: 404 }
      )
    }
    
    // Handle database connection errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return Response.json(
        { error: 'Database connection error. Please try again later.', success: false }, 
        { status: 503 }
      )
    }
    
    return Response.json(
      { error: 'An unexpected error occurred while disconnecting. Please try again.', success: false }, 
      { status: 500 }
    )
  }
}