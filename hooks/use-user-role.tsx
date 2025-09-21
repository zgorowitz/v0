"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

const CACHE_KEY = 'user_role_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedRole() {
  if (typeof window === 'undefined') return null

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { user, role, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_DURATION

    if (isExpired) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }

    return { user, role }
  } catch {
    return null
  }
}

function setCachedRole(user, role) {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      user,
      role,
      timestamp: Date.now()
    }))
  } catch {
    // Ignore storage errors
  }
}

function clearCachedRole() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CACHE_KEY)
}

export function useUserRole() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function getUserRole() {
      try {
        // Check cache first
        const cached = getCachedRole()
        if (cached) {
          setUser(cached.user)
          setRole(cached.role)
          setLoading(false)
          return
        }

        // Get fresh data from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(sessionError)
          clearCachedRole()
          return
        }

        if (!session?.user) {
          setUser(null)
          setRole(null)
          clearCachedRole()
          return
        }

        setUser(session.user)

        const { data: orgData, error: orgError } = await supabase
          .from('organization_users')
          .select('role')
          .eq('user_id', session.user.id)
          .single()

        if (orgError) {
          setError(orgError)
          setRole(null)
          clearCachedRole()
        } else {
          const userRole = orgData?.role || null
          setRole(userRole)
          setCachedRole(session.user, userRole)
        }

      } catch (err) {
        setError(err)
        clearCachedRole()
      } finally {
        setLoading(false)
      }
    }

    getUserRole()

    // Listen for auth state changes to clear cache
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCachedRole()
        setUser(null)
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    error
  }
}