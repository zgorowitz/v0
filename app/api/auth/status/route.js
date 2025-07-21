// app/api/auth/status/route.js

import { getMeliTokens, refreshMeliTokens } from '@/lib/meliTokens'
import { getUserSafely } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    console.log('=== Auth Status Check Started ===')
    
    // 1. CHECK SUPABASE SESSION
    const { user, error: sessionError } = await getUserSafely()
    
    if (!user) {
      console.log('No authenticated user found:', sessionError)
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_session',
        message: 'No authentication session found - please login'
      }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // 2. CHECK MELI TOKENS
    let storedTokens
    try {
      storedTokens = await getMeliTokens()
      console.log('MeLi tokens check:', {
        hasTokens: !!storedTokens,
        hasAccessToken: !!storedTokens?.access_token,
        hasRefreshToken: !!storedTokens?.refresh_token,
        expiresAt: storedTokens?.expires_at
      })
    } catch (tokenErr) {
      console.error('Error fetching MeLi tokens:', tokenErr)
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_meli_connection',
        message: 'Please connect your MercadoLibre account'
      })
    }

    if (!storedTokens || !storedTokens.access_token) {
      console.log('No MeLi tokens found')
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_meli_tokens',
        message: 'MercadoLibre account not connected'
      })
    }

    // 3. CHECK TOKEN EXPIRATION
    const expiresAt = parseInt(storedTokens.expires_at)
    if (isNaN(expiresAt)) {
      console.error('Invalid expires_at value')
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'invalid_token_expiry',
        message: 'Token expiry is invalid'
      }, { status: 500 })
    }

    const now = Date.now()
    const isExpired = now >= expiresAt
    const expiresInMinutes = Math.floor((expiresAt - now) / (1000 * 60))

    console.log(`Token expires in ${expiresInMinutes} minutes (expired: ${isExpired})`)

    // 4. IF TOKEN NOT EXPIRED, RETURN SUCCESS
    if (!isExpired) {
      return Response.json({
        authenticated: true,
        needs_auth: false,
        reason: 'valid_token',
        expires_in_minutes: expiresInMinutes
      })
    }

    // 5. TOKEN EXPIRED - TRY TO REFRESH
    console.log('Access token expired, attempting refresh...')
    
    if (!storedTokens.refresh_token) {
      console.log('No refresh token available')
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'no_refresh_token',
        message: 'Token expired and no refresh token available'
      })
    }

    // 6. ATTEMPT TOKEN REFRESH
    try {
      await refreshMeliTokens(storedTokens.refresh_token)
      console.log('Token refresh successful')
      
      return Response.json({
        authenticated: true,
        needs_auth: false,
        expires_in_minutes: Math.floor(3600 / 60),
        reason: 'refreshed_token'
      })

    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError)
      return Response.json({
        authenticated: false,
        needs_auth: true,
        reason: 'refresh_failed',
        message: 'Failed to refresh MercadoLibre token - please reconnect'
      }, { status: 401 })
    }

  } catch (error) {
    console.error('=== Auth Status Check Failed ===')
    console.error('Unexpected error in auth status:', error)
    
    return Response.json({
      authenticated: false,
      needs_auth: true,
      reason: 'status_check_failed',
      message: 'Failed to check authentication status'
    }, { status: 500 })
  }
}