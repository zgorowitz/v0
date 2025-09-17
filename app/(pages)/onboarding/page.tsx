'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

  if (step === 'checking') {
    return <LoadingSpinner fullScreen message="Verificando autorización..." />
  }

  if (step === 'creating') {
    return <LoadingSpinner fullScreen message="Creando organización..." />
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-4">Bienvenido a la plataforma</h1>
          <p className="text-gray-600">Elige cómo te gustaría comenzar</p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">Conectado como {user.email}</p>
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
              <h2 className="text-xl font-bold text-black mb-3">Crear nueva organización</h2>
              <p className="text-gray-600 mb-6">Comienza desde cero con una nueva cuenta de vendedor y conviértete en el administrador de la organización</p>
              
              <div className="space-y-4">
                <button
                  onClick={handleCreateOrganization}
                  className="w-full bg-black text-white py-3 px-6 border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Crear organización
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
              <h2 className="text-xl font-bold text-gray-700 mb-3">Unirse a una organización existente</h2>
              <p className="text-gray-600 mb-6">Pide a tu administrador que te invite usando tu dirección de correo electrónico</p>
              
              <div className="space-y-4">
                <div className="p-3 bg-white border border-gray-300 rounded">
                  <p className="text-sm text-gray-600">Tu correo electrónico:</p>
                  <p className="font-medium text-gray-800">{user?.email}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>✓ Comparte este correo con tu administrador</p>
                  <p>✓ Espera a que te agreguen a la organización</p>
                  <p>✓ Actualiza esta página una vez invitado</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-3 px-6 border-2 border-gray-600 hover:bg-white hover:text-gray-600 transition-colors"
                >
                  Actualizar página
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}