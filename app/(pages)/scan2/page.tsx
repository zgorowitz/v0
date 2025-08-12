"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Loader2, 
  X, 
  Flashlight, 
  FlashlightOff, 
  Package, 
  Sparkles, 
  Camera, 
  Edit3 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { CameraManager } from "@/lib/scan2/camera"
import { EnhancedBarcodeScanner } from "@/lib/scan2/barcode-scanner"
import { 
  get_packing, 
  pack_shipment, 
  repack_shipment, 
  getShipmentData 
} from "@/lib/scan2/packing"
import { 
  triggerVibration, 
  fadeIn, 
  slideUp, 
  scaleIn 
} from "@/lib/scan2/scan-utils"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Item {
  item_id?: string
  id?: string
  title?: string
  item_title?: string
  seller_sku?: string
  sku?: string
  thumbnail?: string
  item_thumbnail?: string
  quantity: number
  available_quantity?: number
  talle?: string
  color?: string
  variation_attributes?: any
  variation_id?: string
  user_product_id?: string
  order_id?: string
}

interface Shipment {
  shipmentId: string
  data: any
  items: Item[]
}

interface PackingInfo {
  packed_by_name?: string
  created_at?: string
}

type ScanMode = 'camera' | 'manual'
type ViewState = 'scanning' | 'results' | 'loading'

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useCameraManager = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraManagerRef = useRef<CameraManager | null>(null)
  const scannerRef = useRef<EnhancedBarcodeScanner | null>(null)

  useEffect(() => {
    cameraManagerRef.current = new CameraManager()
    scannerRef.current = new EnhancedBarcodeScanner()

    return () => {
      cameraManagerRef.current?.stopCamera()
      scannerRef.current?.stopScanning()
    }
  }, [])

  return {
    videoRef,
    cameraManager: cameraManagerRef.current,
    scanner: scannerRef.current
  }
}

const useShipmentProcessor = () => {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [packingInfo, setPackingInfo] = useState<PackingInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const processShipmentCode = useCallback(async (code: string): Promise<Shipment | null> => {
    try {
      const shipmentData = await getShipmentData(code)
      
      if (!shipmentData?.items?.length) {
        throw new Error("No items found for this shipment")
      }

      const shipment: Shipment = {
        shipmentId: code,
        data: shipmentData,
        items: shipmentData.items
      }

      // Check packing status
      const packingStatus = await get_packing(code)
      if (packingStatus) {
        setPackingInfo(packingStatus)
      }

      return shipment
    } catch (error) {
      console.error(`Failed to process shipment ${code}:`, error)
      throw error
    }
  }, [])

  const processMultipleShipments = useCallback(async (codes: string[]): Promise<Shipment[]> => {
    setIsProcessing(true)
    try {
      const shipmentPromises = codes.map(code => processShipmentCode(code))
      const results = await Promise.allSettled(shipmentPromises)
      
      const successfulShipments = results
        .filter((result): result is PromiseFulfilledResult<Shipment | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as Shipment)

      setShipments(successfulShipments)
      return successfulShipments
    } finally {
      setIsProcessing(false)
    }
  }, [processShipmentCode])

  return {
    shipments,
    packingInfo,
    isProcessing,
    setPackingInfo,
    processShipmentCode,
    processMultipleShipments,
    clearShipments: () => setShipments([])
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ProductCard: React.FC<{ item: Item; index: number }> = ({ item, index }) => {
  const itemTitle = item.title || item.item_title || 'Unknown Item'
  const itemSku = item.seller_sku || item.sku || 'N/A'
  const itemThumbnail = item.thumbnail || item.item_thumbnail

  return (
    <motion.div
      {...fadeIn}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl" />
            {itemThumbnail ? (
              <motion.img
                whileHover={{ scale: 1.1 }}
                src={itemThumbnail}
                alt={itemTitle}
                className="relative w-full h-full object-cover rounded-xl shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 mb-2">
              {itemTitle}
            </h3>
            
            <div className="space-y-2">
              <div className="inline-flex items-center bg-gray-100 text-gray-700 rounded-lg px-2 py-1 text-sm font-mono">
                {itemSku}
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                {item.talle && (
                  <span className="border border-blue-200 rounded-lg px-2 py-1">
                    Size: {item.talle}
                  </span>
                )}
                {item.color && (
                  <span className="border border-green-200 rounded-lg px-2 py-1">
                    Color: {item.color}
                  </span>
                )}
                <span className="border border-purple-200 rounded-lg px-2 py-1 font-medium">
                  Qty: {item.quantity}
                </span>
              </div>
              
              {item.available_quantity !== undefined && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Available:</span> {item.available_quantity}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const ErrorMessage: React.FC<{ error: string }> = ({ error }) => {
  if (!error) return null

  return (
    <motion.div 
      {...slideUp}
      className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"
    >
      <p className="text-red-600 text-sm font-medium text-center">
        {error}
      </p>
    </motion.div>
  )
}

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Processing..." }) => (
  <motion.div 
    {...fadeIn}
    className="text-center py-12"
  >
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-blue-500" />
        </div>
      </div>
      <p className="text-base text-gray-600 font-medium">
        {message}
      </p>
    </div>
  </motion.div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Scan2Page() {
  // Core state
  const [viewState, setViewState] = useState<ViewState>('scanning')
  const [scanMode, setScanMode] = useState<ScanMode>('camera')
  const [error, setError] = useState("")
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [multipleMode, setMultipleMode] = useState(false)
  const [scannedCodes, setScannedCodes] = useState<string[]>([])
  const [justScanned, setJustScanned] = useState(false)
  
  // Manual input state
  const [manualInput, setManualInput] = useState("")
  
  // Results state
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState("")
  
  // Packing state
  const [packingLoading, setPackingLoading] = useState(false)
  
  // Custom hooks
  const { videoRef, cameraManager, scanner } = useCameraManager()
  const {
    shipments,
    packingInfo,
    isProcessing,
    setPackingInfo,
    processShipmentCode,
    processMultipleShipments,
    clearShipments
  } = useShipmentProcessor()

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (scanMode === 'camera' && viewState === 'scanning') {
      startCamera()
    }
    
    return () => {
      stopCamera()
    }
  }, [scanMode, viewState])

  // ============================================================================
  // CAMERA FUNCTIONS
  // ============================================================================

  const startCamera = useCallback(async () => {
    if (!cameraManager || !scanner || !videoRef.current) return

    try {
      setError("")
      setIsScanning(true)
      await cameraManager.startCamera(videoRef.current)
      await startBarcodeDetection()
    } catch (err: any) {
      setError(err.message || "Failed to start camera")
      console.error("Camera access error:", err)
      setIsScanning(false)
    }
  }, [cameraManager, scanner])

  const stopCamera = useCallback(() => {
    scanner?.stopScanning()
    cameraManager?.stopCamera()
    setIsScanning(false)
    setFlashlightOn(false)
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

  const toggleFlashlight = useCallback(async () => {
    if (!cameraManager) return

    try {
      const newState = await cameraManager.toggleFlashlight()
      setFlashlightOn(newState)
      triggerVibration('click')
    } catch (err: any) {
      setError(err.message || "Flashlight toggle failed")
      setTimeout(() => setError(""), 3000)
    }
  }, [cameraManager])

  // ============================================================================
  // SCANNING HANDLERS
  // ============================================================================

  const handleScannedCode = useCallback(async (code: string) => {
    if (multipleMode) {
      handleMultipleScan(code)
    } else {
      handleSingleScan(code)
    }
  }, [multipleMode])

  const handleMultipleScan = useCallback((code: string) => {
    if (scannedCodes.includes(code)) {
      setError("Code already scanned")
      triggerVibration('error')
      setTimeout(() => setError(""), 2000)
      return
    }

    setScannedCodes(prev => [...prev, code])
    setJustScanned(true)
    setLastScannedCode(code)
    triggerVibration('success')
    
    setTimeout(() => {
      setJustScanned(false)
      if (isScanning) {
        startBarcodeDetection()
      }
    }, 2000)
  }, [scannedCodes, isScanning])

  const handleSingleScan = useCallback(async (code: string) => {
    setViewState('loading')
    setIsScanning(false)
    scanner?.stopScanning()
    triggerVibration('scan')

    try {
      const shipment = await processShipmentCode(code)
      
      if (shipment) {
        setCurrentShipment(shipment)
        setLastScannedCode(code)
        setViewState('results')
        stopCamera()
        triggerVibration('success')
      } else {
        throw new Error("No items found")
      }
    } catch (err: any) {
      setError(err.message || "Failed to process shipment")
      triggerVibration('error')
      setViewState('scanning')
      
      setTimeout(() => {
        setError("")
        if (scanMode === 'camera') {
          startBarcodeDetection()
        }
      }, 3000)
    }
  }, [processShipmentCode, scanner, scanMode])

  const handleManualSubmit = useCallback(() => {
    const trimmedInput = manualInput.trim()
    if (!trimmedInput) return

    setLastScannedCode(trimmedInput)
    handleSingleScan(trimmedInput)
    setManualInput("")
  }, [manualInput, handleSingleScan])

  const handleProcessMultiple = useCallback(async () => {
    if (scannedCodes.length === 0) return

    setViewState('loading')
    stopCamera()

    try {
      const processed = await processMultipleShipments(scannedCodes)
      
      if (processed.length > 0) {
        setViewState('results')
        triggerVibration('success')
      } else {
        throw new Error("No shipments could be processed")
      }
    } catch (err: any) {
      setError(err.message || "Failed to process shipments")
      triggerVibration('error')
      setViewState('scanning')
    }
  }, [scannedCodes, processMultipleShipments])

  // ============================================================================
  // PACKING HANDLERS
  // ============================================================================

  const handlePack = useCallback(async () => {
    if (!lastScannedCode) return

    setPackingLoading(true)
    try {
      const data = await pack_shipment(lastScannedCode)
      setPackingInfo(data)
      triggerVibration('success')
    } catch (err: any) {
      setError(err.message || "Packing failed")
      triggerVibration('error')
    } finally {
      setPackingLoading(false)
    }
  }, [lastScannedCode])

  const handleRepack = useCallback(async () => {
    if (!lastScannedCode) return

    setPackingLoading(true)
    try {
      const data = await repack_shipment(lastScannedCode)
      setPackingInfo(data)
      triggerVibration('success')
    } catch (err: any) {
      setError(err.message || "Repacking failed")
      triggerVibration('error')
    } finally {
      setPackingLoading(false)
    }
  }, [lastScannedCode])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const resetScanner = useCallback(() => {
    setViewState('scanning')
    setScanMode('camera')
    setCurrentShipment(null)
    clearShipments()
    setError("")
    setLastScannedCode("")
    setMultipleMode(false)
    setScannedCodes([])
    setJustScanned(false)
    setPackingInfo(null)
    setManualInput("")
    startCamera()
  }, [startCamera, clearShipments])

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

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderHeader = () => (
    <div className="px-6 pt-6 pb-2">
      <AnimatePresence>
        <ErrorMessage error={error} />
      </AnimatePresence>
      
      {viewState === 'scanning' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Version 2
            </h1>
          </div>
          {!isProcessing && (
            <div className="flex items-center gap-2">
              {scanMode === 'camera' && (
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant={multipleMode ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full transition-all active:scale-95 ${
                      multipleMode 
                        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-md" 
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      if (multipleMode) {
                        setMultipleMode(false)
                        setScannedCodes([])
                      } else {
                        setMultipleMode(true)
                        setScannedCodes([])
                      }
                      triggerVibration('click')
                    }}
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
      )}
    </div>
  )

  const renderManualInput = () => (
    <AnimatePresence>
      {scanMode === 'manual' && viewState === 'scanning' && (
        <motion.div 
          {...slideUp}
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
              className="flex-1 h-12 text-base font-medium rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 active:scale-98 transition-all"
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
      {scanMode === 'camera' && viewState === 'scanning' && (
        <motion.div 
          {...scaleIn}
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
            <motion.div 
              {...scaleIn}
              className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20"
            >
              <p className="text-white text-sm font-medium flex items-center gap-2">
                {multipleMode && justScanned ? (
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
                    <span className="w-2 h-2 border border-green-400 rounded-full animate-pulse" />
                    {multipleMode ? `Scanning... (${scannedCodes.length} codes)` : "Scanning..."}
                  </>
                ):<></>}
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
                onClick={toggleFlashlight}
              >
                {flashlightOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
              </Button>
            </motion.div>

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
                  Continue ({scannedCodes.length} shipments)
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                {...slideUp}
                className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20"
              >
                <p className="text-white text-xs text-center">
                  {multipleMode 
                    ? "Scan multiple shipment codes"
                    : "Hold steady for auto-detection"
                  }
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const renderResults = () => {
    const hasMultipleShipments = shipments.length > 0
    const displayShipments = hasMultipleShipments ? shipments : (currentShipment ? [currentShipment] : [])

    if (displayShipments.length === 0) return null

    return (
      <motion.div 
        {...fadeIn}
        className="space-y-4"
      >
        {/* Results Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {hasMultipleShipments ? 'Scanned Shipments' : 'Products Found'}
          </h2>
          <p className="text-sm text-gray-600">
            {hasMultipleShipments 
              ? `${shipments.length} shipment${shipments.length !== 1 ? 's' : ''} found`
              : `${currentShipment?.items.length || 0} item${(currentShipment?.items.length || 0) !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Shipment Items */}
        <div className="space-y-6">
          {displayShipments.map((shipment, shipmentIdx) => (
            <motion.div
              key={shipment.shipmentId}
              {...fadeIn}
              transition={{ delay: shipmentIdx * 0.1 }}
              className={hasMultipleShipments ? "bg-gray-50 rounded-2xl p-4 border border-gray-200" : ""}
            >
              {hasMultipleShipments && (
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Shipment: {shipment.shipmentId}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {shipment.items.length} item{shipment.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                                {shipment.items.map((item, idx) => (
                  <ProductCard 
                    key={`${shipment.shipmentId}-${item.user_product_id || item.item_id || item.id || idx}`} 
                    item={item} 
                    index={idx}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Packing Section */}
        <AnimatePresence>
          {packingInfo ? (
            <motion.div 
              {...slideUp}
              className="mt-6 p-4 border border-green-200 rounded-xl bg-green-50/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-green-200 rounded-full flex items-center justify-center bg-white">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      Packed by {packingInfo.packed_by_name || 'User'}
                    </div>
                    <div className="text-xs text-green-600">
                      {packingInfo.created_at 
                        ? new Date(packingInfo.created_at).toLocaleString('en-US', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recently updated'
                      }
                    </div>
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleRepack}
                    disabled={packingLoading}
                    size="sm"
                    className="bg-white/80 backdrop-blur-sm border border-green-200 hover:bg-white text-green-700 hover:text-green-800 rounded-lg px-3 py-1 text-xs font-medium transition-all"
                  >
                    {packingLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Repack"
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handlePack}
                disabled={packingLoading}
                className="w-full h-14 mt-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all flex items-center gap-3 shadow-lg"
              >
                {packingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
                <span className="text-base">
                  {packingLoading ? "Packing..." : "Mark as Packed"}
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              onClick={resetScanner}
              variant="outline"
              className="w-full h-12 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all"
            >
              Scan Another Code
            </Button>
          </motion.div>
        </div>

        {/* Technical Details */}
        <details className="group mt-4">
          <summary className="cursor-pointer p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100 hover:bg-gray-100/80 transition-colors">
            <span className="text-sm font-medium text-gray-700">
              View Technical Details
            </span>
            <span className="float-right text-gray-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          
          <motion.div 
            {...slideUp}
            className="mt-3 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100"
          >
            <div className="space-y-3 text-xs">
              {displayShipments.flatMap((shipment) =>
                shipment.items.map((item, idx) => (
                  <div key={`tech-${shipment.shipmentId}-${idx}`} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                    <div className="font-mono text-gray-900 mb-2 font-medium">
                      {item.seller_sku || item.sku || item.title || item.item_title || `Item ${idx + 1}`}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div>Order: <span className="text-gray-900">{item.order_id || "N/A"}</span></div>
                      <div>Item: <span className="text-gray-900">{item.item_id || item.id || "N/A"}</span></div>
                      <div>
                        {item.variation_id !== undefined
                          ? <>Variation: <span className="text-gray-900">{item.variation_id || "N/A"}</span></>
                          : <>Product: <span className="text-gray-900">{item.user_product_id || "N/A"}</span></>
                        }
                      </div>
                      <div>Code: <span className="text-gray-900">{shipment.shipmentId}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </details>
      </motion.div>
    )
  }

  const renderContent = () => {
    switch (viewState) {
      case 'loading':
        return <LoadingSpinner message="Getting product information..." />
      
      case 'results':
        return renderResults()
      
      case 'scanning':
      default:
        return (
          <>
            {renderManualInput()}
            {renderCamera()}
          </>
        )
    }
  }

  const renderFooter = () => {
    if (viewState !== 'scanning') return null

    const footerMessage = scanMode === 'manual' 
      ? "💡 Enter code manually or use camera" 
      : isScanning
        ? "📱 Keep device steady for better accuracy" 
        : "🚀 Ready to scan barcodes"

    return (
      <div className="px-6 pb-6 pt-2">
        <p className="text-xs text-gray-500 text-center">
          {footerMessage}
        </p>
      </div>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <LayoutWrapper>
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
          {...fadeIn}
          className="w-full max-w-md mx-auto mt-8"
        >
          <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            {renderHeader()}
            
            <div className="px-6 pb-6 flex flex-col gap-6">
              {renderContent()}
              
              {/* Error State Action */}
              <AnimatePresence>
                {error && viewState === 'scanning' && !isScanning && scanMode === 'camera' && (
                  <motion.div 
                    {...fadeIn}
                    className="text-center py-8"
                  >
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={startCamera}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all"
                      >
                        Try Again
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {renderFooter()}
          </div>
        </motion.div>
      </main>
    </LayoutWrapper>
  )
}