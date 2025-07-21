import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { 
          return request.cookies.getAll() 
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Only refresh the session, don't use the user data in middleware
  // This ensures cookies are properly set without interfering with API routes
  await supabase.auth.getUser()
  
  const { pathname } = request.nextUrl

  // Skip organization checks for API routes, static files, and auth callback
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/db') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth/callback') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // Only do organization checks for page routes, not API routes
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Only check organization for authenticated users on page routes
      const result = await supabase.rpc('get_user_organization', { user_uuid: user.id })
      const hasOrganization = result.data && result.data.length > 0
      const isOnboarding = pathname === '/onboarding'
      
      if (!hasOrganization && !isOnboarding) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      
      if (hasOrganization && isOnboarding) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  } catch (error) {
    // If there's an error getting user/org data, let the page handle it
    console.warn('Middleware auth check failed:', error.message)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - db routes (handled separately) 
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, other static assets
     */
    '/((?!api|db|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}