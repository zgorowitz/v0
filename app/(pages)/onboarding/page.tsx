'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState('checking') // checking, create-org, creating
  const [orgName, setOrgName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAutoAssignment()
  }, [])

  const checkAutoAssignment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const response = await fetch('/db/user/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const result = await response.json()
      
      if (result.success) {
        router.push('/')
      } else {
        setStep('create-org')
      }
    } catch {
      setStep('create-org')
    }
  }

  const createOrganization = async (e) => {
    e.preventDefault()
    
    if (!orgName.trim()) return

    setIsCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const response = await fetch('/db/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          name: orgName.trim()
        })
      })
      const result = await response.json()
      
      if (result.success) {
        router.push('/')
      } else {
        console.error('Failed to create organization:', result.error)
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      setIsCreating(false)
    }
  }

  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black">Checking authorization...</p>
        </div>
      </div>
    )
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black">Creating organization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Welcome</h1>
          <p className="text-gray-600">Create your organization to get started</p>
        </div>
        
        <form onSubmit={createOrganization} className="space-y-6">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-black mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter your organization name"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
              required
              disabled={isCreating}
            />
          </div>
          
          <button
            type="submit"
            disabled={!orgName.trim() || isCreating}
            className="w-full bg-black text-white py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
          >
            Create Organization
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            You can connect MercadoLibre accounts after creating your organization
          </p>
        </div>
      </div>
    </div>
  )
}