import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is already in an organization
    const { data: existingOrgUser } = await supabase
      .from('organization_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingOrgUser) {
      return NextResponse.json(
        { success: false, error: 'User already belongs to an organization' },
        { status: 400 }
      )
    }

    // Call the create_organization function
    const { data: orgResult, error: orgError } = await supabase.rpc('create_organization', {
      admin_uuid: user.id
    })

    if (orgError || !orgResult.success) {
      console.error('Create organization error:', orgError || orgResult.error)
      return NextResponse.json(
        { success: false, error: orgResult?.error || 'Failed to create organization' },
        { status: 500 }
      )
    }

    const organizationId = orgResult.organization_id

    // Create organization_user record with admin role
    const { error: orgUserError } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        role: 'admin'
      })

    if (orgUserError) {
      console.error('Create organization_user error:', orgUserError)
      
      // Rollback: delete the organization if organization_user creation fails
      await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId)
      
      return NextResponse.json(
        { success: false, error: 'Failed to create organization user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('Create organization API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}