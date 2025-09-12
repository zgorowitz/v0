'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(true)
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
      }
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase.auth])

  const handleSignInWithGoogle = useCallback(async (response) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })
      if (error) throw error
      
      router.push('/')
      
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }, [supabase.auth, router])

  useEffect(() => {
    if (!loading && googleScriptLoaded) {
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

      const timer = setTimeout(initializeGoogle, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, googleScriptLoaded, handleSignInWithGoogle])

  if (loading) return <div>Loading...</div>

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={() => setGoogleScriptLoaded(true)}
        onError={() => console.error('Failed to load Google script')}
      />
      
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-800 border-b pb-2">Mercado Libre Scanner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
          </CardContent>
        </Card>
      </main>
    </>
  )
}