'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function OnboardingPage() {
  const [step, setStep] = useState('checking') // checking, choose, creating
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
        router.push('/settings')
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

  const handleCopyEmail = async () => {
    if (user?.email) {
      try {
        await navigator.clipboard.writeText(user.email)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy email:', error)
      }
    }
  }

  if (step === 'checking') {
    return <LoadingSpinner fullScreen message="Verificando autorización..." />
  }

  if (step === 'creating') {
    return <LoadingSpinner fullScreen message="Creando organización..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background blobs */}
      {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#fae9c4] rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#f5e4ba] rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#f0daa0] rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div> */}

      <div className="max-w-2xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-800 via-yellow-700 to-amber-900 bg-clip-text text-transparent mb-4 animate-fade-in">
            ¡Bienvenido!
          </h1>
          {/* <p className="text-amber-950/80 text-xl font-medium">Comienza tu experiencia con nosotros</p> */}
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-[#efd192]/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-amber-950">{user.email}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-5 bg-red-50/90 backdrop-blur-sm border-2 border-red-200 rounded-2xl flex items-start gap-4 shadow-lg animate-shake">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-700 font-medium flex-1">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="backdrop-blur-xl rounded-3xl shadow-2xl border border-[#efd192]/50 p-8 md:p-12 space-y-8">
          {/* Join Organization Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-amber-950">Únete a tu equipo</h2>
            <p className="text-amber-900/70 text-xl max-w-lg mx-auto">
              Pide a tu administrador que te invite usando tu dirección de correo electrónico
            </p>
          </div>

          {/* Email Display with Copy Button */}
          <div className="bg-gradient-to-br from-[#fdf7ed] to-[#fae9c4] border-2 border-[#e8d5a8] rounded-2xl p-6 shadow-inner text-center">
            {/* <p className="text-sm font-semibold text-amber-900 mb-3 uppercase tracking-wide">correo electrónico:</p> */}
            <div className="flex items-center gap-3 flex-wrap group">
              <p className="font-bold text-amber-950 text-xl flex-1 min-w-0 break-all">{user?.email}</p>
              <button
                onClick={handleCopyEmail}
                className="p-2 hover:bg-amber-100 rounded-lg transition-all duration-200 group relative"
                title={copied ? "Copiado!" : "Copiar email"}
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-700 hover:text-amber-950 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#fdf7ed]/50 transition-colors duration-200 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b7355] to-[#6d5c47] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-amber-950/80 font-medium pt-1">Comparte este correo con tu administrador</p>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#fdf7ed]/50 transition-colors duration-200 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b8956a] to-[#9a7d58] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-amber-950/80 font-medium pt-1">Espera a que te agreguen a la organización</p>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#fdf7ed]/50 transition-colors duration-200 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4b96a] to-[#c4a95a] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-amber-950/80 font-medium pt-1">Actualiza esta página una vez invitado</p>
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={() => window.location.reload()}
            size="lg"
            className="w-full bg-gradient-to-r from-[#c4a95a] to-[#b89950] hover:from-[#b89950] hover:to-[#a88940] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 h-14 text-lg font-semibold rounded-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar página
          </Button>

          {/* Separator */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-[#d4b96a]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-6 bg-white text-sm font-semibold text-amber-800 uppercase tracking-wider">o</span>
            </div>
          </div>

          {/* Create Organization Section */}
          <div className="text-center space-y-6 pt-2">
            <div className="space-y-2">
              <p className="text-amber-950/80 font-medium">Nueva Cuenta</p>
              <p className="text-sm text-amber-900/60">Crea una nueva cuenta y conecta a tu Mercado Libre</p>
            </div>
            <Button
              onClick={handleCreateOrganization}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-10 h-14 text-lg font-semibold rounded-xl border-2 border-[#c4a95a] hover:border-[#b89950] hover:bg-[#f5ecd7] hover:text-amber-950 transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              Crear nueva organización
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-amber-900/80 font-medium">¿Necesitas ayuda?</p>
          <button className="text-amber-800 hover:text-amber-950 font-semibold underline underline-offset-4 hover:underline-offset-8 transition-all duration-200">
            Contacta con soporte
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}