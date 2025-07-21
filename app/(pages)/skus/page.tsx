"use client"

import { useState, useEffect } from "react"
import { Loader2, Search, Package2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchAllSKUs } from "@/lib/api"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function SKUsPage() {
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
    if (stock === 0) return "Sin stock"
    if (stock < 10) return "Poco stock"
    return "En stock"
  }

  return (
    <LayoutWrapper>
      <main className="flex min-h-[calc(100vh-5rem)] flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Todos los SKUs</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSKUs}
            disabled={loading}
            className="bg-white/90 hover:bg-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <Card className="w-full max-w-4xl mx-auto backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Package2 className="mr-2 h-5 w-5" />
              Todos los SKUs
              {filteredSKUs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredSKUs.length}
                  {searchTerm && ` de ${skus.length}`}
                </Badge>
              )}
            </CardTitle>
            {lastUpdated && <p className="text-sm text-gray-500">Última actualización: {lastUpdated.toLocaleTimeString()}</p>}
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">{error}</div>}

            {/* Search Bar */}
            {!loading && skus.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar SKUs o títulos de productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="mt-2 text-sm text-gray-500">Cargando SKUs...</p>
              </div>
            ) : filteredSKUs.length === 0 ? (
              <div className="text-center py-8">
                <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? `No se encontraron SKUs que coincidan con "${searchTerm}"` : "No se encontraron SKUs"}
                </p>
                {searchTerm ? (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                    Limpiar búsqueda
                  </Button>
                ) : (
                  <Button variant="outline" className="mt-4" onClick={loadSKUs}>
                    Intentar de nuevo
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
                        {sku.category && <p className="text-sm text-gray-600">Categoría: {sku.category}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Stock: {sku.stock}</p>
                        {sku.price && <p className="text-sm text-gray-600">${sku.price}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
                      {sku.location && (
                        <div>
                          <span className="font-medium">Ubicación:</span> {sku.location}
                        </div>
                      )}
                      {sku.supplier && (
                        <div>
                          <span className="font-medium">Proveedor:</span> {sku.supplier}
                        </div>
                      )}
                      {sku.lastUpdated && (
                        <div>
                          <span className="font-medium">Actualizado:</span> {sku.lastUpdated}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </LayoutWrapper>
  )
}
