// lib/supabase/script-client.js - Client for scripts and GitHub Actions
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// MercadoLibre API configuration
const MERCADO_LIBRE_APP_ID = process.env.MERCADO_LIBRE_APP_ID
const MERCADO_LIBRE_CLIENT_SECRET = process.env.MERCADO_LIBRE_CLIENT_SECRET
/**
 * Refresh MercadoLibre access token using refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>}
 */
async function refreshMeliToken(refreshToken) {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: MERCADO_LIBRE_APP_ID,
      client_secret: MERCADO_LIBRE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

/**
 * Refresh all MercadoLibre tokens for all accounts
 * Updates the meli_tokens table with new tokens
 * @returns {Promise<{success: number, errors: number, details: Array}>}
 */
export async function refreshAllTokens() {
  const supabase = createClient()  
  // Get all tokens that need refreshing
  const { data: tokens, error: fetchError } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, refresh_token, expires_at, organization_id')
  
  if (fetchError) {
    throw new Error(`Failed to fetch tokens: ${fetchError.message}`)
  }
  
  if (!tokens || tokens.length === 0) {
    console.log('No tokens found to refresh')
    return { success: 0, errors: 0, details: [] }
  }
  
  console.log(`📊 Found ${tokens.length} accounts to refresh`)
  
  const results = {
    success: 0,
    errors: 0,
    details: []
  }
  
  // Check if we have the required environment variables
  if (!MERCADO_LIBRE_APP_ID || !MERCADO_LIBRE_CLIENT_SECRET) {
    throw new Error('Missing: MERCADO_LIBRE_APP_ID and MERCADO_LIBRE_CLIENT_SECRET')
  }
  
  for (const token of tokens) {
    try {            
      // Refresh the token
      const newTokenData = await refreshMeliToken(token.refresh_token)
      
      // Calculate new expires_at timestamp
      const newExpiresAt = Math.floor(Date.now() / 1000) + newTokenData.expires_in
      
      // Update the token in the database
      const { error: updateError } = await supabase
        .from('meli_tokens')
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('meli_user_id', token.meli_user_id)
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`)
      }
      
      console.log(`Successfully refreshed token for user: ${token.meli_user_id}`)
      results.success++
      results.details.push({
        meli_user_id: token.meli_user_id,
        status: 'success',
        message: `Token refreshed, expires in ${Math.floor(newTokenData.expires_in / 3600)} hours`
      })
      
      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Failed to refresh user ${token.meli_user_id}:`, error.message)
      results.errors++
      results.details.push({
        meli_user_id: token.meli_user_id,
        status: 'error',
        message: error.message
      })
    }
  }
  
  // console.log('\n Token refresh summary:')
  // console.log(` Successful: ${results.success}`)
  // console.log(` Errors: ${results.errors}`)
  // console.log(` Skipped: ${results.details.filter(d => d.status === 'skipped').length}`)
  
  return results
}

/**
 * Check if tokens are about to expire (within specified hours)
 * @param {number} hoursThreshold - Hours before expiry to consider "about to expire" (default: 24)
 * @returns {Promise<Array>} Array of tokens that are about to expire
 */
export async function checkTokensExpiry(hoursThreshold = 24) {
  const supabase = createClient()
  
  const now = Math.floor(Date.now() / 1000)
  const thresholdTime = now + (hoursThreshold * 3600)
  
  const { data: expiringTokens, error } = await supabase
    .from('meli_tokens')
    .select('meli_user_id, expires_at, organization_id')
    .lt('expires_at', thresholdTime)
  
  if (error) {
    throw new Error(`Failed to check token expiry: ${error.message}`)
  }
  
  return expiringTokens || []
}