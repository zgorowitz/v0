"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useUserRole() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(sessionError)
          return
        }

        if (!session?.user) {
          setUser(null)
          setRole(null)
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
        } else {
          setRole(orgData?.role || null)
        }
        
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    getUserRole()
  }, [])

  return {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    error
  }
}