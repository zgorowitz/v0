"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [allMeliAccounts, setAllMeliAccounts] = useState<UserInfo[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [urlError, setUrlError] = useState<{type: string, details: string | null} | null>(null)
  // Add new state for disconnect operation
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
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

      // If authenticated, fetch user info and all accounts
      if (data.authenticated) {
        fetchUserInfo()
        fetchAllMeliAccounts()
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

  const fetchAllMeliAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const allAccounts = await getMeliAccounts()
      
      // Format all accounts to match UserInfo structure
      const formattedAccounts = allAccounts.map((account: any) => ({
        id: account.meli_user_id,
        nickname: account.nickname,
        permalink: account.permalink,
        thumbnail: account.thumbnail_url ? {
          picture_url: account.thumbnail_url
        } : null,
        first_name: account.first_name,
        last_name: account.last_name,
        country_id: account.country_id,
        site_id: account.site_id,
        user_type: account.user_type,
        seller_reputation: (account.seller_level_id || account.power_seller_status) ? {
          level_id: account.seller_level_id,
          power_seller_status: account.power_seller_status
        } : null,
        _source: 'database'
      }))
      
      setAllMeliAccounts(formattedAccounts)
      
      // Set the current account as userInfo for backward compatibility
      const currentMeliUserId = await getCurrentMeliUserId()
      if (currentMeliUserId) {
        const currentAccount = formattedAccounts.find(account => account.id === currentMeliUserId)
        if (currentAccount) {
          setUserInfo(currentAccount)
        }
      }
    } catch (error) {
      console.error('Error fetching MercadoLibre accounts:', error)
      setAllMeliAccounts([])
    } finally {
      setLoadingAccounts(false)
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
      await fetchAllMeliAccounts()
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
      <main className="min-h-[calc(100vh-5rem)] p-4">
        
        {/* Error Displays */}
        {urlError && (
          <div className="w-full max-w-4xl mx-auto mb-6 border border-red-200 bg-red-50 rounded-lg p-6">
            <h2 className="text-xl text-red-800 font-semibold mb-4">
              Autenticación fallida
            </h2>
            <div className="space-y-4">
              <div className="bg-white border border-red-200 rounded p-3">
                <p className="text-sm text-red-700 whitespace-pre-line">
                  {getErrorMessage(urlError.type, urlError.details)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={initiateAuth}
                  className="w-full bg-black hover:bg-gray-800"
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
          </div>
        )}

        {disconnectError && (
          <div className="w-full max-w-4xl mx-auto mb-6 border border-red-200 bg-red-50 rounded-lg p-6">
            <h2 className="text-xl text-red-800 font-semibold mb-4">
              Error al desconectar
            </h2>
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
                  className="w-full bg-black hover:bg-gray-800"
                >
                  {disconnectLoading ? 'Desconectando...' : 'Intentar de nuevo'}
                </Button>
                
                <Button 
                  onClick={() => setDisconnectError(null)}
                  className="w-full bg-black hover:bg-gray-800"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two Sections */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-gray-200">
          
          {/* Section 1: MercadoLibre Connection */}
          <section className="bg-white p-6">
            <h2 className="text-xl font-semibold mb-6">
              Conexión con MercadoLibre
            </h2>
            
            <div className="space-y-4">
              {authStatus.loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Verificando conexión...</p>
                </div>
              ) : authStatus.error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {authStatus.error}
                </div>
              ) : !authStatus.authenticated ? (
                <div className="text-center py-8">
                  <Button 
                    onClick={initiateAuth}
                    className="w-full bg-black hover:bg-gray-800"
                  >
                    Conectar con MercadoLibre
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">✓ Conectado ({allMeliAccounts.length} cuenta{allMeliAccounts.length !== 1 ? 's' : ''})</span>
                    <Button 
                      size="sm"
                      onClick={refreshUserInfo}
                      disabled={loadingUser || loadingAccounts}
                      className="bg-black hover:bg-gray-800"
                    >
                      {loadingUser || loadingAccounts ? 'Cargando...' : 'Actualizar'}
                    </Button>
                  </div>
                  
                  {loadingAccounts ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando cuentas...</p>
                    </div>
                  ) : allMeliAccounts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {allMeliAccounts.map((account) => (
                          <div key={account.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              {account.thumbnail?.picture_url ? (
                                <img 
                                  src={account.thumbnail.picture_url} 
                                  alt={account.nickname}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                  {account.nickname?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm">{account.nickname}</h3>
                                <p className="text-xs text-gray-600">ID: {account.id}</p>
                                {userInfo?.id === account.id && (
                                  <p className="text-xs text-blue-600">• Cuenta actual</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button 
                                  size="sm"
                                  onClick={refreshUserInfo}
                                  disabled={loadingUser || loadingAccounts}
                                  className="bg-black hover:bg-gray-800"
                                >
                                  {loadingUser || loadingAccounts ? 'Cargando...' : 'Actualizar'}
                                </Button>
                                <Button
                                  onClick={() => setShowDisconnectDialog(true)}
                                  disabled={disconnectLoading}
                                  size="sm"
                                  className="bg-black hover:bg-gray-800"
                                >
                                  {disconnectLoading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                      Desconectando...
                                    </>
                                  ) : (
                                    'Desconectar'
                                  )}
                                </Button>
                              </div>
                            </div>
                            {account.seller_reputation && (
                              <div className="mt-2 text-xs text-gray-700">
                                <div>
                                  <span className="font-semibold">Reputación del vendedor:</span>
                                </div>
                                <div>
                                  Nivel: <span className="font-mono">{account.seller_reputation.level_id || 'N/A'}</span>
                                </div>
                                <div>
                                  Estado de Power Seller: <span className="font-mono">{account.seller_reputation.power_seller_status || 'N/A'}</span>
                                </div>
                              </div>
                            )}
                            {account.permalink && (
                              <a 
                                href={account.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                Ver perfil →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-center">
                        <Button 
                          onClick={initiateAuth}
                          className="w-full bg-black hover:bg-gray-800"
                        >
                          Conectar una cuenta diferente
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-700">No se encontraron cuentas de MercadoLibre</p>
                      <Button 
                        onClick={refreshUserInfo}
                        size="sm"
                        className="mt-2 bg-black hover:bg-gray-800"
                      >
                        Reintentar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Section 2: Organization Users Management */}
          <section className="bg-white p-6 border-t lg:border-t-0 border-gray-200">
            <h2 className="text-xl font-semibold mb-6">
              Usuarios de la Organización
            </h2>
            
            {!authStatus.authenticated ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Conéctate con MercadoLibre para gestionar usuarios</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Usuarios Actuales</h3>
                  {orgLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando usuarios...</p>
                    </div>
                  ) : (
                    <div className="space-y-0 border rounded-lg">
                      {orgUsers.length === 0 ? (
                        <div className="text-gray-500 text-sm py-4 px-4">No hay usuarios en la organización</div>
                      ) : (
                        orgUsers.map((user, index) => (
                          <div key={user.id}>
                            <div className="flex justify-between items-center py-3 px-4">
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
                                {deletingUser === user.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {index < orgUsers.length - 1 && <div className="border-b border-gray-200" />}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
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
                      className="bg-black hover:bg-gray-800"
                    >
                      {addingEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Agregando...
                        </>
                      ) : (
                        'Agregar'
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-3">Usuarios Pendientes</div>
                  {allowedEmailsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando emails pendientes...</p>
                    </div>
                  ) : (
                    <div className="space-y-0 border rounded-lg">
                      {allowedEmails.length === 0 ? (
                        <div className="text-gray-500 text-sm py-4 px-4">No hay emails pendientes</div>
                      ) : (
                        allowedEmails.map((email, index) => (
                          <div key={email.id}>
                            <div className="flex justify-between items-center py-3 px-4">
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
                                {deletingAllowed === email.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {index < allowedEmails.length - 1 && <div className="border-b border-gray-200" />}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar desconexión</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres desconectar tu cuenta de MercadoLibre? 
              Esta acción eliminará el acceso a todas las funcionalidades relacionadas con MercadoLibre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={disconnectLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await handleDisconnect()
                setShowDisconnectDialog(false)
              }}
              disabled={disconnectLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {disconnectLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Desconectando...
                </>
              ) : (
                'Sí, desconectar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}