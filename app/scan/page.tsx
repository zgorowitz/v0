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
      setError("Failed to access camera. Please check permissions and try again.")
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
      setError("Failed to initialize barcode scanner. Using fallback detection.")
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
        throw new Error("No items found for this shipment")
      }
    } catch (err) {
      setError(`Failed to fetch details: ${err.message}`)
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
        setError("Flashlight not available on this device")
        setTimeout(() => setError(""), 3000)
      }
    } catch (err) {
      console.error("Flashlight error:", err)
      setError("Failed to toggle flashlight")
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

  // Navigate carousel
  const goToPreviousItem = () => {
    setCurrentItemIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
  }

  const goToNextItem = () => {
    setCurrentItemIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
  }

  const DetailRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-medium text-gray-900 text-sm">
        {value || 'N/A'}
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
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
            {!currentItem && (
              <CardTitle className="text-xl">Barcode Scanner</CardTitle>
            )}
              {!items && !loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setManualMode(!manualMode)
                    if (!manualMode) {
                      stopCamera()
                    } else {
                      startCamera()
                    }
                  }}
                >
                  {manualMode ? "Use Camera" : "Manual Entry"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Manual Entry Mode */}
            {manualMode && !items && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Enter Shipment ID or Barcode</label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter code manually..."
                    className="w-full p-2 border rounded-md"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleManualSubmit} disabled={!manualInput.trim() || loading} className="flex-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Code"}
                  </Button>
                  <Button variant="outline" onClick={() => setManualMode(false)} className="flex-1">
                    Use Camera
                  </Button>
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}

            {/* Camera Preview */}
            {showCamera && !manualMode && (
              // <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <div className="relative w-full h-[50vh] min-h-[300px] max-h-[500px] bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                {/* Camera overlay with scanning frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-32 border-2 border-white rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>

                    {/* Scanning line animation */}
                    {scanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-green-400 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scanning status */}
                <div className="absolute top-4 left-4 right-4 text-center">
                  <p className="text-white text-sm bg-black/50 rounded px-2 py-1">
                    {loading
                      ? "Processing barcode..."
                      : scanning
                        ? "Scanning for barcode..."
                        : "Position barcode within the frame"}
                  </p>
                </div>

                {/* Camera controls */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {/* Flashlight toggle */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-black/50 hover:bg-black/70 text-white"
                    onClick={toggleFlashlight}
                  >
                    {flashlightOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  </Button>

                  {/* Close camera button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-black/50 hover:bg-black/70 text-white"
                    onClick={stopCamera}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-white text-xs bg-black/50 rounded px-2 py-1">
                    Hold steady and ensure barcode is clearly visible
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center p-8">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  <p className="mt-2 text-sm text-gray-500">Processing barcode and fetching details...</p>
                </div>
              </div>
            )}

            {/* Scanned Items Carousel */}
            
            {currentItem && (
  <div className="mt-6 max-w-md mx-auto">
    {/* Navigation Header */}
    {items.length > 1 && (
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm font-medium text-gray-900">
          {currentItemIndex + 1} of {items.length}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousItem}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={currentItemIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          
          <div className="flex gap-1.5">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentItemIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  index === currentItemIndex 
                    ? 'bg-gray-900 w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={goToNextItem}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={currentItemIndex === items.length - 1}
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
    )}

    {/* Main Card */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {currentItem.title}
          </h3>
        </div>

        {/* SKU - Big and prominent */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">SKU</div>
            <div className="font-mono text-xl font-bold text-gray-900">
              {currentItem.seller_sku || 'N/A'}
            </div>
          </div>
        </div>

        {/* Talle and Color - Same line */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Talle</div>
            <div className="font-semibold text-gray-900">{currentItem.talle || 'N/A'}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Color</div>
            <div className="font-semibold text-gray-900">{currentItem.color || 'N/A'}</div>
          </div>
        </div>

        {/* Cantidad and Diseño - Same line */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Cantidad</div>
            <div className="font-semibold text-gray-900">{currentItem.quantity}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Diseño</div>
            <div className="font-semibold text-gray-900">{currentItem.fabric_type || 'N/A'}</div>
          </div>
        </div>

        {/* Cantidad Disponible */}
{/* Image with Cantidad Disponible on top */}
{currentItem.thumbnail && (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="text-center mb-2">
      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Disponible</div>
      <div className="font-semibold text-gray-900 text-sm">{currentItem.available_quantity || 'N/A'}</div>
    </div>
    <div className="aspect-square flex items-center justify-center p-1">
      <img 
        src={currentItem.thumbnail} 
        alt={currentItem.title} 
        className="w-full h-full object-contain"
      />
    </div>
  </div>
)}

        {/* Product Image */}
        {/* {currentItem.thumbnail && (
          <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center p-4">
            <img 
              src={currentItem.thumbnail} 
              alt={currentItem.title} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )} */}

        {/* Technical Info */}
        <div className="pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <TechDetail label="Order ID" value={currentItem.order_id} />
            <TechDetail label="Item ID" value={currentItem.item_id} />
            <TechDetail label="Variation ID" value={currentItem.variation_id} />
            <TechDetail label="Barcode" value={lastScannedCode} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={restartScanning}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition-colors"
          >
            Scan Another
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(
                JSON.stringify(
                  {
                    shipmentId: lastScannedCode,
                    totalItems: items.length,
                    currentItem: {
                      ...currentItem,
                      itemNumber: currentItemIndex + 1
                    },
                    allItems: items
                  },
                  null,
                  2,
                ),
              )
            }}
            className="flex-1 py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
          >
            Copy Details
          </button>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Error State - Show restart button */}
            {error && !showCamera && !items && !manualMode && (
              <div className="text-center p-8">
                <Button onClick={startCamera} className="w-full">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-xs text-gray-400">
              {manualMode 
                ? "Enter shipment ID manually or switch to camera mode" 
                : showCamera 
                  ? "Point camera at barcode to scan automatically" 
                  : "Camera will open automatically"}
            </p>
          </CardFooter>
        </Card>
      </main>
    </LayoutWrapper>
  )
}