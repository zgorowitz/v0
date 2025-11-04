'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
                theme: 'filled_black',
                size: 'large',
                width: 250,
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

  if (loading) return <LoadingSpinner fullScreen message="Verificando autenticación..." />

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setGoogleScriptLoaded(true)}
        onError={() => console.error('Failed to load Google script')}
      />

      <main className="w-full min-h-screen py-20 lg:py-40 bg-muted flex items-center justify-center">
        <div className="container mx-auto">
          <div className="flex flex-col text-center py-14 gap-4 items-center">
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl md:text-5xl tracking-tighter max-w-xl font-regular">
                Análisis de ganancias precisas para Mercadolibre
              </h3>
              <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl">
                Conoce tus ganancias reales al instante. Visualiza tu rentabilidad producto por producto, teniendo en cuenta todas las tarifas de MercadoLibre, costos de envío, impuestos y promociones.
              </p>
              <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl">
                Identifica tus productos más rentables, detecta pérdidas ocultas y optimiza tu estrategia de precios con datos precisos.
              </p>
            </div>
            <div className="flex flex-col gap-4 items-center mt-4">
              <div id="g_id_signin" className="flex justify-center"></div>
              {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <p className="text-red-500 text-center text-sm">
                  Google Client ID not configured. Please check your environment variables.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}