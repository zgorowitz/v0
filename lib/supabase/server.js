// lib/supabase/server.js - Robust server client with session handling
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  sessionTimeout: 30000, // 30 seconds
}

// Custom error classes
export class AuthenticationError extends Error {
  constructor(message = 'User not authenticated', code = 'AUTH_REQUIRED') {
    super(message)
    this.name = 'AuthenticationError'
    this.code = code
  }
}

export class OrganizationError extends Error {
  constructor(message = 'No organization found for user', code = 'ORG_NOT_FOUND') {
    super(message)
    this.name = 'OrganizationError'
    this.code = code
  }
}

export class SessionError extends Error {
  constructor(message = 'Session invalid or expired', code = 'SESSION_INVALID') {
    super(message)
    this.name = 'SessionError'
    this.code = code
  }
}

// Cached client creation - ensures same client per request
export const createClient = cache(async () => {
  try {
    const cookieStore = await cookies()

    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { 
            return cookieStore.getAll() 
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Always refresh the session to ensure we have latest auth state
    await client.auth.getUser()

    return client
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw new Error('Database connection failed')
  }
})

// Utility function to wait for client to be ready
async function waitForClient(supabase, timeout = CONFIG.sessionTimeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkClient = () => {
      if (Date.now() - startTime > timeout) {
        reject(new SessionError('Client initialization timeout'))
        return
      }

      if (supabase && typeof supabase.auth.getUser === 'function') {
        resolve(supabase)
      } else {
        setTimeout(checkClient, 100)
      }
    }

    checkClient()
  })
}

// Retry wrapper for database operations
async function withRetry(operation, maxRetries = CONFIG.maxRetries) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry authentication or organization errors
      if (error instanceof AuthenticationError || error instanceof OrganizationError) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error.message)
      
      // Exponential backoff
      const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Enhanced user authentication with session validation
export const getAuthenticatedUser = cache(async (supabase = null) => {
  try {
    const client = supabase || await createClient()
    
    // Wait for client to be ready
    await waitForClient(client)
    
    // Get user with detailed error handling
    const { data: { user }, error: userError } = await client.auth.getUser()
    
    if (userError) {
      console.error('Authentication error:', userError)
      
      // Handle specific auth errors
      if (userError.name === 'AuthSessionMissingError' || userError.message?.includes('Auth session missing')) {
        throw new AuthenticationError('No authentication session found', 'SESSION_MISSING')
      }
      
      if (userError.message?.includes('invalid_token') || userError.message?.includes('expired')) {
        throw new SessionError('Session expired, please login again', 'SESSION_EXPIRED')
      }
      
      if (userError.message?.includes('network') || userError.message?.includes('timeout')) {
        throw new SessionError('Connection timeout, please try again', 'CONNECTION_TIMEOUT')
      }
      
      throw new AuthenticationError(`Authentication failed: ${userError.message}`, 'AUTH_FAILED')
    }
    
    if (!user) {
      throw new AuthenticationError('No authenticated user found', 'NO_USER')
    }
    
    // Validate user object
    if (!user.id || !user.email) {
      throw new AuthenticationError('Invalid user session', 'INVALID_USER')
    }
    
    // Optional: Check if user session is recent enough
    const lastSignIn = new Date(user.last_sign_in_at || user.created_at)
    const sessionAge = Date.now() - lastSignIn.getTime()
    const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (sessionAge > maxSessionAge) {
      console.warn('User session is quite old:', sessionAge / (1000 * 60 * 60), 'hours')
    }
    
    return user
  } catch (error) {
    // Don't retry for auth session missing errors
    if (error instanceof AuthenticationError && error.code === 'SESSION_MISSING') {
      throw error
    }
    
    // Use retry for other errors
    return withRetry(async () => {
      const client = supabase || await createClient()
      
      // Wait for client to be ready
      await waitForClient(client)
      
      // Get user with detailed error handling
      const { data: { user }, error: userError } = await client.auth.getUser()
      
      if (userError) {
        console.error('Authentication error:', userError)
        
        // Handle specific auth errors
        if (userError.name === 'AuthSessionMissingError' || userError.message?.includes('Auth session missing')) {
          throw new AuthenticationError('No authentication session found', 'SESSION_MISSING')
        }
        
        if (userError.message?.includes('invalid_token') || userError.message?.includes('expired')) {
          throw new SessionError('Session expired, please login again', 'SESSION_EXPIRED')
        }
        
        if (userError.message?.includes('network') || userError.message?.includes('timeout')) {
          throw new SessionError('Connection timeout, please try again', 'CONNECTION_TIMEOUT')
        }
        
        throw new AuthenticationError(`Authentication failed: ${userError.message}`, 'AUTH_FAILED')
      }
      
      if (!user) {
        throw new AuthenticationError('No authenticated user found', 'NO_USER')
      }
      
      // Validate user object
      if (!user.id || !user.email) {
        throw new AuthenticationError('Invalid user session', 'INVALID_USER')
      }
      
      return user
    })
  }
})

// Enhanced organization retrieval with validation
export const getUserOrganization = cache(async (supabase = null) => {
  return withRetry(async () => {
    const client = supabase || await createClient()
    const user = await getAuthenticatedUser(client)
    
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id, role, created_at')
      .eq('user_id', user.id)
      .single()

    if (orgError) {
      console.error('Organization lookup error:', orgError)
      
      if (orgError.code === 'PGRST116') {
        throw new OrganizationError('User is not assigned to any organization', 'NO_ORG_ASSIGNMENT')
      }
      
      throw new OrganizationError(`Failed to get organization: ${orgError.message}`, 'ORG_LOOKUP_FAILED')
    }

    if (!orgUser || !orgUser.organization_id) {
      throw new OrganizationError('No organization found for user', 'ORG_NOT_FOUND')
    }
    
    return orgUser.organization_id
  })
})

// Get user with organization info
export const getUserWithOrganization = cache(async (supabase = null) => {
  return withRetry(async () => {
    const client = supabase || await createClient()
    const user = await getAuthenticatedUser(client)
    
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select(`
        organization_id,
        role,
        current_meli_user_id,
        created_at,
        organizations!inner (
          id,
          name,
          default_meli_user_id,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      throw new OrganizationError('User organization relationship not found')
    }
    
    return {
      user,
      organization_id: orgUser.organization_id,
      organization: orgUser.organizations,
      role: orgUser.role,
      current_meli_user_id: orgUser.current_meli_user_id
    }
  })
})

// Check if user has specific role
export const hasRole = async (requiredRole, supabase = null) => {
  try {
    const client = supabase || await createClient()
    const user = await getAuthenticatedUser(client)
    
    const { data: orgUser } = await client
      .from('organization_users')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!orgUser) return false
    
    // Role hierarchy: admin > member
    const roleHierarchy = { admin: 2, member: 1 }
    const userRoleLevel = roleHierarchy[orgUser.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0
    
    return userRoleLevel >= requiredRoleLevel
  } catch (error) {
    console.error('Role check failed:', error)
    return false
  }
}

// Validate admin access
export const requireAdmin = async (supabase = null) => {
  const isAdmin = await hasRole('admin', supabase)
  if (!isAdmin) {
    throw new AuthenticationError('Admin access required', 'ADMIN_REQUIRED')
  }
  return true
}

// Session health check
export const validateSession = async (supabase = null) => {
  try {
    const client = supabase || await createClient()
    
    // Check if we can get user without throwing errors
    const { data: { user }, error: userError } = await client.auth.getUser()
    
    if (userError) {
      console.log('Session validation error:', userError.message)
      return { 
        valid: false, 
        error: userError.message,
        code: userError.name === 'AuthSessionMissingError' ? 'SESSION_MISSING' : 'AUTH_ERROR',
        timestamp: new Date().toISOString()
      }
    }
    
    if (!user) {
      return { 
        valid: false, 
        error: 'No authenticated user',
        code: 'NO_USER',
        timestamp: new Date().toISOString()
      }
    }
    
    // Check if we can access database
    const { error: dbError } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    
    if (dbError && dbError.code !== 'PGRST116') {
      return { 
        valid: false, 
        error: 'Database access failed',
        code: 'DB_ACCESS_ERROR',
        timestamp: new Date().toISOString()
      }
    }
    
    return { 
      valid: true, 
      user_id: user.id,
      email: user.email,
      timestamp: new Date().toISOString() 
    }
  } catch (error) {
    console.error('Session validation failed:', error)
    return { 
      valid: false, 
      error: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString()
    }
  }
}

// Safe user getter that doesn't throw for missing sessions
export const getUserSafely = async (supabase = null) => {
  try {
    const client = supabase || await createClient()
    const { data: { user }, error } = await client.auth.getUser()
    
    return {
      user: error ? null : user,
      error: error ? {
        message: error.message,
        code: error.name === 'AuthSessionMissingError' ? 'SESSION_MISSING' : 'AUTH_ERROR'
      } : null
    }
  } catch (error) {
    return {
      user: null,
      error: {
        message: error.message,
        code: 'UNKNOWN'
      }
    }
  }
}

// Helper for API route error responses
export const handleAuthError = (error) => {
  console.error('Authentication error in API route:', error)
  
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        type: 'authentication'
      }
    }
  }
  
  if (error instanceof OrganizationError) {
    return {
      status: 403,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        type: 'organization'
      }
    }
  }
  
  if (error instanceof SessionError) {
    return {
      status: 401,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        type: 'session'
      }
    }
  }
  
  // Generic error
  return {
    status: 500,
    body: {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      type: 'server'
    }
  }
}

// Convenience wrapper for API routes
export const withAuth = (handler) => {
  return async (request, context) => {
    try {
      const supabase = await createClient()
      const user = await getAuthenticatedUser(supabase)
      const organization_id = await getUserOrganization(supabase)
      
      // Add auth info to request context
      const authContext = {
        ...context,
        user,
        organization_id,
        supabase
      }
      
      return await handler(request, authContext)
    } catch (error) {
      const { status, body } = handleAuthError(error)
      return Response.json(body, { status })
    }
  }
}

// Convenience wrapper for admin-only API routes
export const withAdminAuth = (handler) => {
  return async (request, context) => {
    try {
      const supabase = await createClient()
      const user = await getAuthenticatedUser(supabase)
      const organization_id = await getUserOrganization(supabase)
      await requireAdmin(supabase)
      
      const authContext = {
        ...context,
        user,
        organization_id,
        supabase
      }
      
      return await handler(request, authContext)
    } catch (error) {
      const { status, body } = handleAuthError(error)
      return Response.json(body, { status })
    }
  }
}

// Legacy exports for backward compatibility
export { createClient as createAuthenticatedClient, getUserOrganization as getUserInfo }