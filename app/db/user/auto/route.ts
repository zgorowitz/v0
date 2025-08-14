import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const user = await getUser() // USING NEW FUNCTION

    // Check if user is already in an organization
    const { data: existingOrgUser } = await supabase
      .from('organization_users')
      .select('id')
      .eq('user_email', user.email)
      .single()

    if (existingOrgUser) {
      return NextResponse.json(
        { success: false, error: 'User already belongs to an organization' },
        { status: 100 }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage }, 
      { status: errorMessage.includes('not authenticated') ? 401 : 500 }
    )
  }
}