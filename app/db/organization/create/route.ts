import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminUserId, mlUserInfo, name } = body
    
    // Support both ML-based creation and manual creation
    const organizationName = mlUserInfo?.nickname || name
    
    if (!organizationName || !adminUserId) {
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

    // Prepare organization data
    const orgData = {
      org_name: organizationName.trim(),
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

    // If ML user info is provided, update the organization with ML connection
    if (mlUserInfo && data.success) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          mercadolibre_account_id: mlUserInfo.id?.toString(),
          ml_connection_status: 'connected'
        })
        .eq('id', data.organization_id)

      if (updateError) {
        console.error('Error updating ML connection:', updateError)
        // Don't fail the whole request, organization is created
      }
    }

    return NextResponse.json({
      ...data,
      ml_connected: !!mlUserInfo,
      organization_name: organizationName
    })

  } catch (error) {
    console.error('Create organization API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}