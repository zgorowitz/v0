// app/api/debug/session/route.js - Temporary debug route

import { createClient, getUserSafely } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Filter Supabase auth cookies
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth')
    )
    
    console.log('=== Session Debug Info ===')
    console.log('All cookies count:', allCookies.length)
    console.log('Auth cookies:', authCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    // Test client creation
    const supabase = await createClient()
    console.log('Client created:', !!supabase)
    
    // Test safe user retrieval
    const { user, error } = await getUserSafely(supabase)
    console.log('User retrieval:', { hasUser: !!user, error: error?.code })
    
    // Test direct auth call
    let directAuthResult
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      directAuthResult = {
        hasData: !!data,
        hasUser: !!data?.user,
        error: authError ? {
          name: authError.name,
          message: authError.message,
          status: authError.status
        } : null
      }
    } catch (err) {
      directAuthResult = {
        hasData: false,
        hasUser: false,
        error: {
          name: err.name,
          message: err.message
        }
      }
    }
    
    return Response.json({
      debug: {
        timestamp: new Date().toISOString(),
        cookies: {
          total: allCookies.length,
          authCookies: authCookies.length,
          authCookieNames: authCookies.map(c => c.name)
        },
        client: {
          created: !!supabase
        },
        userRetrieval: {
          hasUser: !!user,
          error: error?.code || null
        },
        directAuth: directAuthResult,
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      },
      recommendation: getRecommendation(authCookies, user, error)
    })
    
  } catch (error) {
    console.error('Debug route error:', error)
    return Response.json({
      debug: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    }, { status: 500 })
  }
}

function getRecommendation(authCookies, user, error) {
  if (authCookies.length === 0) {
    return "No Supabase auth cookies found. User might not be logged in on the client side, or cookies aren't being sent to server."
  }
  
  if (error?.code === 'SESSION_MISSING') {
    return "Auth cookies present but session missing. Check if middleware is interfering with cookies or if cookies have wrong domain/path."
  }
  
  if (user) {
    return "Session working correctly! The issue might be elsewhere."
  }
  
  return "Unknown issue. Check server logs for more details."
}