'use client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPackingMetrics, getMetricsForPeriod, type PackingMetric } from '@/lib/homepage/metrics'

export default function ScannerPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [packingMetrics, setPackingMetrics] = useState<PackingMetric[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Check auth status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  // Fetch packing metrics
  const fetchMetrics = useCallback(async () => {
    if (!user?.email) return
    
    setMetricsLoading(true)
    try {
      const data = await fetchPackingMetrics(user.email)
      setPackingMetrics(data)
    } catch (error) {
      console.error('Error fetching packing metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }, [user])

  // Fetch metrics when user loads
  useEffect(() => {
    if (user) {
      fetchMetrics()
    }
  }, [user, fetchMetrics])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div>Loading...</div>

  return (
    <LayoutWrapper>
        <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-800 border-b pb-2">Mercado Libre Scanner</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                  <div>  
                  </div>

                  <Card className="border mb-4">
                    <CardContent className="p-4">
                      
                      {metricsLoading ? (
                        <div>Cargando...</div>
                      ) : (
                        <div className="grid grid-cols-3 text-center">
                          <div>
                            <div className="text-sm">Hoy</div>
                            <div className="text-2xl font-bold">
                              {getMetricsForPeriod(packingMetrics, 1).totalPackages}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">7 días</div>
                            <div className="text-2xl font-bold">
                              {getMetricsForPeriod(packingMetrics, 7).totalPackages}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">30 días</div>
                            <div className="text-2xl font-bold">
                              {getMetricsForPeriod(packingMetrics, 30).totalPackages}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Link href="/scan2" className="w-full">
                    <Button className="w-full" size="lg">
                    Iniciar escaneo
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full"
                  >
                    Cerrar sesión
                  </Button>
                  {/* <div className="mt-6 pt-4 border-t border-gray-200">
                    <Link href="/scan2" className="w-full">
                      <Button variant="outline" className="w-full" size="sm">
                        Escáner 2.0
                      </Button>
                    </Link>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      Multi escáner beta
                    </p>
                  </div> */}
            </CardContent>
          </Card>
        </main>
    </LayoutWrapper>
  )
}