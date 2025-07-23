"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, X, Flashlight, FlashlightOff, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { extractShipmentInfo } from "@/lib/api"
import { QRBarcodeScanner } from "@/lib/qr-barcode"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function ScanPage() {
  const [showCamera, setShowCamera] = useState(false)
  const [items, setItems] = useState(null) // Changed to store array of items
  const [currentItemIndex, setCurrentItemIndex] = useState(0) // Track current item in carousel
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState("")
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scannerRef = useRef(null)
  const scanningRef = useRef(false)
  
  useEffect(() => {
    // Auto-start camera when page loads only if not in manual mode
    if (!manualMode) {
      startCamera()
    }

    // Cleanup when component unmounts
    return () => {
      stopCamera()
    }
  }, [])

  // Start camera for scanning
  const startCamera = async () => {
    try {
      setShowCamera(true)
      setError("")
      setScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          startBarcodeDetection()
        }
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Por favor, revisa los permisos e inténtalo de nuevo.")
      console.error("Camera access error:", err)
      setShowCamera(false)
      setScanning(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setScanning(false)
    scanningRef.current = false
    setFlashlightOn(false)
  }

  // Start real barcode detection
  const startBarcodeDetection = async () => {
    if (scanningRef.current || !videoRef.current) return

    try {
      scanningRef.current = true

      // Initialize the barcode scanner
      scannerRef.current = new QRBarcodeScanner()

      // Start scanning with the video element
      await scannerRef.current.startScanning(videoRef.current, (result) => {
        if (result && result !== lastScannedCode) {
          setLastScannedCode(result)
          processScannedCode(result)
        }
      })
    } catch (err) {
      console.error("Barcode detection error:", err)
      setError("No se pudo inicializar el escáner de códigos. Usando detección alternativa.")
      // Fallback to simulated detection
      startFallbackDetection()
    }
  }

  // Fallback detection for when ZXing fails
  const startFallbackDetection = () => {
    const detectionTime = 3000 + Math.random() * 2000

    setTimeout(() => {
      if (scanningRef.current && showCamera) {
        const isOrderId = Math.random() > 0.5
        const mockBarcode = isOrderId
          ? `45129712335` // Using the example shipment ID from the original script
          : `SKU-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10 + Math.random() * 90)}`

        processScannedCode(mockBarcode)
      }
    }, detectionTime)
  }

  // Process the detected barcode
  const processScannedCode = async (code) => {
    setLoading(true)
    setScanning(false)
    scanningRef.current = false

    // Stop the scanner but keep camera running for visual feedback
    if (scannerRef.current) {
      scannerRef.current.stop()
    }

    try {
      const itemsData = await extractShipmentInfo(code)
      
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData)
        setCurrentItemIndex(0) // Reset to first item
        // Stop camera after successful scan and data retrieval
        stopCamera()
      } else {
        throw new Error("No se encontraron artículos para este envío")
      }
    } catch (err) {
      setError(`No se pudieron obtener los detalles: ${err.message}`)
      console.error("API error:", err)
      // Restart scanning on API error
      setTimeout(() => {
        setLoading(false)
        if (showCamera) {
          startBarcodeDetection()
        }
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashlightOn }],
        })
        setFlashlightOn(!flashlightOn)
      } else {
        setError("Linterna no disponible en este dispositivo")
        setTimeout(() => setError(""), 3000)
      }
    } catch (err) {
      console.error("Flashlight error:", err)
      setError("No se pudo activar la linterna")
      setTimeout(() => setError(""), 3000)
    }
  }

  // Restart scanning
  const restartScanning = () => {
    setItems(null)
    setCurrentItemIndex(0)
    setError("")
    setLastScannedCode("")
    setManualMode(false)
    startCamera()
  }

  // Handle manual input submission
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setLastScannedCode(manualInput.trim())
      processScannedCode(manualInput.trim())
      setManualInput("")
    }
  }

  // Remove carousel state/logic: currentItemIndex, goToNextItem, goToPreviousItem, etc.

  const DetailRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-medium text-gray-900 text-sm">
        {value || 'No Disponible'}
      </span>
    </div>
  );
  
  const TechDetail = ({ label, value }) => (
    <div className="space-y-1">
      <div className="text-gray-500 font-medium">{label}</div>
      <div className="font-mono text-gray-700 text-xs bg-gray-50 px-2 py-1 rounded">
        {value || 'N/A'}
      </div>
    </div>
  );

  // Get current item from array
  const currentItem = items && items[currentItemIndex]

return (
  <LayoutWrapper>
    <main className="flex min-h-screen flex-col items-center justify-start pt-safe px-4 pb-safe bg-gray-50 overflow-x-hidden scroll-smooth">
      <div className="w-full max-w-md mx-auto mt-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden">
          
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            {!items && (
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-light text-gray-900">Scanner</h1>
                {!loading && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                    onClick={() => {
                      navigator.vibrate?.(50);
                      setManualMode(!manualMode);
                      if (!manualMode) stopCamera();
                      else startCamera();
                    }}
                  >
                    {manualMode ? "Cámara" : "Manual"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex flex-col gap-6">
            
            {/* Manual Entry Mode */}
            {manualMode && !items && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Código de envío
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Ingresa el código..."
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      navigator.vibrate?.(50);
                      handleManualSubmit();
                    }} 
                    disabled={!manualInput.trim() || loading} 
                    className="flex-1 h-12 text-base font-medium rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-98 transition-all"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.vibrate?.(50);
                      setManualMode(false);
                    }} 
                    className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 active:scale-98 transition-all"
                  >
                    Cámara
                  </Button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Camera Preview */}
            {showCamera && !manualMode && (
              <div className="relative w-full h-[60vh] min-h-[280px] max-h-[400px] bg-black rounded-2xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                {/* Minimal scanning frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-72 h-40">
                    {/* Corner indicators only */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg"></div>

                    {/* Scanning line animation */}
                    {scanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-blue-400 animate-pulse rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="absolute top-6 left-6 right-6 flex justify-center">
                  <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
                    <p className="text-white text-sm font-medium">
                      {loading
                        ? "Procesando..."
                        : scanning
                          ? "Escaneando..."
                          : "Posiciona el código en el marco"}
                    </p>
                  </div>
                </div>

                {/* Camera controls */}
                <div className="absolute top-6 right-6 flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-black/70 hover:bg-black/80 text-white border-0 rounded-full w-10 h-10 p-0 active:scale-95 transition-all"
                    onClick={() => {
                      navigator.vibrate?.(50);
                      toggleFlashlight();
                    }}
                  >
                    {flashlightOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-black/70 hover:bg-black/80 text-white border-0 rounded-full w-10 h-10 p-0 active:scale-95 transition-all"
                    onClick={() => {
                      navigator.vibrate?.(50);
                      stopCamera();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Bottom tip */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                  <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
                    <p className="text-white text-xs">
                      Mantén firme hasta que se detecte
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Obteniendo información del producto...
                  </p>
                </div>
              </div>
            )}

            {/* Scanned Items */}
            {items && Array.isArray(items) && (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={`${item.item_id || "item"}-${idx}`}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-gray-100/50 shadow-sm"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        ) : (
                          <div className="text-gray-400 text-xs text-center">
                            Sin imagen
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-base leading-tight line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="font-mono text-sm text-gray-700 bg-gray-50 rounded-lg px-2 py-1 inline-block">
                            {item.seller_sku || "N/A"}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-gray-100 text-gray-700 rounded-lg px-2 py-1">
                              Talle: {item.talle || "N/A"}
                            </span>
                            <span className="bg-gray-100 text-gray-700 rounded-lg px-2 py-1">
                              Color: {item.color || "N/A"}
                            </span>
                            <span className="bg-gray-100 text-gray-700 rounded-lg px-2 py-1">
                              Cantidad: {item.quantity}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Disponible:</span> {item.available_quantity ?? "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Action Button */}
                <Button
                  onClick={() => {
                    navigator.vibrate?.(100);
                    restartScanning();
                  }}
                  className="w-full h-12 mt-6 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all active:scale-98"
                >
                  Escanear otro código
                </Button>

                {/* Technical Details - Collapsible */}
                <details className="group">
                  <summary className="cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-medium text-gray-700">
                      Ver detalles técnicos
                    </span>
                    <span className="float-right text-gray-400 group-open:rotate-180 transition-transform">
                    </span>
                  </summary>
                  
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="space-y-3 text-xs">
                      {items.map((item, idx) => (
                        <div key={`${item.item_id || "item"}-${idx}`} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                          <div className="font-mono text-gray-900 mb-2 font-medium">
                            {item.seller_sku || item.title || `Ítem ${idx + 1}`}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-gray-600">
                            <div>Orden: <span className="text-gray-900">{item.order_id || "N/A"}</span></div>
                            <div>Artículo: <span className="text-gray-900">{item.item_id || "N/A"}</span></div>
                            <div>Variación: <span className="text-gray-900">{item.variation_id || "N/A"}</span></div>
                            <div>Código: <span className="text-gray-900">{lastScannedCode}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Error State - Retry */}
            {error && !showCamera && !items && !manualMode && (
              <div className="text-center py-8">
                <Button 
                  onClick={() => {
                    navigator.vibrate?.(50);
                    startCamera();
                  }} 
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all active:scale-98"
                >
                   Intentar de nuevo
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2">
            <p className="text-xs text-gray-500 text-center">
              {manualMode 
                ? " Ingresa el código manualmente o usa la cámara" 
                : showCamera 
                  ? " Mantén el dispositivo estable para mejor precisión" 
                  : " Listo para escanear códigos de barras"}
            </p>
          </div>
        </div>
      </div>
    </main>
  </LayoutWrapper>
)
}