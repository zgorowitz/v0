'use client'
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
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

interface OrgUser {
  id: string
  user_id: string
  role: string
  invited_at: string
  joined_at: string | null
  user_email?: string
}

interface AllowedEmail {
  id: string
  organization_id: string
  email: string
  role: string
  added_by: string
  added_at: string
}


export default function MetricsPage() {
  const [users, setUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [metrics, setMetrics] = useState<UserMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [orgLoading, setOrgLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [allowedEmailsLoading, setAllowedEmailsLoading] = useState(false)
  const [deletingAllowed, setDeletingAllowed] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'totales' | 'comparacion'>('totales')
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_packing_metrics')
        .select('packed_by_name, packed_by_email')
        .order('packed_by_name')
      
      if (error) throw error
      
      const uniqueUsers = Array.from(
        new Set(data?.map(item => `${item.packed_by_name}|${item.packed_by_email}`) || [])
      )
      
      setUsers(uniqueUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [supabase])

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('daily_packing_metrics')
        .select('*')
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
  }, [supabase, selectedUser])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const fetchOrgUsers = useCallback(async () => {
    setOrgLoading(true)
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        console.warn('No organization found for current user')
        setOrgUsers([])
        return
      }

      const { data, error } = await supabase
        .from('organization_users_with_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('invited_at', { ascending: false })
      
      if (error) throw error
      setOrgUsers(data || [])
    } catch (error) {
      console.error('Error fetching organization users:', error)
    } finally {
      setOrgLoading(false)
    }
  }, [supabase])

  const addEmailToOrg = async () => {
    if (!newEmail.trim()) return
    
    setAddingEmail(true)
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) throw new Error('No authenticated user')

      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) throw new Error('No organization found for current user')

      const { error } = await supabase
        .from('allowed_emails')
        .insert({
          organization_id: organizationId,
          email: newEmail.trim().toLowerCase(),
          role: 'manager',
          added_by: currentUser.user.id
        })
      
      if (error) throw error
      
      setNewEmail('')
      fetchOrgUsers()
      fetchAllowedEmails()
    } catch (error) {
      console.error('Error adding email:', error)
    } finally {
      setAddingEmail(false)
    }
  }

  const deleteOrgUser = async (userId: string) => {
    setDeletingUser(userId)
    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      
      fetchOrgUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setDeletingUser(null)
    }
  }

  const fetchAllowedEmails = useCallback(async () => {
    setAllowedEmailsLoading(true)
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        setAllowedEmails([])
        return
      }

      const { data, error } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('added_at', { ascending: false })
      
      if (error) throw error
      setAllowedEmails(data || [])
    } catch (error) {
      console.error('Error fetching allowed emails:', error)
    } finally {
      setAllowedEmailsLoading(false)
    }
  }, [supabase])

  const deleteAllowedEmail = async (emailId: string) => {
    setDeletingAllowed(emailId)
    try {
      const { error } = await supabase
        .from('allowed_emails')
        .delete()
        .eq('id', emailId)
      
      if (error) throw error
      
      fetchAllowedEmails()
    } catch (error) {
      console.error('Error deleting allowed email:', error)
    } finally {
      setDeletingAllowed(null)
    }
  }


  useEffect(() => {
    fetchOrgUsers()
    fetchAllowedEmails()
  }, [fetchOrgUsers, fetchAllowedEmails])

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
    
    metrics.forEach(metric => {
      const date = metric.packing_date
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, total: 0, users: new Set() })
      }
      const day = dailyMap.get(date)
      day.total += metric.shipments_packed
      day.users.add(metric.packed_by_name)
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
                        const maxValue = Math.max(...dailyData.slice(0, 30).map(d => d.total))
                        const yAxisLabels = []
                        for (let i = 4; i >= 0; i--) {
                          yAxisLabels.push(Math.round((maxValue * i) / 4))
                        }
                        return yAxisLabels.map((value, index) => (
                          <div key={index} className="text-right pr-1">
                            {value}
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
                          const maxValue = Math.max(...dailyData.slice(0, 30).map(d => d.total))
                          const height = maxValue > 0 ? (day.total / maxValue) * 60 : 0
                          
                          return (
                            <div key={day.date} className="flex flex-col items-center flex-1 px-0.5 relative z-10">
                              <div 
                                className="bg-blue-500 w-full rounded-t transition-all duration-300 hover:bg-blue-600"
                                style={{ height: `${height}px` }}
                                title={`${new Date(day.date).toLocaleDateString('es-ES')}: ${day.total} paquetes`}
                              />
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
            </div>
          )}

          {/* Comparación View */}
          {activeView === 'comparacion' && (
            <Card className="bg-white">
              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          )}

        </div>

        <div className="border-t my-8"></div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Usuarios de la Organización</h2>
          <Card className="bg-white">
            <CardContent className="space-y-4 p-6">
                {orgLoading ? (
                  <div>Cargando usuarios...</div>
                ) : (
                  <div className="space-y-2">
                    {orgUsers.length === 0 ? (
                      <div className="text-gray-500">No hay usuarios en la organización</div>
                    ) : (
                      orgUsers.map((user) => (
                        <div key={user.id} className="flex justify-between items-center p-2 border rounded">
                          <div className="text-sm">
                            <div>{user.user_email || 'Email no disponible'}</div>
                            <div className="text-gray-500 text-xs">
                              Rol: {user.role} | Invitado: {new Date(user.invited_at).toLocaleDateString()}
                              {user.joined_at && ` | Unido: ${new Date(user.joined_at).toLocaleDateString()}`}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteOrgUser(user.id)}
                            disabled={deletingUser === user.id}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Agregar nuevo usuario</div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Ingrese email del usuario"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={addEmailToOrg}
                      disabled={addingEmail || !newEmail.trim()}
                    >
                      {addingEmail ? 'Agregando...' : 'Agregar'}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Usuarios Pendientes</div>
                  {allowedEmailsLoading ? (
                    <div className="text-gray-500 text-sm">Cargando emails pendientes...</div>
                  ) : allowedEmails.length === 0 ? (
                    <div className="text-gray-500 text-sm">No hay emails pendientes</div>
                  ) : (
                    <div className="space-y-2">
                      {allowedEmails.map((email) => (
                        <div key={email.id} className="flex justify-between items-center p-2 border rounded bg-yellow-50">
                          <div className="text-sm">
                            <div>{email.email}</div>
                            <div className="text-gray-500 text-xs">
                              Rol: {email.role} | Agregado: {new Date(email.added_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => deleteAllowedEmail(email.id)}
                            disabled={deletingAllowed === email.id}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </LayoutWrapper>
  )
}