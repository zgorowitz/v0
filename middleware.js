import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
//   // Create response ONCE - this will carry updated cookies back to browser
//   let supabaseResponse = NextResponse.next({ request })

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           // ✅ FIXED: Just set cookies on the existing response
//           // Don't create new response, don't set on request
//           cookiesToSet.forEach(({ name, value, options }) => {
//             supabaseResponse.cookies.set(name, value, options)
//           })
//         },
//       },
//     }
//   )

//   const { pathname } = request.nextUrl

//   // Skip organization checks for API routes, static files, and auth callback
//   if (
//     pathname.startsWith('/api') || 
//     pathname.startsWith('/db') ||
//     pathname.startsWith('/_next') ||
//     pathname.startsWith('/auth/callback') ||
//     pathname.includes('.')
//   ) {
//     // Still refresh session even for API routes (important for cookie updates)
//     await supabase.auth.getUser()
//     return supabaseResponse
//   }

//   // For page routes, do full auth flow
//   try {
//     // This refreshes session AND gets user data (only call once)
//     const { data: { user } } = await supabase.auth.getUser()
//     console.log('Middleware - User found:', !!user)
//     console.log('Middleware - Cookies being set:', response.cookies.getAll().length)  

//     // Define protected routes (require authentication)
//     const protectedRoutes = ['/orders', '/scan', '/settings', '/skus']

//     // Check if user is trying to access protected routes without being logged in
//     if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
//       const redirectUrl = new URL('/', request.url)
//       return NextResponse.redirect(redirectUrl)
//     }

//     if (user) {
//       // Only check organization for authenticated users on page routes
//       const result = await supabase.rpc('get_user_organization', { user_uuid: user.id })
//       const hasOrganization = result.data && result.data.length > 0
//       const isOnboarding = pathname === '/onboarding'

//       if (!hasOrganization && !isOnboarding) {
//         return NextResponse.redirect(new URL('/onboarding', request.url))
//       }

//       if (hasOrganization && isOnboarding) {
//         return NextResponse.redirect(new URL('/', request.url))
//       }
//     }
//   } catch (error) {
//     // If there's an error getting user/org data, let the page handle it
//     console.warn('Middleware auth check failed:', error.message)
//   }

//   return supabaseResponse
}

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except:
//      * - api routes (handled separately)
//      * - db routes (handled separately) 
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico, other static assets
//      */
//     '/((?!api|db|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
//   ],
// }