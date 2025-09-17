"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Loader2,
  X,
  Package,
  Camera,
  Search
} from "lucide-react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { CameraManager } from "@/lib/scan2/camera"
import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
import { useMultipleMode } from "@/hooks/use-multiple-mode"
import { useRouter } from "next/navigation"

type ScanMode = 'camera' | 'manual'

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

  // Core state
  const [scanMode, setScanMode] = useState<ScanMode>('camera')
  const [error, setError] = useState("")
  const [permissionState, setPermissionState] = useState('unknown')

  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCodes, setScannedCodes] = useState<string[]>([])
  const [justScanned, setJustScanned] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Multiple mode state with custom hook
  const { multipleMode, toggleMultipleMode } = useMultipleMode({
    clearScannedCodes: () => setScannedCodes([]),
    enableVibration: true,
    enableLogging: true
  })

  // Ref to always have latest multipleMode value (avoid stale closure)
  const multipleModeRef = useRef(multipleMode)
  useEffect(() => {
    multipleModeRef.current = multipleMode
  }, [multipleMode])

  // Manual input state
  const [manualInput, setManualInput] = useState("")

  // Custom hooks
  const { videoRef, cameraManager, scanner } = useCameraManager()

  // Set up permission change callback when cameraManager is ready
  useEffect(() => {
    if (cameraManager) {
      cameraManager.setPermissionChangeCallback((newState) => {
        setPermissionState(newState)
        if (newState === 'granted' && scanMode === 'camera') {
          setTimeout(() => {
            setError("")
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
      setError("")
      setIsScanning(true)
      await cameraManager.startCamera(videoRef.current)
      setPermissionState(cameraManager.getPermissionState())
      await startBarcodeDetection()
    } catch (err: any) {
      setError(err.message || "Failed to start camera")
      console.error("Camera access error:", err)
      setIsScanning(false)
      setPermissionState(cameraManager.getPermissionState())
    }
  }, [cameraManager, scanner])

  const stopCamera = useCallback(() => {
    scanner?.stopScanning()
    cameraManager?.stopCamera()
    setIsScanning(false)
  }, [cameraManager, scanner])

  const startBarcodeDetection = useCallback(async () => {
    if (!scanner || !videoRef.current) return

    try {
      await scanner.startScanning(videoRef.current, handleScannedCode)
    } catch (err) {
      console.error("Barcode detection error:", err)
      setError("Scanner initialization failed")
    }
  }, [scanner])

  const handleMultipleScan = useCallback((code: string) => {
    console.log('handleMultipleScan called:', code, '| current codes:', scannedCodes)

    if (scannedCodes.includes(code)) {
      console.log('Duplicate code detected')
      setError("Código ya escaneado")
      setTimeout(() => setError(""), 2000)
      return
    }

    console.log('Adding code to array')
    setScannedCodes(prev => {
      const newCodes = [...new Set([...prev, code])]
      console.log('Updated scannedCodes:', newCodes)
      return newCodes
    })
    setJustScanned(true)

    setTimeout(() => {
      console.log('Attempting to restart scanner...', { isScanning, multipleMode })
      setJustScanned(false)
      if (isScanning) {
        startBarcodeDetection()
      }
    }, 2000)
  }, [scannedCodes, isScanning, startBarcodeDetection, multipleMode])

  const handleSingleScan = useCallback(async (code: string) => {
    setIsProcessing(true)
    setIsScanning(false)
    scanner?.stopScanning()

    try {
      // Navigate to results page with the scanned code
      router.push(`/scan2/results?codes=${encodeURIComponent(code)}`)
    } catch (err: any) {
      setError(err.message || "Error al procesar el envío")
      setIsProcessing(false)

      setTimeout(() => {
        setError("")
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
    setManualInput("")
  }, [manualInput, handleSingleScan])

  const handleProcessMultiple = useCallback(async () => {
    if (scannedCodes.length === 0) return

    setIsProcessing(true)
    stopCamera()

    try {
      // Navigate to results page with multiple codes
      const codesParam = encodeURIComponent(scannedCodes.join(','))
      router.push(`/scan2/results?codes=${codesParam}`)
    } catch (err: any) {
      setError(err.message || "Error al procesar los envíos")
      setIsProcessing(false)
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
    setScanMode(newMode)

    if (newMode === 'manual') {
      stopCamera()
    } else {
      startCamera()
    }
  }, [scanMode, startCamera, stopCamera])

  return (
    <>
      {/* Clean minimal background */}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-50 to-white" />

      {/* Main Content - Mobile First */}
      <main className="relative z-10 min-h-screen flex flex-col">
        {/* Top Section - Controls */}
        <div className="w-full px-4 pt-safe pb-4">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Manual Input Bar */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="Ingresar código..."
                  className="w-full h-12 px-4 pr-10 text-base bg-gray-50 rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={isProcessing || !manualInput.trim()}
                  className="absolute right-1 top-1 w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-full disabled:opacity-50 transition-opacity"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Multiple Mode Toggle */}
              {scanMode === 'camera' && !isProcessing && (
                <button
                  onClick={toggleMultipleMode}
                  className={`h-12 px-6 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                    multipleMode
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Múltiple</span>
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-center text-sm text-red-600 py-2 px-4 bg-red-50 rounded-full">
                {error}
              </div>
            )}

            {/* Status Indicators */}
            {(isScanning || isProcessing || justScanned) && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 py-2">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : multipleMode && justScanned ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Escaneado! Siguiente...</span>
                  </>
                ) : isScanning ? (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>Escaneando...</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Camera Section - Flexible Height */}
        <div className="flex-1 px-4 pb-4 flex flex-col">
          <div className="flex-1 max-w-lg w-full mx-auto">
            {scanMode === 'camera' && (
              <div className="relative w-full h-full min-h-[400px] max-h-[600px] bg-gray-900 rounded-3xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Scanning Frame Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-72 h-40">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white/60 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white/60 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white/60 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white/60 rounded-br-xl" />

                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/40 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Permission Denied State */}
                {permissionState === 'denied' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
                    <div className="text-center px-6 space-y-4">
                      <Camera className="h-12 w-12 text-white/70 mx-auto" />
                      <div className="space-y-2">
                        <p className="text-white font-medium">Permiso de Cámara Requerido</p>
                        <p className="text-white/70 text-sm">
                          Permite el acceso a la cámara para escanear códigos
                        </p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="px-6 py-3 bg-white text-gray-900 rounded-full font-medium text-sm hover:bg-gray-100 transition-colors"
                      >
                        Solicitar Acceso
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Camera Error State */}
            {error && !isScanning && scanMode === 'camera' && permissionState !== 'denied' && (
              <div className="h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-900 font-medium">Error al acceder a la cámara</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-gray-900 text-white rounded-full font-medium text-sm hover:bg-gray-800 transition-colors"
                  >
                    Vuelve a Intentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Section */}
        {multipleMode && scannedCodes.length > 0 && (
          <div className="px-4 pb-safe">
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleProcessMultiple}
                disabled={isProcessing}
                className="w-full h-14 bg-gray-900 text-white rounded-full font-medium flex items-center justify-center gap-3 hover:bg-gray-800 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Package className="h-5 w-5" />
                    <span>Continuar con {scannedCodes.length} etiqueta{scannedCodes.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Helper Text */}
        {scanMode === 'camera' && isScanning && !multipleMode && !error && (
          <div className="px-4 pb-safe">
            <p className="text-center text-xs text-gray-500">
              Enfoca el código para escanear automáticamente
            </p>
          </div>
        )}
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