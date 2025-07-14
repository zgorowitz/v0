import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  return NextResponse.json({ message: 'Use POST method' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  try {
    const { name, adminUserId } = await request.json()
    
    if (!name || !adminUserId) {
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

    // Call the create_organization function
    const { data, error } = await supabase.rpc('create_organization', {
      org_name: name.trim(),
      admin_uuid: adminUserId
    })

    if (error) {
      console.error('Create organization error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // The function returns a JSONB object with success/error info
    return NextResponse.json(data)

  } catch (error) {
    console.error('Create organization API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}