"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Loader2, 
  Package, 
  Sparkles,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { 
  get_packing, 
  pack_shipment, 
  repack_shipment, 
  getShipmentData,
  track_scan_session,
  track_multiple_scan_sessions
} from "@/lib/scan2/packing"
import { triggerVibration } from "@/lib/scan2/scan-utils"
import { useRouter, useSearchParams } from "next/navigation"

// Type definitions
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

      // Track scan session
      await track_scan_session(code)

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
      // Track multiple scan sessions first
      await track_multiple_scan_sessions(codes)
      
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

const ProductCard: React.FC<{ item: Item; index: number }> = ({ item, index }) => {
  const itemTitle = item.title || item.item_title || 'Unknown Item'
  const itemSku = item.seller_sku || item.sku || 'N/A'
  const itemThumbnail = item.thumbnail || item.item_thumbnail

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-lg bg-white border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="relative p-2">
        <div className="flex gap-2">
          {/* Product Image */}
          <div className="relative w-12 h-12 flex-shrink-0">
            {itemThumbnail ? (
              <img
                src={itemThumbnail}
                alt={itemTitle}
                className="w-full h-full object-cover rounded-md"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-md bg-gray-100">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm leading-tight truncate mb-1">
              {itemTitle}
            </h3>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {itemSku}
                </span>
                <span className="text-xs text-gray-500">
                  {item.available_quantity} disponible
                </span>
              </div>
              
              <div className="text-xs text-gray-600 space-x-2">
                {item.talle && <span>{item.talle}</span>}
                {item.color && <span>{item.color}</span>}
                <span className="font-medium text-gray-900">{item.quantity}×</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Processing..." }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
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

function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState("")
  const [packingLoading, setPackingLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [packedShipments, setPackedShipments] = useState<Set<string>>(new Set())
  
  // Custom hooks
  const {
    shipments,
    packingInfo,
    setPackingInfo,
    processShipmentCode,
    processMultipleShipments
  } = useShipmentProcessor()

  // Process codes from URL parameters
  useEffect(() => {
    const codes = searchParams.get('codes')
    if (!codes) {
      router.push('/scan2/scan')
      return
    }

    const processScannedCodes = async () => {
      setIsLoading(true)
      try {
        const codeArray = codes.split(',').map(code => decodeURIComponent(code.trim())).filter(Boolean)
        
        if (codeArray.length === 1) {
          // Single shipment
          const shipment = await processShipmentCode(codeArray[0])
          if (shipment) {
            setCurrentShipment(shipment)
            setLastScannedCode(codeArray[0])
          } else {
            throw new Error("No items found")
          }
        } else if (codeArray.length > 1) {
          // Multiple shipments
          await processMultipleShipments(codeArray)
        }
      } catch (err: any) {
        setError(err.message || "Failed to process shipments")
        triggerVibration('error')
      } finally {
        setIsLoading(false)
      }
    }

    processScannedCodes()
  }, [searchParams, router, processShipmentCode, processMultipleShipments])

  // Packing handlers
  const handlePack = useCallback(async (shipmentId?: string) => {
    const targetShipmentId = shipmentId || lastScannedCode
    if (!targetShipmentId) return

    setPackingLoading(true)
    try {
      const data = await pack_shipment(targetShipmentId)
      setPackingInfo(data)
      setLastScannedCode(targetShipmentId)
      setPackedShipments(prev => new Set(prev).add(targetShipmentId))
      triggerVibration('success')
    } catch (err: any) {
      setError(err.message || "Packing failed")
      triggerVibration('error')
    } finally {
      setPackingLoading(false)
    }
  }, [lastScannedCode])

  const goBackToScan = () => {
    router.push('/scan2/scan')
  }

  if (isLoading) {
    return (
      <LayoutWrapper>
        <main className="flex min-h-screen flex-col items-center justify-center px-4">
          <LoadingSpinner message="Getting product information..." />
        </main>
      </LayoutWrapper>
    )
  }

  if (error && !currentShipment && shipments.length === 0) {
    return (
      <LayoutWrapper>
        <main className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Package className="w-12 h-12 mx-auto mb-2" />
              <h2 className="text-lg font-semibold">Error</h2>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
            </div>
            <Button
              onClick={goBackToScan}
              className="bg-black hover:bg-gray-800 text-white font-medium rounded-lg px-6 py-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Scan
            </Button>
          </div>
        </main>
      </LayoutWrapper>
    )
  }

  const hasMultipleShipments = shipments.length > 0
  const displayShipments = hasMultipleShipments ? shipments : (currentShipment ? [currentShipment] : [])

  return (
    <main className="min-h-screen bg-gradient-to-br">
      {/* Header */}

      {/* <div className="flex justify-between items-start mb-4"> */}
            {/* <Sparkles className="w-6 h-6 text-blue-500" /> */}
            {/* <h1 className="text-lg font-semibold text-gray-900">
              {hasMultipleShipments 
                ? `${shipments.length} Etiqueta${shipments.length !== 1 ? 's' : ''} Encontrada${shipments.length !== 1 ? 's' : ''} `
                : `${currentShipment?.items.length || 0} producto${(currentShipment?.items.length || 0) !== 1 ? 's' : ''}`
              }
            </h1>    
      </div> */}

      {/* Results */}
      <div className="px-4 py-6">
        {displayShipments.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            {/* Shipment Items */}
            <div className="space-y-4">
              {displayShipments.map((shipment, shipmentIdx) => (
                <motion.div
                  key={shipment.shipmentId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: shipmentIdx * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {hasMultipleShipments ? `Etiqueta: ${shipment.shipmentId}` : shipment.shipmentId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {shipment.items.length} item{shipment.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                          
                    {/* Packing Button/Status for this shipment */}
                    <div className="flex items-center gap-2">
                      {packedShipments.has(shipment.shipmentId) ? (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-green-700">
                            <div className="font-semibold">Empacado</div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handlePack(shipment.shipmentId)}
                          disabled={packingLoading}
                          className="bg-black hover:bg-gray-800 text-white px-6"
                        >
                          {packingLoading && lastScannedCode === shipment.shipmentId ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Package className="h-4 w-4 mr-2" />
                          )}
                          Empacar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={goBackToScan}
                  className="bg-black hover:bg-gray-800 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Escanear otra etiqueta
                </Button>
              </motion.div>
            </div>

            {/* Technical Details */}
            <details className="group mt-8 max-w-2xl mx-auto">
              <summary className="cursor-pointer p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 hover:bg-white/80 transition-colors">
                <span className="text-sm font-medium text-gray-700">
                  View Technical Details
                </span>
                <span className="float-right text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40"
              >
                <div className="space-y-3 text-sm">
                  {displayShipments.flatMap((shipment) =>
                    shipment.items.map((item, idx) => (
                      <div key={`tech-${shipment.shipmentId}-${idx}`} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                        <div className="font-mono text-gray-900 mb-2 font-semibold">
                          {item.seller_sku || item.sku || item.title || item.item_title || `Item ${idx + 1}`}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                          <div>Order: <span className="text-gray-900 font-medium">{item.order_id || "N/A"}</span></div>
                          <div>Item: <span className="text-gray-900 font-medium">{item.item_id || item.id || "N/A"}</span></div>
                          <div>
                            {item.variation_id !== undefined
                              ? <>Variation: <span className="text-gray-900 font-medium">{item.variation_id || "N/A"}</span></>
                              : <>Product: <span className="text-gray-900 font-medium">{item.user_product_id || "N/A"}</span></>
                            }
                          </div>
                          <div>Code: <span className="text-gray-900 font-medium">{shipment.shipmentId}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </details>
          </motion.div>
        ) : (
          <div className="text-center py-16 max-w-md mx-auto">
            <Package className="w-16 h-16 mx-auto mb-6 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No Results</h3>
            <p className="text-gray-600 mb-6">
              No shipments could be processed with the provided codes.
            </p>
            <Button
              onClick={goBackToScan}
              className="bg-black hover:bg-gray-800 text-white font-medium rounded-xl px-8 py-3"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ResultsMainPage() {
  return <ResultsPage />
}