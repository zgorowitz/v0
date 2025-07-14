import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('=== AUTO-ASSIGN API CALLED ===')
  
  try {
    const body = await request.json()
    console.log('1. Request body:', body)
    
    const { userId } = body
    
    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('2. Creating Supabase client...')
    const supabase = await createClient()

    // DEBUG: Get current authenticated user
    console.log('3. Getting authenticated user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('3a. Auth user result:', { 
      email: user?.email, 
      id: user?.id, 
      error: authError 
    })

    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // DEBUG: Check allowed emails table
    console.log('4. Checking allowed_emails table...')
    const { data: allowedEmails, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('*')

    console.log('4a. Allowed emails query result:', {
      data: allowedEmails,
      error: allowedError,
      count: allowedEmails?.length
    })

    // DEBUG: Check for exact email match
    const emailMatch = allowedEmails?.find(ae => {
      console.log(`4b. Comparing: "${ae.email}" === "${user.email}"`, ae.email === user.email)
      return ae.email === user.email
    })
    console.log('4c. Email match result:', emailMatch)

    // DEBUG: Check if user is already in organization_users
    console.log('5. Checking existing organization membership...')
    const { data: existingMembership, error: membershipError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('user_id', userId)

    console.log('5a. Existing membership:', {
      data: existingMembership,
      error: membershipError,
      count: existingMembership?.length
    })

    // Call the auto_assign_user_to_organization function
    console.log('6. Calling auto_assign_user_to_organization function...')
    console.log('6a. Function parameters:', { user_uuid: userId })
    
    const { data, error } = await supabase.rpc('auto_assign_user_to_organization', {
      user_uuid: userId
    })

    console.log('6b. Function result:', { data, error })

    // Prepare response
    const response = {
      success: data?.success || false,
      error: data?.error || error?.message || 'Unknown error',
      debug: {
        step: 'function_called',
        userEmail: user?.email,
        userId: user?.id,
        passedUserId: userId,
        allowedEmailsCount: allowedEmails?.length || 0,
        allowedEmails: allowedEmails,
        emailMatch: emailMatch || null,
        existingMembership: existingMembership,
        functionData: data,
        functionError: error,
        emailsInTable: allowedEmails?.map(ae => ae.email) || []
      }
    }

    console.log('7. Final response:', response)
    console.log('=== AUTO-ASSIGN API END ===')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ AUTO-ASSIGN API ERROR:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error.message,
        debug: {
          step: 'caught_exception',
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: 500 }
    )
  }
}