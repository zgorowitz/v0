import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      )
    }

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
      .eq('user_email', user.email)
      .single()

    if (existingOrgUser) {
      return NextResponse.json(
        { success: false, error: 'User already belongs to an organization' },
        { status: 400 }
      )
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        admin_user_id: user.id
      })
      .select('id')
      .single()

    if (orgError) {
      console.error('Create organization error:', orgError)
      return NextResponse.json(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Create organization_user record with admin role
    const { error: orgUserError } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organization.id,
        user_email: user.email,
        role: 'admin'
      })

    if (orgUserError) {
      console.error('Create organization_user error:', orgUserError)
      
      // Rollback: delete the organization if organization_user creation fails
      await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to create organization user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization_id: organization.id,
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