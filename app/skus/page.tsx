"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Search, Package2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchAllSKUs } from "@/lib/api"

export default function SKUsPage() {
  const router = useRouter()
  const [skus, setSKUs] = useState([])
  const [filteredSKUs, setFilteredSKUs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadSKUs()
  }, [])

  useEffect(() => {
    // Filter SKUs based on search term
    if (searchTerm.trim() === "") {
      setFilteredSKUs(skus)
    } else {
      const filtered = skus.filter(
        (sku) =>
          sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sku.title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredSKUs(filtered)
    }
  }, [searchTerm, skus])

  const loadSKUs = async () => {
    setLoading(true)
    setError("")

    try {
      const skusData = await fetchAllSKUs()
      setSKUs(skusData)
      setFilteredSKUs(skusData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(`Failed to load SKUs: ${err.message}`)
      console.error("SKUs API error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStockColor = (stock) => {
    if (stock === 0) return "bg-red-100 text-red-800"
    if (stock < 10) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  const getStockStatus = (stock) => {
    if (stock === 0) return "Out of Stock"
    if (stock < 10) return "Low Stock"
    return "In Stock"
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
            onClick={loadSKUs}
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
              <Package2 className="mr-2 h-5 w-5" />
              All SKUs
              {filteredSKUs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredSKUs.length}
                  {searchTerm && ` of ${skus.length}`}
                </Badge>
              )}
            </CardTitle>
            {lastUpdated && <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">{error}</div>}

            {/* Search Bar */}
            {!loading && skus.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search SKUs or product titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="mt-2 text-sm text-gray-500">Loading SKUs...</p>
              </div>
            ) : filteredSKUs.length === 0 ? (
              <div className="text-center py-8">
                <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? `No SKUs found matching "${searchTerm}"` : "No SKUs found"}
                </p>
                {searchTerm ? (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                ) : (
                  <Button variant="outline" className="mt-4" onClick={loadSKUs}>
                    Try Again
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSKUs.map((sku, index) => (
                  <div
                    key={sku.sku || index}
                    className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{sku.sku}</span>
                          <Badge className={getStockColor(sku.stock)} variant="secondary">
                            {getStockStatus(sku.stock)}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{sku.title}</h3>
                        {sku.category && <p className="text-sm text-gray-600">Category: {sku.category}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Stock: {sku.stock}</p>
                        {sku.price && <p className="text-sm text-gray-600">${sku.price}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
                      {sku.location && (
                        <div>
                          <span className="font-medium">Location:</span> {sku.location}
                        </div>
                      )}
                      {sku.supplier && (
                        <div>
                          <span className="font-medium">Supplier:</span> {sku.supplier}
                        </div>
                      )}
                      {sku.lastUpdated && (
                        <div>
                          <span className="font-medium">Updated:</span> {sku.lastUpdated}
                        </div>
                      )}
                    </div>
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
