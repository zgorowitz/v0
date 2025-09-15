"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, X, Package, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { CameraManager } from "@/lib/scan2/camera"
import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
import { useMultipleMode } from "@/hooks/use-multiple-mode"
import { useRouter } from "next/navigation"

type ScanMode = 'camera' | 'manual'

interface ScanState {
  mode: ScanMode
  error: string
  isScanning: boolean
  isProcessing: boolean
  scannedCodes: string[]
  manualInput: string
  permissionState: string
  justScanned: boolean
}

function ScanPage() {
  const router = useRouter()
  
  // Simplified state
  const [state, setState] = useState<ScanState>({
    mode: 'camera',
    error: '',
    isScanning: false,
    isProcessing: false,
    scannedCodes: [],
    manualInput: '',
    permissionState: 'unknown',
    justScanned: false
  })

  // Refs for DOM and instances
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraManagerRef = useRef<CameraManager | null>(null)
  const scannerRef = useRef<EnhancedBarcodeScanner | null>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const handleScannedCodeRef = useRef<((code: string) => void) | null>(null)

  // Multiple mode hook
  const { multipleMode, toggleMultipleMode } = useMultipleMode({
    clearScannedCodes: () => updateState({ scannedCodes: [] }),
    enableVibration: true,
    enableLogging: true
  })

  // State updater helper
  const updateState = useCallback((updates: Partial<ScanState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Initialize camera and scanner instances
  useEffect(() => {
    const initializeInstances = () => {
      try {
        const cameraManager = new CameraManager()
        const scanner = new EnhancedBarcodeScanner()
        
        cameraManagerRef.current = cameraManager
        scannerRef.current = scanner

        // Set up permission callback
        cameraManager.setPermissionChangeCallback((newState: string) => {
          updateState({ permissionState: newState })
          if (newState === 'granted' && state.mode === 'camera') {
            setTimeout(() => startCamera(), 100)
          }
        })

        // Cleanup function
        cleanupRef.current = () => {
          scanner.stopScanning()
          cameraManager.stopCamera()
        }

        // Auto-start camera if in camera mode
        if (state.mode === 'camera') {
          startCamera()
        }
      } catch (err) {
        console.error('Failed to initialize camera/scanner:', err)
        updateState({ error: 'Failed to initialize camera system' })
      }
    }

    initializeInstances()

    return () => {
      cleanupRef.current()
    }
  }, []) // Only run once on mount

  // Camera operations
  const startCamera = useCallback(async () => {
    const cameraManager = cameraManagerRef.current
    const scanner = scannerRef.current
    
    if (!cameraManager || !scanner || !videoRef.current) {
      updateState({ error: 'Camera system not ready' })
      return
    }

    try {
      updateState({ isScanning: true, error: '' })
      
      await cameraManager.startCamera(videoRef.current)
      updateState({ permissionState: cameraManager.getPermissionState() })
      
      await scanner.startScanning(videoRef.current, handleScannedCodeRef.current!)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to start camera"
      updateState({ 
        error: errorMessage, 
        isScanning: false,
        permissionState: cameraManager?.getPermissionState() || 'error'
      })
      console.error("Camera error:", err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    try {
      scannerRef.current?.stopScanning()
      cameraManagerRef.current?.stopCamera()
      updateState({ isScanning: false })
    } catch (err) {
      console.error("Stop camera error:", err)
    }
  }, [])

  // Scan handlers
  const handleScannedCode = useCallback(async (code: string) => {
    if (!code?.trim()) return

    try {
      if (multipleMode) {
        // In multiple mode, add to array and keep scanning
        if (state.scannedCodes.includes(code)) {
          updateState({ error: "Código ya escaneado" })
          setTimeout(() => updateState({ error: '' }), 2000)
          return
        }

        const newCodes = [...state.scannedCodes, code]
        updateState({ scannedCodes: newCodes, justScanned: true })

        // Add haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // Reset just scanned state and restart scanner
        setTimeout(() => {
          updateState({ justScanned: false })
          if (state.isScanning && scannerRef.current && videoRef.current) {
            const scanner = scannerRef.current
            // Restart scanning with the same callback
            scanner.startScanning(videoRef.current, handleScannedCodeRef.current!)
          }
        }, 2000)
      } else {
        // In single mode, process immediately and navigate
        await handleSingleScan(code)
      }
    } catch (err) {
      console.error('Scan handling error:', err)
      updateState({ error: 'Error processing scan' })
    }
  }, [multipleMode, state.scannedCodes, state.isScanning, handleSingleScan])

  // Update the ref whenever handleScannedCode changes
  useEffect(() => {
    handleScannedCodeRef.current = handleScannedCode
  }, [handleScannedCode])

  const handleSingleScan = useCallback(async (code: string) => {
    updateState({ isProcessing: true })
    stopCamera()

    try {
      router.push(`/scan2/results?codes=${encodeURIComponent(code)}`)
    } catch (err: any) {
      updateState({ 
        error: err.message || "Error al procesar el envío",
        isProcessing: false 
      })
      
      setTimeout(() => {
        updateState({ error: '' })
        if (state.mode === 'camera') startCamera()
      }, 3000)
    }
  }, [router, state.mode])

  // Manual input handlers
  const handleManualSubmit = useCallback(() => {
    const code = state.manualInput.trim()
    if (!code) return

    handleSingleScan(code)
    updateState({ manualInput: '' })
  }, [state.manualInput, handleSingleScan])

  const handleProcessMultiple = useCallback(async () => {
    if (state.scannedCodes.length === 0) return

    updateState({ isProcessing: true })
    stopCamera()

    try {
      const codesParam = encodeURIComponent(state.scannedCodes.join(','))
      router.push(`/scan2/results?codes=${codesParam}`)
    } catch (err: any) {
      updateState({ 
        error: err.message || "Error al procesar los envíos",
        isProcessing: false 
      })
    }
  }, [state.scannedCodes, router])

  // Mode toggle
  const toggleScanMode = useCallback(() => {
    const newMode: ScanMode = state.mode === 'camera' ? 'manual' : 'camera'
    updateState({ mode: newMode, error: '' })

    if (newMode === 'manual') {
      stopCamera()
    } else {
      startCamera()
    }
  }, [state.mode])

  // Render components
  const renderHeader = () => (
    <div className="px-6 pt-6 pb-2">
      {state.error && (
        <div className="mb-4 text-sm font-medium text-center text-black-600">
          {state.error}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        {!state.isProcessing && (
          <>
            {state.mode === 'camera' && (
              <button
                className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 ${
                  multipleMode ? 'bg-black text-white' : 'bg-white text-black border-gray-300'
                }`}
                onClick={toggleMultipleMode}
              >
                <Package className="h-4 w-4" />
                Múltiple
              </button>
            )}
            
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <input
                type="text"
                value={state.manualInput}
                onChange={(e) => updateState({ manualInput: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Código..."
                className="px-2 py-1.5 text-sm outline-none w-24"
                disabled={state.isProcessing}
              />
              <button
                onClick={handleManualSubmit}
                disabled={state.isProcessing || !state.manualInput.trim()}
                className="px-3 py-1.5 bg-black text-white text-sm disabled:opacity-50"
              >
                {state.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderCamera = () => {
    if (state.mode !== 'camera') return null

    return (
      <div className="relative w-full h-[60vh] min-h-[320px] max-h-[400px] bg-black rounded-3xl overflow-hidden shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover" 
        />

        {/* Scanning Frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-48">
            {/* Corner indicators */}
            {[
              { pos: 'top-0 left-0', border: 'border-t-4 border-l-4', round: 'rounded-tl-2xl' },
              { pos: 'top-0 right-0', border: 'border-t-4 border-r-4', round: 'rounded-tr-2xl' },
              { pos: 'bottom-0 left-0', border: 'border-b-4 border-l-4', round: 'rounded-bl-2xl' },
              { pos: 'bottom-0 right-0', border: 'border-b-4 border-r-4', round: 'rounded-br-2xl' }
            ].map((corner, i) => (
              <div
                key={i}
                className={`absolute ${corner.pos} w-10 h-10 ${corner.border} border-blue-400 ${corner.round} opacity-75`}
              />
            ))}

            {/* Scanning line */}
            {state.isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full shadow-lg animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-6 left-6 right-6 flex justify-center">
          <p className="text-white text-sm font-medium flex items-center gap-2">
            {state.permissionState === 'denied' && state.error ? (
              <>
                <Camera className="w-4 h-4 text-amber-400" />
                Permiso necesario
              </>
            ) : multipleMode && state.justScanned ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Escaneado! Siguiente...
              </>
            ) : state.isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : state.isScanning ? (
              <>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Escaneando...
              </>
            ) : null}
          </p>
        </div>

        {/* Camera Controls */}
        <div className="absolute top-6 right-6">
          <Button
            variant="secondary"
            size="sm"
            className="bg-black hover:bg-gray-800 text-white border-0 rounded-2xl w-12 h-12 p-0"
            onClick={stopCamera}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom Action */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-center">
          {multipleMode && state.scannedCodes.length > 0 ? (
            <Button
              onClick={handleProcessMultiple}
              disabled={state.isProcessing}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-2xl px-6 py-3 transition-all flex items-center gap-3"
            >
              {state.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Continuar ({state.scannedCodes.length} Etiquetas)
            </Button>
          ) : (
            <div className="bg-black rounded-2xl px-6 py-3 border border-gray-600">
              <p className="text-white text-xs text-center">
                {multipleMode 
                  ? "Escanear múltiple etiquetas"
                  : "Enfoca para auto-detección"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderErrorActions = () => {
    if (!state.error || state.isScanning || state.mode !== 'camera') return null

    return (
      <div className="text-center py-6">
        {state.permissionState === 'denied' ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <Camera className="w-5 h-5" />
                <span className="font-medium text-sm">Permiso de Cámara Requerido</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Por favor permite el acceso a la cámara en la configuración de tu navegador para escanear códigos de barras.
              </p>
            </div>
            <Button
              onClick={startCamera}
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm"
            >
              <Camera className="w-4 h-4 mr-2" />
              Solicitar Acceso a Cámara
            </Button>
          </div>
        ) : (
          <Button
            onClick={startCamera}
            className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-all text-sm"
          >
            Vuelve a Intentar
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full blur-2xl animate-pulse delay-500" />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-start pt-safe px-4 pb-safe overflow-x-hidden">
        <div className="w-full max-w-md mx-auto mt-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            {renderHeader()}
            
            <div className="px-6 pb-6 flex flex-col gap-6">
              {renderCamera()}
              {renderErrorActions()}
            </div>

            <div className="px-6 pb-6 pt-2">
              <p className="text-xs text-gray-500 text-center">
                {state.isScanning ? "Mantén estable para auto-detección" : ""}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default function ScanMainPage() {
  return (
    <LayoutWrapper>
      <ScanPage />
    </LayoutWrapper>
  )
}