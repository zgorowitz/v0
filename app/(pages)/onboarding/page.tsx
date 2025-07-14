'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Automatically check email on component mount
  useEffect(() => {
    handleAutoAssign()
  }, [])

  // Try to auto-assign user based on email allowlist
  const handleAutoAssign = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch('/db/user/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const result = await response.json()

      if (result.success) {
        // Successfully auto-assigned, redirect to home
        router.push('/')
      } else {
        // Email not in allowlist, show create organization option
        setShowCreateForm(true)
        setError('Your email is not pre-authorized. Please create a new organization below.')
      }
    } catch (err) {
      setShowCreateForm(true)
      setError('Unable to check email authorization. Please create a new organization below.')
    } finally {
      setCheckingEmail(false)
    }
  }

  // Create new organization (user becomes admin)
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationName.trim()) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const response = await fetch('/db/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: organizationName.trim(),
          adminUserId: user.id 
        })
      })

      const result = await response.json()

      if (result.success) {
        // Organization created, redirect to home
        router.push('/')
      } else {
        setError(result.error || 'Failed to create organization')
      }
    } catch (err) {
      setError('Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/') // or wherever your login page is
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
      <div className="flex justify-end">
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-600 underline"
          >
            Sign Out
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
          <p className="mt-2 text-gray-600">Setting up your organization access</p>
        </div>

        {/* Loading state while checking email */}
        {checkingEmail && (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking your email authorization...</p>
          </div>
        )}

        {/* Create organization form (shown after email check fails) */}
        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Create Your Organization</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter your organization name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !organizationName.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
            </form>

            <p className="mt-4 text-xs text-gray-500">
              By creating an organization, you will become the administrator with full access to manage users and settings.
            </p>
          </div>
        )}

        {/* Instructions */}
        {!checkingEmail && (
          <div className="text-center text-sm text-gray-500">
            <p>Need help? Contact your administrator or support team.</p>
          </div>
        )}
      </div>
    </div>
  )
}