// lib/supabase/server.js - Simple Server Client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Cookie setting can fail in Server Components, that's expected
          }
        },
      },
    }
  )
}

// Get authenticated user (throws if not found)
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  
  return user
}

// Get user organization
export async function getUserOrganization() {
  const supabase = await createClient()
  const user = await getUser()
  
  const { data, error } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    throw new Error('No organization found')
  }
  
  return data.organization_id
}

// Get user with organization (common pattern)
export async function getUserWithOrganization() {
  const supabase = await createClient()
  const user = await getUser()
  const organization_id = await getUserOrganization()
  
  return { user, organization_id, supabase }
}

// Safe user getter (doesn't throw)
export async function getUserSafely() {
  try {
    const user = await getUser()
    return { user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

// API route wrapper
export function withAuth(handler) {
  return async (request, context) => {
    try {
      const { user, organization_id, supabase } = await getUserWithOrganization()
      return await handler(request, { ...context, user, organization_id, supabase })
    } catch (error) {
      return Response.json(
        { error: error.message }, 
        { status: error.message.includes('not authenticated') ? 401 : 500 }
      )
    }
  }
}