import { createClient } from '@/lib/supabase/client'

export interface PackingMetric {
  packing_date: string
  packed_by_name: string
  packed_by_email: string
  shipments_packed: number
  first_shipment_time: string
  last_shipment_time: string
  morning_shipments: number
  afternoon_shipments: number
}

export interface PeriodMetrics {
  totalPackages: number
  daysWorked: number
  avgPerDay: number
  periodDays: number
}

export const fetchPackingMetrics = async (userEmail: string): Promise<PackingMetric[]> => {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('daily_packing_metrics')
    .select('*')
    .eq('packed_by_email', userEmail)
    .order('packing_date', { ascending: false })
    .limit(30) // Get last 30 days max
  
  if (error) throw error
  return data || []
}

export const getMetricsForPeriod = (metrics: PackingMetric[], days: number): PeriodMetrics => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const filteredMetrics = metrics.filter(metric => {
    const metricDate = new Date(metric.packing_date)
    return metricDate >= cutoffDate
  })
  
  const totalPackages = filteredMetrics.reduce((sum, metric) => sum + metric.shipments_packed, 0)
  const daysWorked = filteredMetrics.length
  const avgPerDay = daysWorked > 0 ? Math.round(totalPackages / daysWorked) : 0
  
  return {
    totalPackages,
    daysWorked,
    avgPerDay,
    periodDays: days
  }
}