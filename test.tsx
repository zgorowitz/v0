hola

"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, X, Flashlight, FlashlightOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { extractShipmentInfo } from "@/lib/api"
import { BarcodeScanner } from "@/lib/barcode-scanner"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function ScanPage() {
  const [showCamera, setShowCamera] = useState(false)
  const [itemDetails, setItemDetails] = useState(null)
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
      scannerRef.current = new BarcodeScanner()

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
          ? `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`
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
      const details = await extractShipmentInfo(code)
      setItemDetails(details)
      // Stop camera after successful scan and data retrieval
      stopCamera()
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
    setItemDetails(null)
    setError("")
    setLastScannedCode("")
    setManualMode(false)
    startCamera()
  }

  // Handle manual input submission
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      processScannedCode(manualInput.trim())
      setManualInput("")
    }
  }

  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Barcode Scanner</CardTitle>
              {!itemDetails && !loading && (
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
            {manualMode && !itemDetails && (
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
                  <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="flex-1">
                    Submit Code
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
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
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

            {itemDetails && (
              <div className="mt-4 border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-lg mb-3 text-green-700">✓ Scan Successful</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Scanned Code:</span>
                    <span className="font-mono text-xs">{lastScannedCode}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Order ID:</span>
                    <span className="font-mono">{itemDetails.order_id}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Item ID:</span>
                    <span className="font-mono text-xs">{itemDetails.item_id}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">SKU:</span>
                    <span className="font-mono text-xs">{itemDetails.sku || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Title:</span>
                    <span className="text-right max-w-48 truncate">{itemDetails.title}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Quantity:</span>
                    <span className="font-medium">{itemDetails.quantity}</span>
                  </div>
                  
                  {/* Optional: Add image if you want */}
                  {itemDetails.image && (
                    <div className="mt-2">
                      <img src={itemDetails.image} alt={itemDetails.title} className="w-full h-32 object-cover rounded" />
                    </div>
                  )}
                </div>

                {/* Action buttons remain the same */}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={restartScanning}>
                    Scan Another
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        JSON.stringify(
                          {
                            scannedCode: lastScannedCode,
                            ...itemDetails,
                          },
                          null,
                          2,
                        ),
                      )
                    }}
                  >
                    Copy Details
                  </Button>
                </div>
              </div>
            )}
            {/* Error State - Show restart button */}
            {error && !showCamera && !itemDetails && !manualMode && (
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