// app/api/debug/cookies/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    // TEST 1: Cookie Access & Timing
    console.log('=== TEST 1: Cookie Access & Timing ===')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth')
    )

    results.tests.cookieAccess = {
      totalCookies: allCookies.length,
      authCookiesFound: authCookies.length,
      authCookieNames: authCookies.map(c => c.name),
      rawCookieHeader: request.headers.get('cookie') || 'NONE',
      cookieDetails: authCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        valuePreview: c.value?.substring(0, 50) + '...' || 'EMPTY'
      }))
    }

    // TEST 2: Domain/Path Analysis
    console.log('=== TEST 2: Domain/Path Analysis ===')
    const url = new URL(request.url)
    results.tests.domainPath = {
      requestHost: url.hostname,
      requestProtocol: url.protocol,
      isLocalhost: url.hostname === 'localhost',
      isProduction: url.hostname.includes('vercel.app') || !url.hostname.includes('localhost'),
      cookieDomains: authCookies.map(c => ({
        name: c.name,
        // Note: We can't access cookie domain/path from server-side, this is a browser security feature
        estimatedDomain: 'UNKNOWN_FROM_SERVER'
      })),
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      }
    }

    // TEST 3: Multiple Supabase Client Creation
    console.log('=== TEST 3: Multiple Supabase Client Creation ===')
    let client1, client2, client3
    const clientTests = {}

    try {
      // Client 1: Standard creation
      client1 = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              // Don't actually set in debug mode
              console.log('Client1 would set cookies:', cookiesToSet.length)
            },
          },
        }
      )
      const { data: user1, error: error1 } = await client1.auth.getUser()
      clientTests.client1 = {
        created: true,
        hasUser: !!user1?.user,
        error: error1?.message || null,
        userId: user1?.user?.id || null
      }
    } catch (err) {
      clientTests.client1 = {
        created: false,
        error: err.message
      }
    }

    try {
      // Client 2: With different cookie handling
      client2 = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll() // Different approach
            },
            setAll() {
              // No-op
            },
          },
        }
      )
      const { data: user2, error: error2 } = await client2.auth.getUser()
      clientTests.client2 = {
        created: true,
        hasUser: !!user2?.user,
        error: error2?.message || null,
        userId: user2?.user?.id || null,
        matchesClient1: user2?.user?.id === clientTests.client1?.userId
      }
    } catch (err) {
      clientTests.client2 = {
        created: false,
        error: err.message
      }
    }

    try {
      // Client 3: Minimal approach
      client3 = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        }
      )
      const { data: user3, error: error3 } = await client3.auth.getUser()
      clientTests.client3 = {
        created: true,
        hasUser: !!user3?.user,
        error: error3?.message || null,
        userId: user3?.user?.id || null,
        note: 'No cookies provided - should fail'
      }
    } catch (err) {
      clientTests.client3 = {
        created: false,
        error: err.message
      }
    }

    results.tests.multipleClients = clientTests

    // TEST 4: Cookie Serialization
    console.log('=== TEST 4: Cookie Serialization ===')
    results.tests.cookieSerialization = {
      parseAttempts: authCookies.map(cookie => {
        try {
          // Try to decode the cookie value
          const decoded = decodeURIComponent(cookie.value)
          const isJSON = decoded.startsWith('{') || decoded.startsWith('[')
          let parsed = null
          
          if (isJSON) {
            try {
              parsed = JSON.parse(decoded)
            } catch {
              parsed = 'INVALID_JSON'
            }
          }

          return {
            name: cookie.name,
            originalLength: cookie.value.length,
            decodedLength: decoded.length,
            isEncoded: decoded !== cookie.value,
            appearsJSON: isJSON,
            parsedSuccessfully: parsed !== 'INVALID_JSON' && parsed !== null,
            containsTokens: decoded.includes('access_token') || decoded.includes('refresh_token')
          }
        } catch (err) {
          return {
            name: cookie.name,
            error: err.message
          }
        }
      })
    }

    // TEST 5: HTTP Headers Analysis
    console.log('=== TEST 5: HTTP Headers Analysis ===')
    const relevantHeaders = [
      'cookie', 'authorization', 'x-forwarded-for', 'x-forwarded-proto',
      'user-agent', 'sec-fetch-site', 'sec-fetch-mode', 'same-origin'
    ]
    
    results.tests.httpHeaders = {
      relevantHeaders: Object.fromEntries(
        relevantHeaders.map(header => [
          header, 
          request.headers.get(header) || 'NOT_PRESENT'
        ])
      ),
      allHeaders: Object.fromEntries(request.headers.entries()),
      cookieHeaderParsed: request.headers.get('cookie')?.split(';').map(c => {
        const [name, ...value] = c.trim().split('=')
        return {
          name: name.trim(),
          hasValue: value.length > 0,
          valueLength: value.join('=').length
        }
      }) || []
    }

    // TEST 6: Environment & Context
    console.log('=== TEST 6: Environment & Context ===')
    results.tests.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlDomain: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'MISSING',
      runtime: typeof window === 'undefined' ? 'server' : 'client',
      nextjsVersion: process.env.npm_package_dependencies_next || 'UNKNOWN',
      cookieMethod: 'next/headers cookies()',
      timestamp: Date.now()
    }

    // TEST 7: Direct Cookie Access Test
    console.log('=== TEST 7: Direct Cookie Access Test ===')
    try {
      // Try different ways to access the same cookies
      const methods = []

      // Method 1: cookies() from next/headers
      try {
        const c1 = await cookies()
        methods.push({
          method: 'cookies() await',
          success: true,
          cookieCount: c1.getAll().length,
          authCookieCount: c1.getAll().filter(c => c.name.includes('sb-')).length
        })
      } catch (err) {
        methods.push({
          method: 'cookies() await',
          success: false,
          error: err.message
        })
      }

      // Method 2: request.cookies directly
      try {
        const c2 = request.cookies.getAll()
        methods.push({
          method: 'request.cookies',
          success: true,
          cookieCount: c2.length,
          authCookieCount: c2.filter(c => c.name.includes('sb-')).length
        })
      } catch (err) {
        methods.push({
          method: 'request.cookies',
          success: false,
          error: err.message
        })
      }

      results.tests.directAccess = {
        methods,
        consistent: methods.length > 1 && 
          methods[0].cookieCount === methods[1].cookieCount
      }
    } catch (err) {
      results.tests.directAccess = {
        error: err.message
      }
    }

    // SUMMARY & RECOMMENDATIONS
    results.analysis = {
      likelyIssues: [],
      recommendations: []
    }

    // Analyze results
    if (results.tests.cookieAccess.authCookiesFound === 0) {
      results.analysis.likelyIssues.push('NO_AUTH_COOKIES_FOUND')
      results.analysis.recommendations.push('Check if user is actually logged in on client side')
    }

    if (results.tests.multipleClients.client1?.hasUser !== results.tests.multipleClients.client2?.hasUser) {
      results.analysis.likelyIssues.push('INCONSISTENT_CLIENT_BEHAVIOR')
      results.analysis.recommendations.push('Cookie access method affects Supabase client behavior')
    }

    if (results.tests.environment.isLocalhost && results.tests.domainPath.isProduction) {
      results.analysis.likelyIssues.push('DOMAIN_MISMATCH')
      results.analysis.recommendations.push('Domain/environment mismatch detected')
    }

    if (!results.tests.directAccess?.consistent) {
      results.analysis.likelyIssues.push('COOKIE_ACCESS_INCONSISTENCY')
      results.analysis.recommendations.push('Different cookie access methods returning different results')
    }

    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Debug route error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}