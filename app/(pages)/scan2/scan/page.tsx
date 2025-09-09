"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { triggerVibration } from "@/lib/scan2/scan-utils"
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
      console.log('❌ Duplicate code detected')
      setError("Code already scanned")
      triggerVibration('error')
      setTimeout(() => setError(""), 2000)
      return
    }

    console.log('Adding code to array')
    setScannedCodes(prev => {
      const newCodes = [...new Set([...prev, code])]
      console.log('📝 Updated scannedCodes:', newCodes)
      return newCodes
    })
    setJustScanned(true)
    triggerVibration('success')
    
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
    triggerVibration('scan')

    try {
      // Navigate to results page with the scanned code
      router.push(`/scan2/results?codes=${encodeURIComponent(code)}`)
    } catch (err: any) {
      setError(err.message || "Failed to process shipment")
      triggerVibration('error')
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
      setError(err.message || "Failed to process shipments")
      triggerVibration('error')
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
      console.log('➡️ Routing to handleSingleScan')
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
    
    triggerVibration('click')
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
          <div className="flex items-center gap-2">
            {scanMode === 'camera' && (
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant={multipleMode ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full transition-all active:scale-95 ${
                    multipleMode 
                      ? " text-white border-black-500 shadow-md" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={toggleMultipleMode}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Multiple
                </Button>
              </motion.div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
              onClick={toggleScanMode}
            >
              {scanMode === 'manual' ? (
                <><Camera className="w-4 h-4 mr-1" /> Camera</>
              ) : (
                <><Edit3 className="w-4 h-4 mr-1" /> Manual</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const renderManualInput = () => (
    <AnimatePresence>
      {scanMode === 'manual' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Shipment Code
            </label>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter code..."
              className="w-full h-12 px-4 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              disabled={isProcessing}
            />
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleManualSubmit} 
              disabled={!manualInput.trim() || isProcessing} 
              className="flex-1 h-12 text-base font-medium rounded-xl active:scale-98 transition-all"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setScanMode('camera')} 
              className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 active:scale-98 transition-all"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const renderCamera = () => (
    <AnimatePresence>
      {scanMode === 'camera' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full h-[60vh] min-h-[320px] max-h-[400px] bg-black rounded-3xl overflow-hidden shadow-2xl"
        >
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
                <motion.div 
                  key={i}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  className={`absolute ${corner.pos} w-10 h-10 ${corner.border} border-blue-400 ${corner.round}`}
                />
              ))}

              {/* Scanning line */}
              {isScanning && (
                <motion.div 
                  animate={{ y: [-20, 20, -20] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full shadow-lg" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="absolute top-6 left-6 right-6 flex justify-center">
            <motion.div>
              <p className="text-white text-sm font-medium flex items-center gap-2">
                {permissionState === 'denied' && error ? (
                  <>
                    <Camera className="w-4 h-4 text-amber-400" />
                    Permission needed
                  </>
                ) : multipleMode && justScanned ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Scanned! Next one...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : isScanning ? (
                  <>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Scanning...
                  </>
                ) : null}
              </p>
            </motion.div>
          </div>

          {/* Camera Controls */}
          <div className="absolute top-6 right-6 flex gap-3">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/80 hover:bg-black/90 text-white border-0 rounded-2xl w-12 h-12 p-0 backdrop-blur-sm"
                onClick={stopCamera}
              >
                <X className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>

          {/* Bottom Action */}
          <div className="absolute bottom-6 left-6 right-6 flex justify-center">
            {multipleMode && scannedCodes.length > 0 ? (
              <motion.div whileTap={{ scale: 0.98 }}>
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
                  Continue ({scannedCodes.length} Etiquetas)
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20"
              >
                <p className="text-white text-xs text-center">
                  {multipleMode 
                    ? "Escanear múltiple etiquetas"
                    : "Enfoca para auto-detección"
                  }
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const renderFooter = () => {
    const footerMessage = scanMode === 'manual' 
      ? "Enter code manually or use camera" 
      : isScanning
        ? "📱 mantén estable auto-detección" 
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto mt-8"
        >
          <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            {renderHeader()}
            
            <div className="px-6 pb-6 flex flex-col gap-6">
              {renderManualInput()}
              {renderCamera()}
              
              {/* Error State Action */}
              <AnimatePresence>
                {error && !isScanning && scanMode === 'camera' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-6"
                  >
                    {permissionState === 'denied' ? (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-amber-800 mb-2">
                            <Camera className="w-5 h-5" />
                            <span className="font-medium text-sm">Camera Permission Required</span>
                          </div>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Please allow camera access in your browser settings to scan barcodes. 
                            Look for the camera icon in your address bar or refresh the page to try again.
                          </p>
                        </div>
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button 
                            onClick={startCamera}
                            className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Request Camera Access
                          </Button>
                        </motion.div>
                      </div>
                    ) : (
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={startCamera}
                          className="w-full h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all text-sm"
                        >
                          Try Again
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {renderFooter()}
          </div>
        </motion.div>
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