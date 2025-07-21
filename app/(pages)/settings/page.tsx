"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState({
    authenticated: false,
    loading: true,
    error: null
  })
  const [userInfo, setUserInfo] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [urlError, setUrlError] = useState(null)

  useEffect(() => {
    // Check for URL parameters indicating auth errors or success
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const details = urlParams.get('details')
    const auth = urlParams.get('auth')

    if (error) {
      setUrlError({ type: error, details: details ? decodeURIComponent(details) : null })
    } else if (auth === 'success') {
      // Clear any existing errors on success
      setUrlError(null)
    }

    // Clean up URL
    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)

    // Check authentication status
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status')
      const data = await response.json()
      
      setAuthStatus({
        authenticated: data.authenticated,
        loading: false,
        error: null
      })

      // If authenticated, fetch user info
      if (data.authenticated) {
        fetchUserInfo()
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setAuthStatus({
        authenticated: false,
        loading: false,
        error: 'Failed to check authentication status'
      })
    }
  }

  const fetchUserInfo = async () => {
    setLoadingUser(true)
    try {
      const response = await fetch('/api/user')
      
      if (response.ok) {
        const userData = await response.json()
        setUserInfo(userData)
      } else {
        console.error('Failed to fetch user info:', response.status)
        setUserInfo(null)
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      setUserInfo(null)
    } finally {
      setLoadingUser(false)
    }
  }

  const refreshUserInfo = async () => {
    setLoadingUser(true)
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST'
      })
      if (!response.ok) {
        console.error('Failed to refresh token:', response.status)
        setUserInfo(null)
        return
      }
      await fetchUserInfo()
    } catch (error) {
      console.error('Error refreshing token:', error)
      setUserInfo(null)
    } finally {
      setLoadingUser(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setAuthStatus({ authenticated: false, loading: false, error: null });
        setUserInfo(null);
        setUrlError(null);
        window.location.reload();
      } else {
        alert('Failed to disconnect. Please try again.');
      }
    } catch (error) {
      alert('Error disconnecting: ' + error.message);
    }
  };

  const getErrorMessage = (errorType, details) => {
    const errorMessages = {
      access_denied: 'Authorization was denied. You may have clicked "Cancel" on the MercadoLibre authorization page.',
      no_code: 'No authorization code was received from MercadoLibre.',
      missing_app_id: 'Missing App ID configuration. Please check environment variables.',
      missing_client_secret: 'Missing Client Secret configuration. Please check environment variables.',
      token_exchange_failed: 'Failed to exchange authorization code for access token.',
      no_access_token: 'No access token received from MercadoLibre.',
      token_storage_failed: 'Failed to store tokens in database.',
      unexpected_error: 'An unexpected error occurred during authentication.',
      oauth_failed: 'OAuth authentication failed (generic error).'
    }

    const message = errorMessages[errorType] || `Unknown error: ${errorType}`
    return details ? `${message}\n\nDetails: ${details}` : message
  }

  const initiateAuth = () => {
    // Clear any existing errors before starting new auth
    setUrlError(null)
    window.location.href = '/api/auth/initiate'
  }

  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 gap-6">
        
        {/* Error Display */}
        {urlError && (
          <Card className="w-full max-w-md mx-auto border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-xl text-red-800">
                Autenticación fallida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700 whitespace-pre-line">
                    {getErrorMessage(urlError.type, urlError.details)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={initiateAuth}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Intentar de nuevo
                  </Button>
                  
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                      Detalles técnicos
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-gray-700">
                      <div><strong>Tipo de error:</strong> {urlError.type}</div>
                      {urlError.details && (
                        <div className="mt-1">
                          <strong>Detalles:</strong> 
                          <pre className="mt-1 text-xs whitespace-pre-wrap">{urlError.details}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MercadoLibre Connection Card */}
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">
              Conexión con MercadoLibre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authStatus.loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Verificando conexión...</p>
              </div>
            ) : authStatus.error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {authStatus.error}
              </div>
            ) : !authStatus.authenticated ? (
              <div className="text-center py-4">
                <Button 
                  onClick={initiateAuth}
                  className="w-full"
                >
                  Conectar con MercadoLibre
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-600">✓ Conectado</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshUserInfo}
                    disabled={loadingUser}
                  >
                    {loadingUser ? 'Cargando...' : 'Actualizar'}
                  </Button>
                </div>
                
                {loadingUser ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : userInfo ? (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {userInfo.thumbnail?.picture_url && (
                        <img 
                          src={userInfo.thumbnail.picture_url} 
                          alt={userInfo.nickname}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{userInfo.nickname}</h3>
                        <p className="text-xs text-gray-600">ID: {userInfo.id}</p>
                        {userInfo._source && (
                          <p className="text-xs text-blue-600">Source: {userInfo._source}</p>
                        )}
                      </div>
                    </div>
                    {userInfo.seller_reputation && (
                      <div className="mt-2 text-xs text-gray-700">
                        <div>
                          <span className="font-semibold">Reputación del vendedor:</span>
                        </div>
                        <div>
                          Nivel: <span className="font-mono">{userInfo.seller_reputation.level_id || 'N/A'}</span>
                        </div>
                        <div>
                          Estado de Power Seller: <span className="font-mono">{userInfo.seller_reputation.power_seller_status || 'N/A'}</span>
                        </div>
                      </div>
                    )}
                    {userInfo.permalink && (
                      <a 
                        href={userInfo.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Ver perfil →
                      </a>
                    )}
                    <div className="flex flex-col gap-2 mt-3">
                      <Button 
                        onClick={initiateAuth}
                        className="w-full mt-3"
                      >
                        Conectar una cuenta diferente
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        className="w-full"
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-600">No se pudo cargar la información del usuario</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </LayoutWrapper>
  )
}

// "use client"

// import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { LayoutWrapper } from "@/components/layout-wrapper"

// export default function SettingsPage() {
//   const [authStatus, setAuthStatus] = useState({
//     authenticated: false,
//     loading: true,
//     error: null
//   })
//   const [userInfo, setUserInfo] = useState(null)
//   const [loadingUser, setLoadingUser] = useState(false)

//   useEffect(() => {
//     // Check authentication status
//     checkAuthStatus()
//   }, [])

//   const checkAuthStatus = async () => {
//     try {
//       const response = await fetch('/api/auth/status')
//       const data = await response.json()
      
//       setAuthStatus({
//         authenticated: data.authenticated,
//         loading: false,
//         error: null
//       })

//       // If authenticated, fetch user info
//       if (data.authenticated) {
//         fetchUserInfo()
//       }
//     } catch (error) {
//       console.error('Error checking auth status:', error)
//       setAuthStatus({
//         authenticated: false,
//         loading: false,
//         error: 'Failed to check authentication status'
//       })
//     }
//   }

//   const fetchUserInfo = async () => {
//     setLoadingUser(true)
//     try {
//       const response = await fetch('/api/user')
      
//       if (response.ok) {
//         const userData = await response.json()
//         setUserInfo(userData)
//         // await fetch('/api/meli/account', {
//         //   method: 'POST',
//         //   headers: { 'Content-Type': 'application/json' },
//         //   body: JSON.stringify(userInfo)
//         // });
//       } else {
//         console.error('Failed to fetch user info:', response.status)
//         setUserInfo(null)


//       }
//     } catch (error) {
//       console.error('Error fetching user info:', error)
//       setUserInfo(null)
//     } finally {
//       setLoadingUser(false)
//     }
//   }

//   const refreshUserInfo = async () => {
//     setLoadingUser(true)
//     try {
//       // Step 1: Refresh the token
//       const response = await fetch('/api/auth/refresh',{
//         method: 'POST'
//       })
//       if (!response.ok) {
//         console.error('Failed to refresh token:', response.status)
//         setUserInfo(null)
//         return
//       }
//       // Step 2: Fetch the user info again
//       await fetchUserInfo()
//     } catch (error) {
//       console.error('Error refreshing token:', error)
//       setUserInfo(null)
//     } finally {
//       setLoadingUser(false)
//     }
//   }

//   const handleDisconnect = async () => {
//     try {
//       const res = await fetch('/api/auth/disconnect', { method: 'POST' });
//       if (res.ok) {
//         // Optionally clear any local state or storage here
//         setAuthStatus({ authenticated: false, loading: false, error: null });
//         setUserInfo(null);
//         // Optionally reload the page or redirect
//         window.location.reload();
//       } else {
//         alert('Failed to disconnect. Please try again.');
//       }
//     } catch (error) {
//       alert('Error disconnecting: ' + error.message);
//     }
//   };

  

//   return (
//     <LayoutWrapper>
//       <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 gap-6">
        
//         {/* MercadoLibre Connection Card */}
//         <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
//           <CardHeader>
//             <CardTitle className="text-xl">
//               MercadoLibre Connection
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {authStatus.loading ? (
//               <div className="text-center py-4">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//                 <p className="mt-2 text-sm text-gray-600">Checking connection...</p>
//               </div>
//             ) : authStatus.error ? (
//               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//                 {authStatus.error}
//               </div>
//             ) : !authStatus.authenticated ? (
//               <div className="text-center py-4">
//                 {/* <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
//                   Connect to your account.
//                 </div> */}
//                 <Button 
//                   onClick={() => window.location.href = '/api/auth/initiate'}
//                   className="w-full"
//                 >
//                   Connect to MercadoLibre
//                 </Button>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <span className="text-sm font-medium text-green-600">✓ Connected</span>
//                   <Button 
//                     variant="outline" 
//                     size="sm"
//                     onClick={refreshUserInfo}
//                     disabled={loadingUser}
//                   >
//                     {loadingUser ? 'Loading...' : 'Refresh'}
//                   </Button>
//                 </div>
                
//                 {loadingUser ? (
//                   <div className="text-center py-4">
//                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
//                   </div>
//                 ) : userInfo ? (
//                   <div className="bg-gray-50 rounded-lg p-4 space-y-3">
//                     <div className="flex items-center gap-3">
//                       {userInfo.thumbnail?.picture_url && (
//                         <img 
//                           src={userInfo.thumbnail.picture_url} 
//                           alt={userInfo.nickname}
//                           className="w-12 h-12 rounded-full object-cover"
//                         />
//                       )}
//                       <div className="flex-1">
//                         <h3 className="font-semibold text-sm">{userInfo.nickname}</h3>
//                         <p className="text-xs text-gray-600">ID: {userInfo.id}</p>
//                       </div>
//                     </div>
//                     {userInfo.seller_reputation && (
//                       <div className="mt-2 text-xs text-gray-700">
//                         <div>
//                           <span className="font-semibold">Seller Reputation:</span>
//                         </div>
//                         <div>
//                           Level: <span className="font-mono">{userInfo.seller_reputation.level_id || 'N/A'}</span>
//                         </div>
//                         <div>
//                           Power Seller Status: <span className="font-mono">{userInfo.seller_reputation.power_seller_status || 'N/A'}</span>
//                         </div>
//                       </div>
//                     )}
//                     {userInfo.permalink && (
//                       <a 
//                         href={userInfo.permalink}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
//                       >
//                         View Profile →
//                       </a>
//                     )}
//                     <div className="flex flex-col gap-2 mt-3">
//                       <Button 
//                         onClick={() => window.location.href = '/api/auth/initiate'}
//                         className="w-full mt-3"
//                         // variant="secondary"
//                       >
//                         Connect a different account
//                       </Button>
//                       <Button
//                         onClick={handleDisconnect}
//                         className="w-full"
//                         // variant="destructive"
//                       >
//                         Disconnect
//                       </Button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="text-center py-2">
//                     <p className="text-sm text-gray-600">Unable to load user info</p>
//                   </div>
//                 )}
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>
//     </LayoutWrapper>
//   )
// }