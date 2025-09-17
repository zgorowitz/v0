"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, X, Package, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { CameraManager } from "@/lib/scan2/camera"
import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
import { useMultipleMode } from "@/hooks/use-multiple-mode"
import { useRouter } from "next/navigation"

type ScanMode = "camera" | "manual"

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
    scanner,
  }
}

function ScanPage() {
  const router = useRouter()

  // Core state
  const [scanMode, setScanMode] = useState<ScanMode>("camera")
  const [error, setError] = useState("")
  const [permissionState, setPermissionState] = useState("unknown")

  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCodes, setScannedCodes] = useState<string[]>([])
  const [justScanned, setJustScanned] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Multiple mode state with custom hook
  const { multipleMode, toggleMultipleMode } = useMultipleMode({
    clearScannedCodes: () => setScannedCodes([]),
    enableVibration: true,
    enableLogging: true,
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
        if (newState === "granted" && scanMode === "camera") {
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
    if (scanMode === "camera" && cameraManager && scanner) {
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

  const handleMultipleScan = useCallback(
    (code: string) => {
      console.log("handleMultipleScan called:", code, "| current codes:", scannedCodes)

      if (scannedCodes.includes(code)) {
        console.log("Duplicate code detected")
        setError("Código ya escaneado")
        setTimeout(() => setError(""), 2000)
        return
      }

      console.log("Adding code to array")
      setScannedCodes((prev) => {
        const newCodes = [...new Set([...prev, code])]
        console.log("Updated scannedCodes:", newCodes)
        return newCodes
      })
      setJustScanned(true)

      setTimeout(() => {
        console.log("Attempting to restart scanner...", { isScanning, multipleMode })
        setJustScanned(false)
        if (isScanning) {
          startBarcodeDetection()
        }
      }, 2000)
    },
    [scannedCodes, isScanning, startBarcodeDetection, multipleMode],
  )

  const handleSingleScan = useCallback(
    async (code: string) => {
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
          if (scanMode === "camera") {
            startBarcodeDetection()
          }
        }, 3000)
      }
    },
    [router, scanner, scanMode],
  )

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
      const codesParam = encodeURIComponent(scannedCodes.join(","))
      router.push(`/scan2/results?codes=${codesParam}`)
    } catch (err: any) {
      setError(err.message || "Error al procesar los envíos")
      setIsProcessing(false)
    }
  }, [scannedCodes, router])

  const handleScannedCode = useCallback(
    async (code: string) => {
      const currentMultipleMode = multipleModeRef.current
      console.log("Code scanned:", code, "| multipleMode:", currentMultipleMode, "| scannedCodes:", scannedCodes.length)

      if (currentMultipleMode) {
        console.log("Routing to handleMultipleScan")
        handleMultipleScan(code)
      } else {
        console.log("Routing to handleSingleScan")
        handleSingleScan(code)
      }
    },
    [scannedCodes, handleMultipleScan, handleSingleScan],
  )

  const toggleScanMode = useCallback(() => {
    const newMode: ScanMode = scanMode === "camera" ? "manual" : "camera"
    setScanMode(newMode)

    if (newMode === "manual") {
      stopCamera()
    } else {
      startCamera()
    }
  }, [scanMode, startCamera, stopCamera])

  const renderHeader = () => (
    <div className="px-4 pt-6 pb-4">
      {error && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 text-gray-800 text-sm text-center">{error}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        {!isProcessing && (
          <>
            {scanMode === "camera" && (
              <button
                className={`px-3 py-2 text-sm flex items-center gap-2 border transition-colors ${
                  multipleMode
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-400 hover:border-black"
                }`}
                onClick={toggleMultipleMode}
              >
                <Package className="h-4 w-4" />
                Múltiple
              </button>
            )}

            <div className="flex border border-gray-400 overflow-hidden flex-1 max-w-xs">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="Código..."
                className="px-3 py-2 text-sm outline-none flex-1 bg-white"
                disabled={isProcessing}
              />
              <button
                onClick={handleManualSubmit}
                disabled={isProcessing}
                className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors"
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
      {scanMode === "camera" && (
        <div className="relative w-full h-[65vh] min-h-[350px] max-h-[500px] bg-black overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-80 h-48">
              {/* Corner indicators */}
              {[
                { pos: "top-0 left-0", border: "border-t-2 border-l-2" },
                { pos: "top-0 right-0", border: "border-t-2 border-r-2" },
                { pos: "bottom-0 left-0", border: "border-b-2 border-l-2" },
                { pos: "bottom-0 right-0", border: "border-b-2 border-r-2" },
              ].map((corner, i) => (
                <div key={i} className={`absolute ${corner.pos} w-8 h-8 ${corner.border} border-gray-300`} />
              ))}

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-gray-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 left-4 right-4 flex justify-center">
            <div className="bg-black bg-opacity-60 px-3 py-1">
              <p className="text-white text-sm flex items-center gap-2">
                {permissionState === "denied" && error ? (
                  <>
                    <Camera className="w-4 h-4" />
                    Permiso necesario
                  </>
                ) : multipleMode && justScanned ? (
                  <>
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                    Escaneado! Siguiente...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : isScanning ? (
                  <>
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                    Escaneando...
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="absolute top-4 right-4">
            <Button
              variant="secondary"
              size="sm"
              className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white border-0 w-10 h-10 p-0"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-center">
            {multipleMode && scannedCodes.length > 0 ? (
              <Button
                onClick={handleProcessMultiple}
                disabled={isProcessing}
                className="bg-black hover:bg-gray-800 text-white px-6 py-3 flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                Continuar ({scannedCodes.length} Etiquetas)
              </Button>
            ) : (
              <div className="bg-black bg-opacity-60 px-4 py-2">
                <p className="text-white text-xs text-center">
                  {multipleMode ? "Escanear múltiple etiquetas" : "Enfoca para auto-detección"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  const renderFooter = () => {
    const footerMessage = isScanning ? "Mantén estable para auto-detección" : ""

    return (
      <div className="px-4 pb-4 pt-2">
        <p className="text-xs text-gray-500 text-center">{footerMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-50" />

      <main className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 w-full max-w-md mx-auto">
          <div className="bg-white min-h-screen">
            {renderHeader()}

            <div className="flex flex-col">
              {renderManualInput()}
              {renderCamera()}

              {error && !isScanning && scanMode === "camera" && (
                <div className="px-4 py-6">
                  {permissionState === "denied" ? (
                    <div className="space-y-4">
                      <div className="bg-gray-100 border border-gray-300 p-4">
                        <div className="flex items-center gap-2 text-gray-800 mb-2">
                          <Camera className="w-5 h-5" />
                          <span className="font-medium text-sm">Permiso de Cámara Requerido</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Por favor permite el acceso a la cámara en la configuración de tu navegador para escanear
                          códigos de barras. Busca el ícono de la cámara en la barra de direcciones o actualiza la
                          página para intentar de nuevo.
                        </p>
                      </div>
                      <Button
                        onClick={startCamera}
                        className="w-full h-10 bg-gray-800 hover:bg-black text-white font-medium transition-colors text-sm"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Solicitar Acceso a Cámara
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={startCamera}
                      className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium transition-colors text-sm"
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



// "use client"

// import React, { useState, useEffect, useRef, useCallback } from "react"
// import { 
//   Loader2, 
//   X, 
//   Package, 
//   Sparkles, 
//   Camera, 
//   Edit3 
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { LayoutWrapper } from "@/components/layout-wrapper"
// import { CameraManager } from "@/lib/scan2/camera"
// import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
// import { useMultipleMode } from "@/hooks/use-multiple-mode"
// import { useRouter } from "next/navigation"

// type ScanMode = 'camera' | 'manual'

// const useCameraManager = () => {
//   const videoRef = useRef<HTMLVideoElement>(null)
//   const [cameraManager, setCameraManager] = useState<CameraManager | null>(null)
//   const [scanner, setScanner] = useState<EnhancedBarcodeScanner | null>(null)

//   useEffect(() => {
//     const cameraManagerInstance = new CameraManager()
//     const scannerInstance = new EnhancedBarcodeScanner()
    
//     setCameraManager(cameraManagerInstance)
//     setScanner(scannerInstance)

//     return () => {
//       cameraManagerInstance?.stopCamera()
//       scannerInstance?.stopScanning()
//     }
//   }, [])

//   return {
//     videoRef,
//     cameraManager,
//     scanner
//   }
// }

// function ScanPage() {
//   const router = useRouter()
  
//   // Core state
//   const [scanMode, setScanMode] = useState<ScanMode>('camera')
//   const [error, setError] = useState("")
//   const [permissionState, setPermissionState] = useState('unknown')
  
//   // Scanning state
//   const [isScanning, setIsScanning] = useState(false)
//   const [scannedCodes, setScannedCodes] = useState<string[]>([])
//   const [justScanned, setJustScanned] = useState(false)
//   const [isProcessing, setIsProcessing] = useState(false)
  
//   // Multiple mode state with custom hook
//   const { multipleMode, toggleMultipleMode } = useMultipleMode({
//     clearScannedCodes: () => setScannedCodes([]),
//     enableVibration: true,
//     enableLogging: true
//   })
  
//   // Ref to always have latest multipleMode value (avoid stale closure)
//   const multipleModeRef = useRef(multipleMode)
//   useEffect(() => {
//     multipleModeRef.current = multipleMode
//   }, [multipleMode])
  
//   // Manual input state
//   const [manualInput, setManualInput] = useState("")
  
//   // Custom hooks
//   const { videoRef, cameraManager, scanner } = useCameraManager()

//   // Set up permission change callback when cameraManager is ready
//   useEffect(() => {
//     if (cameraManager) {
//       cameraManager.setPermissionChangeCallback((newState) => {
//         setPermissionState(newState)
//         if (newState === 'granted' && scanMode === 'camera') {
//           setTimeout(() => {
//             setError("")
//             startCamera()
//           }, 100)
//         }
//       })
//     }
//   }, [cameraManager])

//   // Handle camera start/stop based on mode
//   useEffect(() => {
//     if (scanMode === 'camera' && cameraManager && scanner) {
//       startCamera()
//     }
    
//     return () => {
//       stopCamera()
//     }
//   }, [scanMode, cameraManager, scanner])

//   const startCamera = useCallback(async () => {
//     if (!cameraManager || !scanner || !videoRef.current) {
//       return
//     }

//     try {
//       setError("")
//       setIsScanning(true)
//       await cameraManager.startCamera(videoRef.current)
//       setPermissionState(cameraManager.getPermissionState())
//       await startBarcodeDetection()
//     } catch (err: any) {
//       setError(err.message || "Failed to start camera")
//       console.error("Camera access error:", err)
//       setIsScanning(false)
//       setPermissionState(cameraManager.getPermissionState())
//     }
//   }, [cameraManager, scanner])

//   const stopCamera = useCallback(() => {
//     scanner?.stopScanning()
//     cameraManager?.stopCamera()
//     setIsScanning(false)
//   }, [cameraManager, scanner])

//   const startBarcodeDetection = useCallback(async () => {
//     if (!scanner || !videoRef.current) return

//     try {
//       await scanner.startScanning(videoRef.current, handleScannedCode)
//     } catch (err) {
//       console.error("Barcode detection error:", err)
//       setError("Scanner initialization failed")
//     }
//   }, [scanner])

//   const handleMultipleScan = useCallback((code: string) => {
//     console.log('handleMultipleScan called:', code, '| current codes:', scannedCodes)
    
//     if (scannedCodes.includes(code)) {
//       console.log('Duplicate code detected')
//       setError("Código ya escaneado")
//       setTimeout(() => setError(""), 2000)
//       return
//     }

//     console.log('Adding code to array')
//     setScannedCodes(prev => {
//       const newCodes = [...new Set([...prev, code])]
//       console.log('Updated scannedCodes:', newCodes)
//       return newCodes
//     })
//     setJustScanned(true)
    
//     setTimeout(() => {
//       console.log('Attempting to restart scanner...', { isScanning, multipleMode })
//       setJustScanned(false)
//       if (isScanning) {
//         startBarcodeDetection()
//       }
//     }, 2000)
//   }, [scannedCodes, isScanning, startBarcodeDetection, multipleMode])

//   const handleSingleScan = useCallback(async (code: string) => {
//     setIsProcessing(true)
//     setIsScanning(false)
//     scanner?.stopScanning()

//     try {
//       // Navigate to results page with the scanned code
//       router.push(`/scan2/results?codes=${encodeURIComponent(code)}`)
//     } catch (err: any) {
//       setError(err.message || "Error al procesar el envío")
//       setIsProcessing(false)
      
//       setTimeout(() => {
//         setError("")
//         if (scanMode === 'camera') {
//           startBarcodeDetection()
//         }
//       }, 3000)
//     }
//   }, [router, scanner, scanMode])

//   const handleManualSubmit = useCallback(() => {
//     const trimmedInput = manualInput.trim()
//     if (!trimmedInput) return

//     handleSingleScan(trimmedInput)
//     setManualInput("")
//   }, [manualInput, handleSingleScan])

//   const handleProcessMultiple = useCallback(async () => {
//     if (scannedCodes.length === 0) return

//     setIsProcessing(true)
//     stopCamera()

//     try {
//       // Navigate to results page with multiple codes
//       const codesParam = encodeURIComponent(scannedCodes.join(','))
//       router.push(`/scan2/results?codes=${codesParam}`)
//     } catch (err: any) {
//       setError(err.message || "Error al procesar los envíos")
//       setIsProcessing(false)
//     }
//   }, [scannedCodes, router])

//   const handleScannedCode = useCallback(async (code: string) => {
//     const currentMultipleMode = multipleModeRef.current
//     console.log('Code scanned:', code, '| multipleMode:', currentMultipleMode, '| scannedCodes:', scannedCodes.length)
    
//     if (currentMultipleMode) {
//       console.log('Routing to handleMultipleScan')
//       handleMultipleScan(code)
//     } else {
//       console.log('Routing to handleSingleScan')
//       handleSingleScan(code)
//     }
//   }, [scannedCodes, handleMultipleScan, handleSingleScan])

//   const toggleScanMode = useCallback(() => {
//     const newMode: ScanMode = scanMode === 'camera' ? 'manual' : 'camera'
//     setScanMode(newMode)
    
//     if (newMode === 'manual') {
//       stopCamera()
//     } else {
//       startCamera()
//     }
//   }, [scanMode, startCamera, stopCamera])

//   const renderHeader = () => (
//     <div className="px-6 pt-6 pb-2">
//       {error && (
//         <div className="mb-4 text-sm font-medium text-center">
//           {error}
//         </div>
//       )}
      
// <div className="flex items-center justify-between mb-4">
//   {!isProcessing && (
//     <>
//       {scanMode === 'camera' && (
//         <button
//           className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 ${
//             multipleMode ? 'bg-black text-white' : 'bg-white text-black border-black'
//           }`}
//           onClick={toggleMultipleMode}
//         >
//           <Package className="h-4 w-4" />
//           Múltiple
//         </button>
//       )}
      
//       <div className="flex border border-black rounded-lg overflow-hidden">
//         <input
//           type="text"
//           value={manualInput}
//           onChange={(e) => setManualInput(e.target.value)}
//           onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
//           placeholder="Código..."
//           className="px-2 py-1.5 text-sm outline-none w-24"
//           disabled={isProcessing}
//         />
//         <button
//           onClick={handleManualSubmit}
//           disabled={isProcessing}
//           className="px-3 py-1.5 bg-black text-white text-sm"
//         >
//           {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
//         </button>
//       </div>
//     </>
//   )}
// </div>
//     </div>
//   )

//   const renderManualInput = () => null

//   const renderCamera = () => (
//     <>
//       {scanMode === 'camera' && (
//         <div className="relative w-full h-[60vh] min-h-[320px] max-h-[400px] bg-black rounded-3xl overflow-hidden shadow-2xl">
//           <video 
//             ref={videoRef} 
//             autoPlay 
//             playsInline 
//             muted 
//             className="w-full h-full object-cover" 
//           />

//           {/* Scanning Frame */}
//           <div className="absolute inset-0 flex items-center justify-center">
//             <div className="relative w-80 h-48">
//               {/* Corner indicators */}
//               {[
//                 { pos: 'top-0 left-0', border: 'border-t-4 border-l-4', round: 'rounded-tl-2xl' },
//                 { pos: 'top-0 right-0', border: 'border-t-4 border-r-4', round: 'rounded-tr-2xl' },
//                 { pos: 'bottom-0 left-0', border: 'border-b-4 border-l-4', round: 'rounded-bl-2xl' },
//                 { pos: 'bottom-0 right-0', border: 'border-b-4 border-r-4', round: 'rounded-br-2xl' }
//               ].map((corner, i) => (
//                 <div
//                   key={i}
//                   className={`absolute ${corner.pos} w-10 h-10 ${corner.border} border-blue-400 ${corner.round} opacity-75`}
//                 />
//               ))}

//               {/* Scanning line */}
//               {isScanning && (
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full shadow-lg animate-pulse" />
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Status Indicator */}
//           <div className="absolute top-6 left-6 right-6 flex justify-center">
//             <div>
//               <p className="text-white text-sm font-medium flex items-center gap-2">
//                 {permissionState === 'denied' && error ? (
//                   <>
//                     <Camera className="w-4 h-4 text-amber-400" />
//                     Permiso necesario
//                   </>
//                 ) : multipleMode && justScanned ? (
//                   <>
//                     <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
//                     Escaneado! Siguiente...
//                   </>
//                 ) : isProcessing ? (
//                   <>
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     Procesando...
//                   </>
//                 ) : isScanning ? (
//                   <>
//                     <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
//                     Escaneando...
//                   </>
//                 ) : null}
//               </p>
//             </div>
//           </div>

//           {/* Camera Controls */}
//           <div className="absolute top-6 right-6 flex gap-3">
//             <Button
//               variant="secondary"
//               size="sm"
//               className="bg-black hover:bg-gray-800 text-white border-0 rounded-2xl w-12 h-12 p-0"
//               onClick={stopCamera}
//             >
//               <X className="h-5 w-5" />
//             </Button>
//           </div>

//           {/* Bottom Action */}
//           <div className="absolute bottom-6 left-6 right-6 flex justify-center">
//             {multipleMode && scannedCodes.length > 0 ? (
//               <Button
//                 onClick={handleProcessMultiple}
//                 disabled={isProcessing}
//                 className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-2xl px-6 py-3 transition-all flex items-center gap-3"
//               >
//                 {isProcessing ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <Package className="h-4 w-4" />
//                 )}
//                 Continuar ({scannedCodes.length} Etiquetas)
//               </Button>
//             ) : (
//               <div className="bg-black rounded-2xl px-6 py-3 border border-gray-600">
//                 <p className="text-white text-xs text-center">
//                   {multipleMode 
//                     ? "Escanear múltiple etiquetas"
//                     : "Enfoca para auto-detección"
//                   }
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </>
//   )

//   const renderFooter = () => {
//     const footerMessage = isScanning
//       ? "Mantén estable para auto-detección"
//       : ""

//     return (
//       <div className="px-6 pb-6 pt-2">
//         <p className="text-xs text-gray-500 text-center">
//           {footerMessage}
//         </p>
//       </div>
//     )
//   }

//   return (
//     <>
//       {/* Background */}
//       <div className="fixed inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
//         <div className="absolute top-0 left-0 w-full h-full">
//           <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
//           <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full blur-2xl animate-pulse delay-500" />
//         </div>
//       </div>

//       {/* Main Content */}
//       <main className="relative z-10 flex min-h-screen flex-col items-center justify-start pt-safe px-4 pb-safe overflow-x-hidden">
//         <div className="w-full max-w-md mx-auto mt-8">
//           <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
//             {renderHeader()}
            
//             <div className="px-6 pb-6 flex flex-col gap-6">
//               {renderManualInput()}
//               {renderCamera()}
              
//               {/* Error State Action */}
//               {error && !isScanning && scanMode === 'camera' && (
//                 <div className="text-center py-6">
//                     {permissionState === 'denied' ? (
//                       <div className="space-y-4">
//                         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
//                           <div className="flex items-center gap-2 text-amber-800 mb-2">
//                             <Camera className="w-5 h-5" />
//                             <span className="font-medium text-sm">Permiso de Cámara Requerido</span>
//                           </div>
//                           <p className="text-xs text-amber-700 leading-relaxed">
//                             Por favor permite el acceso a la cámara en la configuración de tu navegador para escanear códigos de barras.
//                             Busca el ícono de la cámara en la barra de direcciones o actualiza la página para intentar de nuevo.
//                           </p>
//                         </div>
//                         <Button
//                           onClick={startCamera}
//                           className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm"
//                         >
//                           <Camera className="w-4 h-4 mr-2" />
//                           Solicitar Acceso a Cámara
//                         </Button>
//                       </div>
//                     ) : (
//                       <Button
//                         onClick={startCamera}
//                         className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-all text-sm"
//                       >
//                         Vuelve a Intentar
//                       </Button>
//                     )}
//                 </div>
//               )}
//             </div>

//             {renderFooter()}
//           </div>
//         </div>
//       </main>
//     </>
//   )
// }

// export default function ScanMainPage() {
//   return (
//     <LayoutWrapper>
//       <ScanPage />
//     </LayoutWrapper>
//   )
// }

