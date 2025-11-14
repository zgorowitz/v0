import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Create response ONCE - this will carry updated cookies back to browser
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the existing response (syncs with server.js)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/db') ||  // Add this line
    pathname.includes('.')
  ) {
    // Still refresh session for cookie updates
    await supabase.auth.getUser()
    return response
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Define admin-only routes
  const adminOnlyRoutes = ['/settings', '/metrics', '/dashboard', '/analytics']
  const isAdminRoute = adminOnlyRoutes.some(route => pathname.startsWith(route))

  try {
    // Step 1: Check if user exists (Google sign-in with Supabase auth)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        // Only redirect if user is not already on login page
        if (pathname !== '/login') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return response
    }

    // Step 2: Check if user has organization and get role (only for authenticated users)
    const { data: orgData } = await supabase
      .from('organization_users')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()
    
    const userRole = orgData?.role
    
    // Check if desktop and redirect admin users to dashboard from home page
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    if (pathname === '/' && !isMobile && userRole === 'admin') {
        return NextResponse.redirect(new URL('/analytics', request.url))
    }
    
    if (pathname === '/' && isMobile) {
        return NextResponse.redirect(new URL('/scanner', request.url))
    }

    const hasOrganization = orgData && orgData.organization_id
    const isOnboarding = pathname === '/onboarding'

    if (!hasOrganization && !isOnboarding) {
      // No organization, redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (hasOrganization && isOnboarding) {
      // Has organization but on onboarding page, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Step 3: Check admin role for admin-only routes
    if (isAdminRoute && userRole !== 'admin') {
      // Non-admin user trying to access admin route, redirect to home with error
      const url = new URL('/', request.url)
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

  } catch (error) {
    // If there's an error, redirect to login if not on a public route
    console.warn('Middleware auth check failed:', error.message)
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
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