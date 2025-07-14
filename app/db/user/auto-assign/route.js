import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  return NextResponse.json({ message: 'Use POST method' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call the auto_assign_user_to_organization function
    const { data, error } = await supabase.rpc('auto_assign_user_to_organization', {
      user_uuid: userId
    })

    if (error) {
      console.error('Auto-assign error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to check email authorization' },
        { status: 500 }
      )
    }

    // The function returns a JSONB object with success/error info
    return NextResponse.json(data)

  } catch (error) {
    console.error('Auto-assign API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}