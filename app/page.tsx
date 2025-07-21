'use client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import Script from 'next/script'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false)
  const supabase = createClient()

  // Check auth status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  // Handle Google sign-in (use useCallback to prevent recreation)
  const handleSignInWithGoogle = useCallback(async (response) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })
      if (error) throw error
      
      setUser(data.user)
      window.location.reload()
      
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }, [supabase.auth])

  // Initialize Google button after script loads
  useEffect(() => {
    if (!user && !loading && googleScriptLoaded) {
      const initializeGoogle = () => {
        if (typeof google !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
          try {
            google.accounts.id.initialize({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              callback: handleSignInWithGoogle
            })
            google.accounts.id.renderButton(
              document.getElementById('g_id_signin'),
              { 
                theme: 'outline', 
                size: 'large', 
                text: 'signin_with',
                shape: 'pill'
              }
            )
          } catch (error) {
            console.error('Error initializing Google Sign-In:', error)
          }
        } else {
          console.error('Google script not loaded or client ID missing')
        }
      }

      // Small delay to ensure DOM is ready
      const timer = setTimeout(initializeGoogle, 100)
      return () => clearTimeout(timer)
    }
  }, [user, loading, googleScriptLoaded, handleSignInWithGoogle])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return <div>Loading...</div>

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={() => setGoogleScriptLoaded(true)}
        onError={() => console.error('Failed to load Google script')}
      />
      
      <LayoutWrapper>
        <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-800">Mercado Libre Scanner</CardTitle>
              {/* <CardDescription className="text-gray-600">
                Escanea códigos de barras para obtener información del envio.
              </CardDescription> */}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {user ? (
                <>
                  <p className="text-center text-gray-700 mb-4">
                    Bienvenido, {user.user_metadata?.name}!
                  </p>
                  <Link href="/scan" className="w-full">
                    <Button className="w-full" size="lg">
                    Iniciar escaneo
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full"
                  >
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-medium text-gray-800 mb-2">Accede a tu cuenta</h2>
                    <p className="text-sm text-gray-600">Inicia sesión para acceder al escáner</p>
                  </div>
                  <div id="g_id_signin" className="flex justify-center"></div>
                  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <p className="text-red-500 mt-2 text-center text-sm">
                      Google Client ID not configured. Please check your environment variables.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </LayoutWrapper>
    </>
  )
}