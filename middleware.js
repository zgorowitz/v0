import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  await supabase.auth.getUser()
  
  // Get the user sesion
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get the current path
  const { pathname } = request.nextUrl

  // Define protected routes (require authentication)
  const protectedRoutes = ['/orders', '/scan', '/settings', '/skus']
  
  // Define auth routes (login/signup pages)
  const authRoutes = ['/']

  // Check if user is trying to access protected routes without being logged in
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !user) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user is trying to access auth routes while already logged in
//   if (authRoutes.some(route => pathname.startsWith(route)) && user) {
//     const redirectUrl = new URL('/', request.url)
//     return NextResponse.redirect(redirectUrl)
//   }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}