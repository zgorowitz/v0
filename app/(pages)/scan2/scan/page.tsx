"use client"

import React, { useState, useEffect, useRef, useCallback, useReducer } from "react"
import {
  Loader2,
  X,
  Package,
  Sparkles,
  Camera,
  Edit3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { CameraManager } from "@/lib/scan2/camera"
import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
import { useMultipleMode } from "@/hooks/use-multiple-mode"
import { useRouter } from "next/navigation"

type ScanMode = 'camera' | 'manual'

type ScanState = {
  scanMode: ScanMode
  error: string
  permissionState: string
  isScanning: boolean
  isProcessing: boolean
  scannedCodes: string[]
  justScanned: boolean
  manualInput: string
}

type ScanAction =
  | { type: 'SET_MODE'; payload: ScanMode }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_PERMISSION'; payload: string }
  | { type: 'START_SCANNING' }
  | { type: 'STOP_SCANNING' }
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'ADD_CODE'; payload: string }
  | { type: 'CLEAR_CODES' }
  | { type: 'SET_JUST_SCANNED'; payload: boolean }
  | { type: 'SET_MANUAL_INPUT'; payload: string }
  | { type: 'SCAN_ERROR'; payload: string }
  | { type: 'RESET_ERROR' }

const initialScanState: ScanState = {
  scanMode: 'camera',
  error: '',
  permissionState: 'unknown',
  isScanning: false,
  isProcessing: false,
  scannedCodes: [],
  justScanned: false,
  manualInput: ''
}

const scanReducer = (state: ScanState, action: ScanAction): ScanState => {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, scanMode: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_PERMISSION':
      return { ...state, permissionState: action.payload }
    case 'START_SCANNING':
      return { ...state, isScanning: true, error: '' }
    case 'STOP_SCANNING':
      return { ...state, isScanning: false }
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, isScanning: false }
    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false }
    case 'ADD_CODE':
      const newCodes = [...new Set([...state.scannedCodes, action.payload])]
      return { ...state, scannedCodes: newCodes, justScanned: true }
    case 'CLEAR_CODES':
      return { ...state, scannedCodes: [] }
    case 'SET_JUST_SCANNED':
      return { ...state, justScanned: action.payload }
    case 'SET_MANUAL_INPUT':
      return { ...state, manualInput: action.payload }
    case 'SCAN_ERROR':
      return { ...state, error: action.payload, isScanning: false }
    case 'RESET_ERROR':
      return { ...state, error: '' }
    default:
      return state
  }
}

const useCameraManager = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraManager, setCameraManager] = useState<CameraManager | null>(null)
  const [scanner, setScanner] = useState<EnhancedBarcodeScanner | null>(null)

  useEffect(() => {
    const cameraManagerInstance = new CameraManager()
    const scannerInstance = new EnhancedBarcodeScanner()
    
    setCameraManager(cameraManagerInstance)
    setScanner(scannerInstance)

    return () => {
      cameraManagerInstance?.stopCamera()
      scannerInstance?.stopScanning()
    }
  }, [])

  return {
    videoRef,
    cameraManager,
    scanner
  }
}

function ScanPage() {
  const router = useRouter()

  // Consolidated state management
  const [state, dispatch] = useReducer(scanReducer, initialScanState)
  const {
    scanMode,
    error,
    permissionState,
    isScanning,
    isProcessing,
    scannedCodes,
    justScanned,
    manualInput
  } = state

  // Multiple mode state with custom hook
  const { multipleMode, toggleMultipleMode } = useMultipleMode({
    clearScannedCodes: () => dispatch({ type: 'CLEAR_CODES' }),
    enableVibration: true,
    enableLogging: true
  })

  // Ref to always have latest multipleMode value (avoid stale closure)
  const multipleModeRef = useRef(multipleMode)
  useEffect(() => {
    multipleModeRef.current = multipleMode
  }, [multipleMode])
  
  // Custom hooks
  const { videoRef, cameraManager, scanner } = useCameraManager()

  // Set up permission change callback when cameraManager is ready
  useEffect(() => {
    if (cameraManager) {
      cameraManager.setPermissionChangeCallback((newState: string) => {
        dispatch({ type: 'SET_PERMISSION', payload: newState })
        if (newState === 'granted' && scanMode === 'camera') {
          setTimeout(() => {
            dispatch({ type: 'RESET_ERROR' })
            startCamera()
          }, 100)
        }
      })
    }
  }, [cameraManager])

  // Handle camera start/stop based on mode
  useEffect(() => {
    if (scanMode === 'camera' && cameraManager && scanner) {
      startCamera()
    }
    
    return () => {
      stopCamera()
    }
  }, [scanMode, cameraManager, scanner])

  const startCamera = useCallback(async () => {
    if (!cameraManager || !scanner || !videoRef.current) {
      return
    }

    try {
      dispatch({ type: 'START_SCANNING' })
      await cameraManager.startCamera(videoRef.current)
      dispatch({ type: 'SET_PERMISSION', payload: cameraManager.getPermissionState() })
      await startBarcodeDetection()
    } catch (err: any) {
      dispatch({ type: 'SCAN_ERROR', payload: err.message || "Failed to start camera" })
      console.error("Camera access error:", err)
      dispatch({ type: 'SET_PERMISSION', payload: cameraManager.getPermissionState() })
    }
  }, [cameraManager, scanner])

  const stopCamera = useCallback(() => {
    scanner?.stopScanning()
    cameraManager?.stopCamera()
    dispatch({ type: 'STOP_SCANNING' })
  }, [cameraManager, scanner])

  const startBarcodeDetection = useCallback(async () => {
    if (!scanner || !videoRef.current) return

    try {
      await scanner.startScanning(videoRef.current, handleScannedCode)
    } catch (err) {
      console.error("Barcode detection error:", err)
      dispatch({ type: 'SET_ERROR', payload: "Scanner initialization failed" })
    }
  }, [scanner])

  const handleMultipleScan = useCallback((code: string) => {
    console.log('handleMultipleScan called:', code, '| current codes:', scannedCodes)

    if (scannedCodes.includes(code)) {
      console.log('Duplicate code detected')
      dispatch({ type: 'SET_ERROR', payload: "Código ya escaneado" })
      setTimeout(() => dispatch({ type: 'RESET_ERROR' }), 2000)
      return
    }

    console.log('Adding code to array')
    dispatch({ type: 'ADD_CODE', payload: code })

    setTimeout(() => {
      console.log('Attempting to restart scanner...', { isScanning, multipleMode })
      dispatch({ type: 'SET_JUST_SCANNED', payload: false })
      if (isScanning) {
        startBarcodeDetection()
      }
    }, 2000)
  }, [scannedCodes, isScanning, startBarcodeDetection, multipleMode])

  const handleSingleScan = useCallback(async (code: string) => {
    dispatch({ type: 'START_PROCESSING' })
    scanner?.stopScanning()

    try {
      // Navigate to results page with the scanned code
      router.push(`/scan2/results?codes=${encodeURIComponent(code)}`)
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || "Error al procesar el envío" })
      dispatch({ type: 'STOP_PROCESSING' })

      setTimeout(() => {
        dispatch({ type: 'RESET_ERROR' })
        if (scanMode === 'camera') {
          startBarcodeDetection()
        }
      }, 3000)
    }
  }, [router, scanner, scanMode])

  const handleManualSubmit = useCallback(() => {
    const trimmedInput = manualInput.trim()
    if (!trimmedInput) return

    handleSingleScan(trimmedInput)
    dispatch({ type: 'SET_MANUAL_INPUT', payload: "" })
  }, [manualInput, handleSingleScan])

  const handleProcessMultiple = useCallback(async () => {
    if (scannedCodes.length === 0) return

    dispatch({ type: 'START_PROCESSING' })
    stopCamera()

    try {
      // Navigate to results page with multiple codes
      const codesParam = encodeURIComponent(scannedCodes.join(','))
      router.push(`/scan2/results?codes=${codesParam}`)
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || "Error al procesar los envíos" })
      dispatch({ type: 'STOP_PROCESSING' })
    }
  }, [scannedCodes, router])

  const handleScannedCode = useCallback(async (code: string) => {
    const currentMultipleMode = multipleModeRef.current
    console.log('Code scanned:', code, '| multipleMode:', currentMultipleMode, '| scannedCodes:', scannedCodes.length)
    
    if (currentMultipleMode) {
      console.log('Routing to handleMultipleScan')
      handleMultipleScan(code)
    } else {
      console.log('Routing to handleSingleScan')
      handleSingleScan(code)
    }
  }, [scannedCodes, handleMultipleScan, handleSingleScan])

  const toggleScanMode = useCallback(() => {
    const newMode: ScanMode = scanMode === 'camera' ? 'manual' : 'camera'
    dispatch({ type: 'SET_MODE', payload: newMode })

    if (newMode === 'manual') {
      stopCamera()
    } else {
      startCamera()
    }
  }, [scanMode, startCamera, stopCamera])

  const renderHeader = () => (
    <div className="px-6 pt-6 pb-2">
      {error && (
        <div className="mb-4 text-sm font-medium text-center">
          {error}
        </div>
      )}
      
<div className="flex items-center justify-between mb-4">
  {!isProcessing && (
    <>
      {scanMode === 'camera' && (
        <button
          className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 ${
            multipleMode ? 'bg-black text-white' : 'bg-white text-black border-black'
          }`}
          onClick={toggleMultipleMode}
        >
          <Package className="h-4 w-4" />
          Múltiple
        </button>
      )}
      
      <div className="flex border border-black rounded-lg overflow-hidden">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => dispatch({ type: 'SET_MANUAL_INPUT', payload: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          placeholder="Código..."
          className="px-2 py-1.5 text-sm outline-none w-24"
          disabled={isProcessing}
        />
        <button
          onClick={handleManualSubmit}
          disabled={isProcessing}
          className="px-3 py-1.5 bg-black text-white text-sm"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </div>
    </>
  )}
</div>
    </div>
  )

  const renderManualInput = () => null

  const renderCamera = () => (
    <>
      {scanMode === 'camera' && (
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
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full shadow-lg animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="absolute top-6 left-6 right-6 flex justify-center">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2">
                {permissionState === 'denied' && error ? (
                  <>
                    <Camera className="w-4 h-4 text-amber-400" />
                    Permiso necesario
                  </>
                ) : multipleMode && justScanned ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Escaneado! Siguiente...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : isScanning ? (
                  <>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Escaneando...
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="absolute top-6 right-6 flex gap-3">
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
            {multipleMode && scannedCodes.length > 0 ? (
              <Button
                onClick={handleProcessMultiple}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-2xl px-6 py-3 transition-all flex items-center gap-3"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                Continuar ({scannedCodes.length} Etiquetas)
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
      )}
    </>
  )

  const renderFooter = () => {
    const footerMessage = isScanning
      ? "Mantén estable para auto-detección"
      : ""

    return (
      <div className="px-6 pb-6 pt-2">
        <p className="text-xs text-gray-500 text-center">
          {footerMessage}
        </p>
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
              {renderManualInput()}
              {renderCamera()}
              
              {/* Error State Action */}
              {error && !isScanning && scanMode === 'camera' && (
                <div className="text-center py-6">
                    {permissionState === 'denied' ? (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-amber-800 mb-2">
                            <Camera className="w-5 h-5" />
                            <span className="font-medium text-sm">Permiso de Cámara Requerido</span>
                          </div>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Por favor permite el acceso a la cámara en la configuración de tu navegador para escanear códigos de barras.
                            Busca el ícono de la cámara en la barra de direcciones o actualiza la página para intentar de nuevo.
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
              )}
            </div>

            {renderFooter()}
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