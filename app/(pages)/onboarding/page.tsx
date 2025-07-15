
// 'use client'
// import { useState, useEffect } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import { useRouter } from 'next/navigation'

// export default function OnboardingPage() {
//   const [step, setStep] = useState('checking') // checking, choose, creating
//   const [organizationName, setOrganizationName] = useState('')
//   const [error, setError] = useState('')
//   const [user, setUser] = useState(null)
//   const supabase = createClient()
//   const router = useRouter()

//   useEffect(() => {
//     checkUserStatus()
//   }, [])

//   const checkUserStatus = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser()
      
//       if (!user) {
//         router.push('/auth/login')
//         return
//       }
      
//       setUser(user)
      
//       // Check if user already has organization access
//       const response = await fetch('/db/user/auto-assign', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ userId: user.id })
//       })
//       const result = await response.json()
      
//       if (result.success) {
//         router.push('/')
//       } else {
//         setStep('choose')
//       }
//     } catch (error) {
//       console.error('Error checking user status:', error)
//       setStep('choose')
//     }
//   }

//   const handleCreateOrganization = async () => {
//     if (!organizationName.trim()) {
//       setError('Organization name is required')
//       return
//     }

//     setStep('creating')
//     setError('')

//     try {
//       const response = await fetch('/db/organization/create', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: organizationName.trim()
//         })
//       })
      
//       const result = await response.json()
      
//       if (result.success) {
//         router.push('/')
//       } else {
//         setError(result.error || 'Failed to create organization')
//         setStep('choose')
//       }
//     } catch (error) {
//       console.error('Error creating organization:', error)
//       setError('Failed to create organization')
//       setStep('choose')
//     }
//   }

//   if (step === 'checking') {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-black">Checking authorization...</p>
//         </div>
//       </div>
//     )
//   }

//   if (step === 'creating') {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-black">Creating organization...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-white flex items-center justify-center p-4">
//       <div className="max-w-4xl w-full">
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-black mb-4">Welcome to the platform</h1>
//           <p className="text-gray-600">Choose how you'd like to get started</p>
//           {user && (
//             <p className="text-sm text-gray-500 mt-2">Signed in as {user.email}</p>
//           )}
//         </div>

//         {error && (
//           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
//             <p className="text-red-600 text-sm">{error}</p>
//           </div>
//         )}

//         <div className="grid md:grid-cols-2 gap-6">
//           {/* Create New Organization Card */}
//           <div className="border-2 border-black p-6 bg-white hover:bg-gray-50 transition-colors">
//             <div className="text-center">
//               <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//                 </svg>
//               </div>
//               <h2 className="text-xl font-bold text-black mb-3">Create New Organization</h2>
//               <p className="text-gray-600 mb-6">Start fresh with a new seller account and become the organization admin</p>
              
//               <div className="space-y-4">
//                 <input
//                   type="text"
//                   placeholder="Enter organization name"
//                   value={organizationName}
//                   onChange={(e) => setOrganizationName(e.target.value)}
//                   className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none"
//                   onKeyPress={(e) => e.key === 'Enter' && handleCreateOrganization()}
//                 />
//                 <button
//                   onClick={handleCreateOrganization}
//                   disabled={!organizationName.trim()}
//                   className="w-full bg-black text-white py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Create Organization
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Join Existing Organization Card */}
//           <div className="border-2 border-gray-300 p-6 bg-gray-50">
//             <div className="text-center">
//               <div className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857M11 4a3 3 0 116 0 3 3 0 01-6 0zM21 8a3 3 0 11-6 0 3 3 0 016 0z" />
//                 </svg>
//               </div>
//               <h2 className="text-xl font-bold text-gray-700 mb-3">Join Existing Organization</h2>
//               <p className="text-gray-600 mb-6">Ask your organization admin to invite you using your email address</p>
              
//               <div className="space-y-4">
//                 <div className="p-3 bg-white border border-gray-300 rounded">
//                   <p className="text-sm text-gray-600">Your email:</p>
//                   <p className="font-medium text-gray-800">{user?.email}</p>
//                 </div>
//                 <div className="text-sm text-gray-600 space-y-2">
//                   <p>✓ Share this email with your admin</p>
//                   <p>✓ Wait for them to add you to the organization</p>
//                   <p>✓ Refresh this page once invited</p>
//                 </div>
//                 <button
//                   onClick={() => window.location.reload()}
//                   className="w-full bg-gray-600 text-white py-3 px-6 border-2 border-gray-600 hover:bg-white hover:text-gray-600 transition-colors"
//                 >
//                   Refresh Page
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState('checking') // checking, choose, creating
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      // Check if user already has organization access
      const response = await fetch('/db/user/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const result = await response.json()
      
      if (result.success) {
        router.push('/')
      } else {
        setStep('choose')
      }
    } catch (error) {
      console.error('Error checking user status:', error)
      setStep('choose')
    }
  }

  const handleCreateOrganization = async () => {
    setStep('creating')
    setError('')

    try {
      const response = await fetch('/db/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const result = await response.json()
      
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || 'Failed to create organization')
        setStep('choose')
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      setError('Failed to create organization')
      setStep('choose')
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

  if (step === 'creating') {
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
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-4">Welcome to the platform</h1>
          <p className="text-gray-600">Choose how you'd like to get started</p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">Signed in as {user.email}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create New Organization Card */}
          <div className="border-2 border-black p-6 bg-white hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black mb-3">Create New Organization</h2>
              <p className="text-gray-600 mb-6">Start fresh with a new organization and become the admin</p>
              
              <div className="space-y-4">
                <button
                  onClick={handleCreateOrganization}
                  className="w-full bg-black text-white py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Create Organization
                </button>
              </div>
            </div>
          </div>

          {/* Join Existing Organization Card */}
          <div className="border-2 border-gray-300 p-6 bg-gray-50">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857M11 4a3 3 0 116 0 3 3 0 01-6 0zM21 8a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-3">Join Existing Organization</h2>
              <p className="text-gray-600 mb-6">Ask your organization admin to invite you using your email address</p>
              
              <div className="space-y-4">
                <div className="p-3 bg-white border border-gray-300 rounded">
                  <p className="text-sm text-gray-600">Your email:</p>
                  <p className="font-medium text-gray-800">{user?.email}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>✓ Share this email with your admin</p>
                  <p>✓ Wait for them to add you to the organization</p>
                  <p>✓ Refresh this page once invited</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-3 px-6 border-2 border-gray-600 hover:bg-white hover:text-gray-600 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}