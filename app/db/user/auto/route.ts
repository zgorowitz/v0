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
      .eq('user_id', user.id)
      .single()

    if (existingOrgUser) {
      return NextResponse.json(
        { success: false, error: 'User already belongs to an organization' },
        { status: 100 }
      )
    }
    
    // Ensure user has email before querying
    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      )
    }
    
    // Check if user email is in allowed_emails table
    const { data: allowedEmail, error: allowedEmailError } = await supabase
      .from('allowed_emails')
      .select('organization_id, role')
      .eq('email', user.email)
      .single()

    // Check if user is pre-approved (found in allowed_emails)
    // Handle Supabase .single() behavior: when no rows found, data=null and error has code 'PGRST116'
    const isNoRowsError = allowedEmailError?.code === 'PGRST116'
    
    if (allowedEmail && !isNoRowsError) {
      // User is pre-approved for an organization
      const { error: orgUserError } = await supabase
        .from('organization_users')
        .insert({
          organization_id: allowedEmail.organization_id,
          user_id: user.id,
          role: allowedEmail.role,
          joined_at: new Date().toISOString()
        })

      if (orgUserError) {
        return NextResponse.json(
          { success: false, error: 'Failed to join organization' },
          { status: 500 }
        )
      }

      // Remove from allowed_emails table
      await supabase
        .from('allowed_emails')
        .delete()
        .eq('email', user.email)

      return NextResponse.json({
        success: true,
        organization_id: allowedEmail.organization_id,
        message: 'Successfully joined organization'
      })
    }

    // Handle actual database errors (not just "no rows found")
    if (allowedEmailError && !isNoRowsError) {
      return NextResponse.json(
        { success: false, error: 'Database error checking invitations' },
        { status: 500 }
      )
    }
    
    // User is not pre-approved and should choose their onboarding path
    return NextResponse.json({
      success: false,
      message: 'User needs to choose onboarding path'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage }, 
      { status: errorMessage.includes('not authenticated') ? 401 : 500 }
    )
  }
}