// app/api/auth/disconnect/route.js
// app/api/auth/disconnect/route.js
import { deleteMeliTokens } from '@/lib/meliTokens'
import { createClient, getUserOrganization, getUser } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const user = await getUser()
    const organization_id = await getUserOrganization()

    // Get current active meli_user_id (same logic as getCurrentMeliUserId)
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('current_meli_user_id')
      .eq('user_id', user.id)
      .single()

    let currentMeliUserId = orgUser?.current_meli_user_id

    // If no user choice, get organization default
    if (!currentMeliUserId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('default_meli_user_id')
        .eq('id', organization_id)
        .single()

      currentMeliUserId = org?.default_meli_user_id
    }

    if (!currentMeliUserId) {
      return Response.json(
        { error: 'No active MercadoLibre account found', success: false }, 
        { status: 404 }
      )
    }

    // Delete tokens for the current active account only
    await deleteMeliTokens()

    // Clear current meli user ID from organization_users
    await supabase
      .from('organization_users')
      .update({ current_meli_user_id: null })
      .eq('user_id', user.id)

    // Clear default meli user ID from organizations if it matches the disconnected account
    const { data: org } = await supabase
      .from('organizations')
      .select('default_meli_user_id')
      .eq('id', organization_id)
      .single()

    if (org?.default_meli_user_id === currentMeliUserId) {
      await supabase
        .from('organizations')
        .update({ default_meli_user_id: null })
        .eq('id', organization_id)
    }

    console.log(`MercadoLibre account ${currentMeliUserId} disconnected successfully`)
    return Response.json({ 
      success: true, 
      message: 'MercadoLibre account disconnected successfully' 
    })

  } catch (error) {
    console.error('Disconnect error:', error)
    
    // Handle authentication errors
    if (error.message === 'User not authenticated') {
      return Response.json(
        { error: 'User not authenticated', success: false }, 
        { status: 401 }
      )
    }
    
    if (error.message === 'No organization found') {
      return Response.json(
        { error: 'No organization found', success: false }, 
        { status: 404 }
      )
    }
    
    return Response.json(
      { error: error.message || 'Failed to disconnect MercadoLibre account', success: false }, 
      { status: 500 }
    )
  }
}