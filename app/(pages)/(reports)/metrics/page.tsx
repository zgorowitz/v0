'use client'
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useState, useEffect, useCallback } from 'react'
import { createClient, getCurrentUserOrganizationId } from '@/lib/supabase/client'
 
interface UserMetric {
  packed_by_name: string
  packed_by_email: string
  packing_date: string
  shipments_packed: number
  first_shipment_time: string
  last_shipment_time: string
}


export default function MetricsPage() {
  const [users, setUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<'totales' | 'comparacion'>('totales')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    if (!organizationId) return
    
    try {
      const { data, error } = await supabase
        .from('daily_packing_metrics')
        .select('packed_by_name, packed_by_email')
        .eq('organization_id', organizationId)
        .order('packed_by_name')
      
      if (error) throw error
      
      const uniqueUsers = Array.from(
        new Set(data?.map(item => `${item.packed_by_name}|${item.packed_by_email}`) || [])
      )
      
      setUsers(uniqueUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [supabase, organizationId])

  const fetchMetrics = useCallback(async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('daily_packing_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .order('packing_date', { ascending: false })
        .limit(30)
      
      if (selectedUser !== 'all') {
        const [name, email] = selectedUser.split('|')
        query = query.eq('packed_by_email', email)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setMetrics(data || [])
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedUser, organizationId])

  useEffect(() => {
    const loadOrganizationId = async () => {
      const orgId = await getCurrentUserOrganizationId()
      setOrganizationId(orgId)
    }
    loadOrganizationId()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])



  const calculateMetrics = () => {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const todayMetrics = metrics.filter(m => m.packing_date === today)
    const sevenDayMetrics = metrics.filter(m => m.packing_date >= sevenDaysAgo)
    const thirtyDayMetrics = metrics.filter(m => m.packing_date >= thirtyDaysAgo)
    
    const todayTotal = todayMetrics.reduce((sum, m) => sum + m.shipments_packed, 0)
    const sevenDayTotal = sevenDayMetrics.reduce((sum, m) => sum + m.shipments_packed, 0)
    const thirtyDayTotal = thirtyDayMetrics.reduce((sum, m) => sum + m.shipments_packed, 0)
    
    const avgPerDay = thirtyDayMetrics.length > 0 ? Math.round(thirtyDayTotal / thirtyDayMetrics.length) : 0
    
    return {
      today: todayTotal,
      sevenDays: sevenDayTotal,
      thirtyDays: thirtyDayTotal,
      avgPerDay
    }
  }

  const getUserComparison = () => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const userStats = new Map()
    
    metrics.forEach(metric => {
      const key = `${metric.packed_by_name}|${metric.packed_by_email}`
      const date = metric.packing_date
      
      if (!userStats.has(key)) {
        userStats.set(key, {
          name: metric.packed_by_name,
          today: 0,
          yesterday: 0,
          sevenDays: 0,
          thirtyDays: 0,
          sevenDaysDays: new Set(),
          thirtyDaysDays: new Set()
        })
      }
      
      const current = userStats.get(key)
      const packages = metric.shipments_packed
      
      if (date === today) current.today += packages
      if (date === yesterday) current.yesterday += packages
      if (date >= sevenDaysAgo) {
        current.sevenDays += packages
        current.sevenDaysDays.add(date)
      }
      if (date >= thirtyDaysAgo) {
        current.thirtyDays += packages
        current.thirtyDaysDays.add(date)
      }
    })
    
    return Array.from(userStats.values()).map(user => ({
      name: user.name,
      today: user.today,
      yesterday: user.yesterday,
      sevenDays: user.sevenDays,
      thirtyDays: user.thirtyDays,
      sevenDaysAvg: user.sevenDaysDays.size > 0 ? Math.round(user.sevenDays / user.sevenDaysDays.size) : 0,
      thirtyDaysAvg: user.thirtyDaysDays.size > 0 ? Math.round(user.thirtyDays / user.thirtyDaysDays.size) : 0
    })).sort((a, b) => b.thirtyDays - a.thirtyDays)
  }


  const getDailyData = () => {
    const dailyMap = new Map()
    
    // Initialize all days from today back to 29 days ago (30 days total including today)
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      dailyMap.set(dateString, { date: dateString, total: 0, users: new Set() })
    }
    
    // Fill in actual data
    metrics.forEach(metric => {
      const date = metric.packing_date
      if (dailyMap.has(date)) {
        const day = dailyMap.get(date)
        day.total += metric.shipments_packed
        day.users.add(metric.packed_by_name)
      }
    })
    
    return Array.from(dailyMap.values())
      .map(day => ({ ...day, userCount: day.users.size }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const stats = calculateMetrics()
  const userComparison = getUserComparison()
  const dailyData = getDailyData()

  return (
    <LayoutWrapper>
      <main className="container mx-auto p-4 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Métricas de Empaque</h2>
          
          {/* Menu Bar */}
          <div className="flex border-b mb-6">
            {[
              { id: 'totales', label: 'Totales' },
              { id: 'comparacion', label: 'Comparación' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-4 py-2 border-b-2 font-medium ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Totales View */}
          {activeView === 'totales' && (
            <div className="space-y-6">
              {loading ? (
                <Card className="bg-white">
                  <CardContent className="p-12">
                    <LoadingSpinner message="Cargando métricas..." />
                  </CardContent>
                </Card>
              ) : (
              <>
              <Card className="bg-white">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filtrar por usuario:</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {users.map((user) => {
                        const [name] = user.split('|')
                        return (
                          <SelectItem key={user} value={user}>
                            {name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="border bg-white">
                  <CardContent className="p-4">
                    {loading ? (
                      <div>Cargando...</div>
                    ) : (
                      <div className="grid grid-cols-4 text-center gap-4">
                        <div>
                          <div className="text-sm mb-1">Hoy</div>
                          <div className="text-2xl font-bold">{stats.today}</div>
                        </div>
                        <div>
                          <div className="text-sm mb-1">7 días</div>
                          <div className="text-2xl font-bold">{stats.sevenDays}</div>
                        </div>
                        <div>
                          <div className="text-sm mb-1">30 días</div>
                          <div className="text-2xl font-bold">{stats.thirtyDays}</div>
                        </div>
                        <div>
                          <div className="text-sm mb-1">Promedio/día</div>
                          <div className="text-2xl font-bold">{stats.avgPerDay}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Tendencia Diaria</h3>
                  <div className="relative flex">
                    {/* Y-axis */}
                    <div className="flex flex-col justify-between h-20 mr-2 text-xs text-gray-500 py-1">
                      {(() => {
                        const dailyDataSlice = dailyData.slice(0, 30)
                        const maxValue = dailyDataSlice.length > 0 ? Math.max(...dailyDataSlice.map(d => d.total)) : 0
                        
                        // Create nice round numbers for Y-axis
                        const getYAxisLabels = (max) => {
                          if (max === 0) return [0, 0, 0, 0, 0]
                          
                          // Find a nice round number that's >= max but not too much higher
                          const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
                          let niceMax
                          
                          if (max <= magnitude) niceMax = magnitude
                          else if (max <= 2 * magnitude) niceMax = 2 * magnitude
                          else if (max <= 5 * magnitude) niceMax = 5 * magnitude
                          else niceMax = 10 * magnitude
                          
                          // Don't let niceMax be more than 50% higher than actual max
                          if (niceMax > max * 1.5) {
                            niceMax = Math.ceil(max / 10) * 10
                            if (niceMax < max) niceMax = Math.ceil(max / 5) * 5
                            if (niceMax < max) niceMax = max
                          }
                          
                          return [niceMax, Math.round(niceMax * 0.75), Math.round(niceMax * 0.5), Math.round(niceMax * 0.25), 0]
                        }
                        
                        const yAxisLabels = getYAxisLabels(maxValue)
                        return yAxisLabels.map((value, index) => (
                          <div key={index} className="text-right pr-1">
                            {Math.round(value)}
                          </div>
                        ))
                      })()}
                    </div>
                    
                    {/* Chart area */}
                    <div className="flex-1">
                      <div className="h-20 flex items-end justify-between mb-2 relative">
                        {/* Horizontal grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="border-t border-gray-100 w-full" />
                          ))}
                        </div>
                        
                        {/* Bars */}
                        {dailyData.slice(0, 30).reverse().map((day) => {
                          const dailyDataSlice = dailyData.slice(0, 30)
                          const actualMaxValue = dailyDataSlice.length > 0 ? Math.max(...dailyDataSlice.map(d => d.total)) : 0
                          
                          // Use the same logic as Y-axis for consistent scaling
                          const getChartMax = (max) => {
                            if (max === 0) return 1
                            const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
                            let niceMax
                            if (max <= magnitude) niceMax = magnitude
                            else if (max <= 2 * magnitude) niceMax = 2 * magnitude
                            else if (max <= 5 * magnitude) niceMax = 5 * magnitude
                            else niceMax = 10 * magnitude
                            
                            // Don't let niceMax be more than 50% higher than actual max
                            if (niceMax > max * 1.5) {
                              niceMax = Math.ceil(max / 10) * 10
                              if (niceMax < max) niceMax = Math.ceil(max / 5) * 5
                              if (niceMax < max) niceMax = max
                            }
                            return niceMax
                          }
                          
                          const chartMaxValue = getChartMax(actualMaxValue)
                          const height = chartMaxValue > 0 ? (day.total / chartMaxValue) * 60 : 0
                          
                          return (
                            <div key={day.date} className="flex flex-col items-center flex-1 px-0.5 relative z-10 group">
                              <div 
                                className="bg-blue-500 w-full rounded-t transition-all duration-300 hover:bg-blue-600 relative"
                                style={{ height: `${isNaN(height) ? 0 : height}px` }}
                                title={`${new Date(day.date).toLocaleDateString('es-ES')}: ${day.total} paquetes`}
                              />
                              {/* Show number on hover */}
                              <div className="absolute -top-6 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                {day.total}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* X-axis with day labels */}
                      <div className="flex justify-between mt-1">
                        {dailyData.slice(0, 30).reverse().map((day, index) => {
                          const date = new Date(day.date + 'T12:00:00') // Add time to avoid timezone issues
                          const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
                          const spanishDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] // Sunday=0, Monday=1, etc.
                          const isToday = day.date === new Date().toISOString().split('T')[0]
                          return (
                            <div 
                              key={`label-${day.date}`} 
                              className={`flex-1 text-center text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
                              title={`${spanishDays[dayOfWeek]} - ${day.date}`}
                            >
                              {spanishDays[dayOfWeek]}
                              {/* Show date for debugging - remove this line later */}
                              <div className="text-[8px] mt-0.5">{day.date.slice(-2)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-4">
                    Últimos 30 días
                  </div>
                </CardContent>
              </Card>
              </>
              )}
            </div>
          )}

          {/* Comparación View */}
          {activeView === 'comparacion' && (
            <Card className="bg-white">
              <CardContent className="p-6">
                {loading ? (
                  <div className="py-12">
                    <LoadingSpinner message="Cargando comparación..." />
                  </div>
                ) : (
                  <>
                {/* Column Headers */}
                <div className="flex justify-between items-center p-3 border-b font-medium text-sm text-gray-600">
                  <div className="flex items-center space-x-3">
                    <span className="w-8"></span>
                    <div>Usuario</div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 w-80 text-center">
                    <div>Hoy</div>
                    <div>Ayer</div>
                    <div>7 días (avg/día)</div>
                    <div>30 días (avg/día)</div>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  {userComparison.map((user, index) => (
                    <div key={user.name} className="flex justify-between items-center p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                        <div className="font-medium">{user.name}</div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 w-80">
                        <div className="text-center">
                          <div className="font-bold">{user.today}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{user.yesterday}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{user.sevenDays}</div>
                          <div className="text-xs text-gray-500">({user.sevenDaysAvg}/día)</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">{user.thirtyDays}</div>
                          <div className="text-xs text-gray-500">({user.thirtyDaysAvg}/día)</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </LayoutWrapper>
  )
}