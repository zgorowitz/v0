"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Package, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchTodaysOrders } from "@/lib/api"

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    setError("")

    try {
      const ordersData = await fetchTodaysOrders()
      setOrders(ordersData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(`Failed to load orders: ${err.message}`)
      console.error("Orders API error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "shipped":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col p-4">
      {/* Background Image Container - 50% of screen with white border */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-1/2 h-1/2 bg-cover bg-center bg-no-repeat border-4 border-white rounded-lg shadow-2xl"
          style={{
            backgroundImage: "url('/images/background.png')",
          }}
        />
      </div>

      {/* Gradient overlays for blending */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-transparent to-gray-100" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-100 via-transparent to-gray-100" />

      {/* Light overlay for better text readability */}
      <div className="absolute inset-0 bg-black/5" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            className="w-fit bg-white/30 hover:bg-white/40 text-gray-800 backdrop-blur-sm border border-white/20"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
            className="bg-white/30 hover:bg-white/40 text-gray-800 border-white/30 backdrop-blur-sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="w-full max-w-4xl mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Today's Orders
              {orders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {orders.length}
                </Badge>
              )}
            </CardTitle>
            {lastUpdated && <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">{error}</div>}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="mt-2 text-sm text-gray-500">Loading today's orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No orders found for today</p>
                <Button variant="outline" className="mt-4" onClick={loadOrders}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, index) => (
                  <div
                    key={order.orderId || index}
                    className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{order.orderId}</span>
                          <Badge className={getStatusColor(order.status)} variant="secondary">
                            {order.status}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{order.title}</h3>
                        <p className="text-sm text-gray-600">SKU: {order.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Qty: {order.quantity}</p>
                        {order.price && <p className="text-sm text-gray-600">${order.price}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
                      <div>
                        <span className="font-medium">Buyer:</span> {order.buyerName}
                      </div>
                      <div>
                        <span className="font-medium">Order Time:</span> {order.orderTime}
                      </div>
                    </div>

                    {order.shippingInfo !== "N/A" && (
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Shipping:</span> {order.shippingInfo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
