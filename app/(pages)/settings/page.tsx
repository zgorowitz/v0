"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { getMeliAccounts, getCurrentMeliUserId } from '@/lib/meli_tokens_client'
import { createClient, getCurrentUserOrganizationId } from '@/lib/supabase/client'

interface OrgUser {
  id: string
  user_id: string
  role: string
  invited_at: string
  joined_at: string | null
  user_email?: string
}

interface AllowedEmail {
  id: string
  organization_id: string
  email: string
  role: string
  added_by: string
  added_at: string
}

interface UserInfo {
  id: string | number
  nickname: string
  permalink?: string
  thumbnail?: {
    picture_url: string
  } | null
  first_name?: string
  last_name?: string
  country_id?: string
  site_id?: string
  user_type?: string
  seller_reputation?: {
    level_id: string | null
    power_seller_status: string | null
  } | null
  _source?: string
}

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean
    loading: boolean
    error: string | null
  }>({
    authenticated: false,
    loading: true,
    error: null
  })
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [urlError, setUrlError] = useState<{type: string, details: string | null} | null>(null)
  // Add new state for disconnect operation
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  // Organization user management state
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [allowedEmailsLoading, setAllowedEmailsLoading] = useState(false)
  const [deletingAllowed, setDeletingAllowed] = useState<string | null>(null)
  const supabase = createClient()

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
      // First, try to get data from database (fast client-side approach)
      try {
        const currentMeliUserId = await getCurrentMeliUserId()
        if (currentMeliUserId) {
          const allAccounts = await getMeliAccounts()
          const currentAccount = allAccounts.find((account: any) => account.meli_user_id === currentMeliUserId)
          
          if (currentAccount) {
            // Format the database data to match API response structure
            const userData = {
              id: currentAccount.meli_user_id,
              nickname: currentAccount.nickname,
              permalink: currentAccount.permalink,
              thumbnail: currentAccount.thumbnail_url ? {
                picture_url: currentAccount.thumbnail_url
              } : null,
              first_name: currentAccount.first_name,
              last_name: currentAccount.last_name,
              country_id: currentAccount.country_id,
              site_id: currentAccount.site_id,
              user_type: currentAccount.user_type,
              seller_reputation: (currentAccount.seller_level_id || currentAccount.power_seller_status) ? {
                level_id: currentAccount.seller_level_id,
                power_seller_status: currentAccount.power_seller_status
              } : null,
              _source: 'database'
            }
            
            setUserInfo(userData)
            return // Success! No need to call API
          }
        }
      } catch (dbError: any) {
        console.log('Database lookup failed, falling back to API:', dbError.message)
      }

      // Fallback: If database lookup failed, use the API route
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
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      setUserInfo(null)
    } finally {
      setLoadingUser(false)
    }
  }

  const handleDisconnect = async () => {
    // Reset error state
    setDisconnectError(null)
    setDisconnectLoading(true)
    
    try {
      const res = await fetch('/api/auth/disconnect', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        // Success - update UI state
        setAuthStatus({ authenticated: false, loading: false, error: null })
        setUserInfo(null)
        setUrlError(null)
        
        // Show success message briefly before reload
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        // Handle API error response
        const errorMessage = data.error || 'Failed to disconnect account'
        setDisconnectError(errorMessage)
        console.error('Disconnect failed:', data)
      }
    } catch (error: any) {
      // Handle network/connection errors
      const errorMessage = error.message || 'Network error occurred'
      setDisconnectError(errorMessage)
      console.error('Disconnect error:', error)
    } finally {
      setDisconnectLoading(false)
    }
  }

  const getErrorMessage = (errorType: string, details: string | null) => {
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

    const message = errorMessages[errorType as keyof typeof errorMessages] || `Unknown error: ${errorType}`
    return details ? `${message}\n\nDetails: ${details}` : message
  }

  const initiateAuth = () => {
    // Clear any existing errors before starting new auth
    setUrlError(null)
    
    // Include current URL as return URL
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/api/auth/initiate?returnUrl=${returnUrl}`
  }

  const fetchOrgUsers = useCallback(async () => {
    setOrgLoading(true)
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        console.warn('No organization found for current user')
        setOrgUsers([])
        return
      }

      const { data, error } = await supabase
        .from('organization_users_with_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('invited_at', { ascending: false })
      
      if (error) throw error
      setOrgUsers(data || [])
    } catch (error) {
      console.error('Error fetching organization users:', error)
    } finally {
      setOrgLoading(false)
    }
  }, [supabase])

  const addEmailToOrg = async () => {
    if (!newEmail.trim()) return
    
    setAddingEmail(true)
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) throw new Error('No authenticated user')

      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) throw new Error('No organization found for current user')

      const { error } = await supabase
        .from('allowed_emails')
        .insert({
          organization_id: organizationId,
          email: newEmail.trim().toLowerCase(),
          role: 'manager',
          added_by: currentUser.user.id
        })
      
      if (error) throw error
      
      setNewEmail('')
      fetchOrgUsers()
      fetchAllowedEmails()
    } catch (error) {
      console.error('Error adding email:', error)
    } finally {
      setAddingEmail(false)
    }
  }

  const deleteOrgUser = async (userId: string) => {
    setDeletingUser(userId)
    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      
      fetchOrgUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setDeletingUser(null)
    }
  }

  const fetchAllowedEmails = useCallback(async () => {
    setAllowedEmailsLoading(true)
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        setAllowedEmails([])
        return
      }

      const { data, error } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('added_at', { ascending: false })
      
      if (error) throw error
      setAllowedEmails(data || [])
    } catch (error) {
      console.error('Error fetching allowed emails:', error)
    } finally {
      setAllowedEmailsLoading(false)
    }
  }, [supabase])

  const deleteAllowedEmail = async (emailId: string) => {
    setDeletingAllowed(emailId)
    try {
      const { error } = await supabase
        .from('allowed_emails')
        .delete()
        .eq('id', emailId)
      
      if (error) throw error
      
      fetchAllowedEmails()
    } catch (error) {
      console.error('Error deleting allowed email:', error)
    } finally {
      setDeletingAllowed(null)
    }
  }

  useEffect(() => {
    if (authStatus.authenticated) {
      fetchOrgUsers()
      fetchAllowedEmails()
    }
  }, [authStatus.authenticated, fetchOrgUsers, fetchAllowedEmails])

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

        {/* Disconnect Error Display */}
        {disconnectError && (
          <Card className="w-full max-w-md mx-auto border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-xl text-red-800">
                Error al desconectar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700">
                    {disconnectError}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleDisconnect}
                    disabled={disconnectLoading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {disconnectLoading ? 'Desconectando...' : 'Intentar de nuevo'}
                  </Button>
                  
                  <Button 
                    onClick={() => setDisconnectError(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Cerrar
                  </Button>
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
                        disabled={disconnectLoading}
                        className="w-full"
                        variant={disconnectLoading ? "outline" : "default"}
                      >
                        {disconnectLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Desconectando...
                          </>
                        ) : (
                          'Desconectar'
                        )}
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

        {/* Organization Users Management */}
        {authStatus.authenticated && (
          <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">
                Usuarios de la Organización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orgLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Cargando usuarios...</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {orgUsers.length === 0 ? (
                    <div className="text-gray-500 text-sm py-4">No hay usuarios en la organización</div>
                  ) : (
                    orgUsers.map((user, index) => (
                      <div key={user.id}>
                        <div className="flex justify-between items-center py-3">
                          <div className="text-sm flex-1">
                            <div className="font-medium">{user.user_email || 'Email no disponible'}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              Rol: {user.role} • Invitado: {new Date(user.invited_at).toLocaleDateString()}
                              {user.joined_at && ` • Unido: ${new Date(user.joined_at).toLocaleDateString()}`}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteOrgUser(user.id)}
                            disabled={deletingUser === user.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {index < orgUsers.length - 1 && <div className="border-b border-gray-200" />}
                      </div>
                    ))
                  )}
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Agregar nuevo usuario</div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Ingrese email del usuario"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={addEmailToOrg}
                    disabled={addingEmail || !newEmail.trim()}
                    size="sm"
                  >
                    {addingEmail ? 'Agregando...' : 'Agregar'}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Usuarios Pendientes</div>
                {allowedEmailsLoading ? (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : allowedEmails.length === 0 ? (
                  <div className="text-gray-500 text-sm">No hay emails pendientes</div>
                ) : (
                  <div className="space-y-0">
                    {allowedEmails.map((email, index) => (
                      <div key={email.id}>
                        <div className="flex justify-between items-center py-3">
                          <div className="text-sm flex-1">
                            <div className="font-medium text-orange-700">{email.email}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              Rol: {email.role} • Agregado: {new Date(email.added_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAllowedEmail(email.id)}
                            disabled={deletingAllowed === email.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {index < allowedEmails.length - 1 && <div className="border-b border-gray-200" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </LayoutWrapper>
  )
}