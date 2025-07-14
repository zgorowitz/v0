import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminUserId, name } = body
    
    if (!name?.trim() || !adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Organization name and admin user ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the user making the request
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has an organization
    const { data: existingOrg } = await supabase.rpc('get_user_organization', { 
      user_uuid: user.id 
    })
    
    if (existingOrg && existingOrg.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User already belongs to an organization' },
        { status: 400 }
      )
    }

    // Prepare organization data
    const orgData = {
      org_name: name.trim(),
      admin_uuid: adminUserId
    }

    // Call the create_organization function
    const { data, error } = await supabase.rpc('create_organization', orgData)

    if (error) {
      console.error('Create organization error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization_id: data.organization_id,
      organization_name: name.trim(),
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