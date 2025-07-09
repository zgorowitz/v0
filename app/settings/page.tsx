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

  useEffect(() => {
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

  const handleSaveSettings = () => {
    setIsSaving(true)

    // Save settings to localStorage
    localStorage.setItem("scannerSettings", JSON.stringify(settings))

    // Simulate API call to save settings
    setTimeout(() => {
      setIsSaving(false)
    }, 1000)
  }

  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 gap-6">
        
        {/* MercadoLibre Connection Card */}
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">
              MercadoLibre Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authStatus.loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Checking connection...</p>
              </div>
            ) : authStatus.error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {authStatus.error}
              </div>
            ) : !authStatus.authenticated ? (
              <div className="text-center py-4">
                {/* <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  Connect to your account.
                </div> */}
                <Button 
                  onClick={() => window.location.href = '/api/auth/initiate'}
                  className="w-full"
                >
                  Connect to MercadoLibre
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-600">✓ Connected</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchUserInfo}
                    disabled={loadingUser}
                  >
                    {loadingUser ? 'Loading...' : 'Refresh'}
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
                      </div>
                    </div>
                    
                    {userInfo.permalink && (
                      <a 
                        href={userInfo.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        View Profile →
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-600">Unable to load user info</p>
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