// 'use client'
// import { useState, useEffect, useCallback, useRef } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import { useRouter } from 'next/navigation'

// export default function OnboardingPage() {
//   const [error, setError] = useState('')
//   const [checkingEmail, setCheckingEmail] = useState(true)
//   const [showMLConnection, setShowMLConnection] = useState(false)
//   const [authStatus, setAuthStatus] = useState({
//     authenticated: false,
//     loading: true,
//     error: null
//   })
//   const [userInfo, setUserInfo] = useState(null)
//   const [loadingUser, setLoadingUser] = useState(false)
//   const [creatingOrg, setCreatingOrg] = useState(false)
  
//   // Refs to prevent double execution and track component mount
//   const hasCheckedEmail = useRef(false)
//   const hasCreatedOrg = useRef(false)
//   const isMounted = useRef(true)
//   const abortController = useRef(new AbortController())
  
//   const supabase = createClient()
//   const router = useRouter()

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       isMounted.current = false
//       abortController.current.abort()
//     }
//   }, [])

//   // Try to auto-assign user based on email allowlist
//   const handleAutoAssign = useCallback(async () => {
//     if (hasCheckedEmail.current) return
//     hasCheckedEmail.current = true

//     try {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) throw new Error('User not authenticated')

//       const response = await fetch('/db/user/auto-assign', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ userId: user.id }),
//         signal: abortController.current.signal
//       })

//       if (!response.ok) throw new Error(`HTTP ${response.status}`)
//       const result = await response.json()

//       if (!isMounted.current) return

//       if (result.success) {
//         // Successfully auto-assigned, redirect to home
//         router.push('/')
//       } else {
//         // Email not in allowlist, show ML connection
//         setShowMLConnection(true)
//       }
//     } catch (err) {
//       if (err.name === 'AbortError') return
      
//       if (isMounted.current) {
//         console.error('Auto-assign error:', err)
//         setShowMLConnection(true)
//         setError('Unable to check email authorization. Please connect your MercadoLibre account.')
//       }
//     } finally {
//       if (isMounted.current) {
//         setCheckingEmail(false)
//       }
//     }
//   }, [supabase, router])

//   // Check MercadoLibre authentication status
//   const checkMLAuthStatus = useCallback(async () => {
//     try {
//       setAuthStatus(prev => ({ ...prev, loading: true, error: null }))
      
//       const response = await fetch('/api/auth/status', {
//         signal: abortController.current.signal
//       })
      
//       if (!response.ok) throw new Error(`HTTP ${response.status}`)
//       const data = await response.json()
      
//       if (!isMounted.current) return

//       setAuthStatus({
//         authenticated: data.authenticated,
//         loading: false,
//         error: null
//       })

//       // If authenticated, fetch user info
//       if (data.authenticated) {
//         await fetchMLUserInfo()
//       }
//     } catch (error) {
//       if (error.name === 'AbortError') return
      
//       if (isMounted.current) {
//         console.error('Error checking ML auth status:', error)
//         setAuthStatus({
//           authenticated: false,
//           loading: false,
//           error: 'Failed to check MercadoLibre connection'
//         })
//       }
//     }
//   }, [])

//   // Fetch MercadoLibre user info
//   const fetchMLUserInfo = useCallback(async () => {
//     if (loadingUser) return // Prevent double calls
    
//     setLoadingUser(true)
//     try {
//       const response = await fetch('/api/user', {
//         signal: abortController.current.signal
//       })
      
//       if (!response.ok) throw new Error(`HTTP ${response.status}`)
//       const userData = await response.json()
      
//       if (isMounted.current) {
//         setUserInfo(userData)
//       }
//     } catch (error) {
//       if (error.name === 'AbortError') return
      
//       if (isMounted.current) {
//         console.error('Error fetching ML user info:', error)
//         setUserInfo(null)
//         setError('Unable to load MercadoLibre account info. Please try reconnecting.')
//       }
//     } finally {
//       if (isMounted.current) {
//         setLoadingUser(false)
//       }
//     }
//   }, [loadingUser])

//   // Create organization from MercadoLibre data
//   const handleCreateOrganizationFromML = useCallback(async () => {
//     if (hasCreatedOrg.current || creatingOrg || !userInfo) return
    
//     hasCreatedOrg.current = true
//     setCreatingOrg(true)
//     setError('')
    
//     try {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) throw new Error('User not authenticated')

//       if (!userInfo.nickname) {
//         throw new Error('MercadoLibre account missing required information')
//       }

//       const response = await fetch('/db/organization/create', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           adminUserId: user.id,
//           mlUserInfo: userInfo
//         }),
//         signal: abortController.current.signal
//       })

//       if (!response.ok) throw new Error(`HTTP ${response.status}`)
//       const result = await response.json()

//       if (!isMounted.current) return

//       if (result.success) {
//         // Organization created, redirect to home
//         router.push('/')
//       } else {
//         throw new Error(result.error || 'Failed to create organization')
//       }
//     } catch (err) {
//       if (err.name === 'AbortError') return
      
//       if (isMounted.current) {
//         console.error('Organization creation error:', err)
//         setError(err.message || 'Failed to create organization. Please try again.')
//         setCreatingOrg(false)
//         hasCreatedOrg.current = false // Allow retry
//       }
//     }
//   }, [userInfo, creatingOrg, supabase, router])

//   // Initial email check on mount
//   useEffect(() => {
//     handleAutoAssign()
//   }, [handleAutoAssign])

//   // Check ML auth when ML connection is shown
//   useEffect(() => {
//     if (showMLConnection && !authStatus.loading && !authStatus.authenticated) {
//       checkMLAuthStatus()
//     }
//   }, [showMLConnection, checkMLAuthStatus, authStatus.loading, authStatus.authenticated])

//   // Auto-create organization when ML data is ready
//   useEffect(() => {
//     if (authStatus.authenticated && userInfo && !creatingOrg && !hasCreatedOrg.current) {
//       // Small delay to ensure UI is ready
//       const timer = setTimeout(() => {
//         if (isMounted.current) {
//           handleCreateOrganizationFromML()
//         }
//       }, 500)
      
//       return () => clearTimeout(timer)
//     }
//   }, [authStatus.authenticated, userInfo, creatingOrg, handleCreateOrganizationFromML])

//   // Handle retry connection
//   const handleRetryConnection = useCallback(() => {
//     setError('')
//     setAuthStatus({ authenticated: false, loading: true, error: null })
//     setUserInfo(null)
//     checkMLAuthStatus()
//   }, [checkMLAuthStatus])

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="max-w-md w-full space-y-8">
//         <div className="text-center">
//           <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
//           <p className="mt-2 text-gray-600">Setting up your organization</p>
//         </div>

//         {/* Loading state while checking email */}
//         {checkingEmail && (
//           <div className="bg-white p-6 rounded-lg shadow text-center">
//             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
//             <p className="text-gray-600">Checking your email authorization...</p>
//           </div>
//         )}

//         {/* MercadoLibre Connection (shown after email check fails) */}
//         {showMLConnection && (
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h2 className="text-lg font-semibold mb-4">Connect to MercadoLibre</h2>
//             <p className="text-sm text-gray-600 mb-4">
//               Connect your MercadoLibre account to create your organization and get started.
//             </p>
            
//             {error && (
//               <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
//                 <p className="text-sm">{error}</p>
//                 {!creatingOrg && !authStatus.loading && (
//                   <button 
//                     onClick={handleRetryConnection}
//                     className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
//                   >
//                     Try again
//                   </button>
//                 )}
//               </div>
//             )}

//             {/* Creating organization loading state */}
//             {creatingOrg && (
//               <div className="text-center py-4">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
//                 <p className="text-gray-600">Creating your organization...</p>
//                 <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
//               </div>
//             )}

//             {/* ML Connection States */}
//             {!creatingOrg && (
//               <>
//                 {authStatus.loading ? (
//                   <div className="text-center py-4">
//                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
//                     <p className="text-sm text-gray-600">Checking MercadoLibre connection...</p>
//                   </div>
//                 ) : authStatus.error ? (
//                   <div className="space-y-3">
//                     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//                       <p className="text-sm">{authStatus.error}</p>
//                     </div>
//                     <button 
//                       onClick={handleRetryConnection}
//                       className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
//                     >
//                       Retry Connection
//                     </button>
//                   </div>
//                 ) : !authStatus.authenticated ? (
//                   <div className="text-center py-4">
//                     <button 
//                       onClick={() => window.location.href = '/api/auth/initiate'}
//                       className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
//                     >
//                       Connect to MercadoLibre
//                     </button>
//                     <p className="text-xs text-gray-500 mt-2">
//                       You'll be redirected to MercadoLibre for secure authentication
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <div className="flex items-center justify-center">
//                       <span className="text-sm font-medium text-green-600">✓ Connected to MercadoLibre</span>
//                     </div>
                    
//                     {loadingUser ? (
//                       <div className="text-center py-4">
//                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
//                         <p className="text-sm text-gray-600">Loading account information...</p>
//                       </div>
//                     ) : userInfo ? (
//                       <div className="bg-gray-50 rounded-lg p-4 space-y-3">
//                         <div className="flex items-center gap-3">
//                           {userInfo.thumbnail?.picture_url && (
//                             <img 
//                               src={userInfo.thumbnail.picture_url} 
//                               alt={userInfo.nickname}
//                               className="w-12 h-12 rounded-full object-cover"
//                             />
//                           )}
//                           <div className="flex-1">
//                             <h3 className="font-semibold text-sm">{userInfo.nickname}</h3>
//                             <p className="text-xs text-gray-600">ID: {userInfo.id}</p>
//                           </div>
//                         </div>
                        
//                         <div className="text-center">
//                           <p className="text-sm text-green-600 font-medium">
//                             Creating organization "{userInfo.nickname}"...
//                           </p>
//                           <p className="text-xs text-gray-500 mt-1">
//                             Please wait while we set up your account
//                           </p>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="text-center py-4 space-y-3">
//                         <p className="text-sm text-gray-600">Unable to load account information</p>
//                         <div className="space-y-2">
//                           <button 
//                             onClick={handleRetryConnection}
//                             className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200"
//                           >
//                             Retry Loading Info
//                           </button>
//                           <button 
//                             onClick={() => window.location.href = '/api/auth/initiate'}
//                             className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
//                           >
//                             Reconnect to MercadoLibre
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         )}

//         {/* Instructions */}
//         {!checkingEmail && !creatingOrg && (
//           <div className="text-center text-sm text-gray-500">
//             <p>Need help? Contact support team.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }


'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState('checking') // checking, connect, creating
  const [userInfo, setUserInfo] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkEmail()
  }, [])

  useEffect(() => {
    if (step === 'connect') {
      checkMLStatus()
    }
  }, [step])

  useEffect(() => {
    if (userInfo && step === 'connect') {
      createOrganization()
    }
  }, [userInfo, step])

  const checkEmail = async () => {
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
        setStep('connect')
      }
    } catch {
      setStep('connect')
    }
  }

  const checkMLStatus = async () => {
    try {
      const authResponse = await fetch('/api/auth/status')
      const authData = await authResponse.json()
      
      if (authData.authenticated) {
        const userResponse = await fetch('/api/user')
        const userData = await userResponse.json()
        setUserInfo(userData)
      }
    } catch {
      // Silent fail
    }
  }

  const createOrganization = async () => {
    setStep('creating')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const response = await fetch('/db/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUserId: user.id,
          mlUserInfo: userInfo
        })
      })
      const result = await response.json()
      
      if (result.success) {
        router.push('/')
      }
    } catch {
      setStep('connect')
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
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-black mb-8">Welcome</h1>
        
        {!userInfo ? (
          <div>
            <p className="text-black mb-6">Connect your MercadoLibre account to continue</p>
            <button 
              onClick={() => window.location.href = '/api/auth/initiate'}
              className="w-full bg-black text-white py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors"
            >
              Connect to MercadoLibre
            </button>
          </div>
        ) : (
          <div>
            <p className="text-black mb-4">Connected as {userInfo.nickname}</p>
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  )
}