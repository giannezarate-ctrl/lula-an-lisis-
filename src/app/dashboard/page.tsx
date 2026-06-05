'use client'

import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase } from '@/lib/supabase'
import { Paciente } from '@/types/pacientes'
import { getRiesgoCalculado, suscribirCambioPacientes } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
  Users, AlertTriangle, Heart, Activity, Brain,
  TrendingUp, TrendingDown, ShieldAlert, Droplets, Wind,
  RefreshCw, Sparkles, Database, FileSpreadsheet, UserPlus, BarChart3,
  Stethoscope, ChevronRight, Calendar, Phone, Mail,
} from 'lucide-react'

const COLORS = { bajo: '#10b981', medio: '#f59e0b', alto: '#ef4444', critico: '#e11d48' }
const sexoColors = ['#7c3aed', '#a855f7']

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current) { setCount(value); return }
    counted.current = true
    const duration = 800, steps = 30, increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setCount(value); clearInterval(timer) } else setCount(Math.round(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <span>{count.toLocaleString()}{suffix}</span>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null
  return (
    <div className="custom-tooltip p-3">
      {label && <p className="text-xs text-[#8888a0] mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>{entry.name}: {entry.value?.toLocaleString()}</p>
      ))}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-[#2a2a45]/20">
      <div className="flex items-center justify-between mb-3"><div className="skeleton h-4 w-24" /><div className="skeleton h-5 w-5 rounded-lg" /></div>
      <div className="skeleton h-9 w-20 mt-2" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/20">
      <div className="skeleton h-5 w-48 mb-5" /><div className="skeleton h-[280px] w-full rounded-xl" />
    </div>
  )
}

export default function DashboardPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'metricas' | 'seguimientos'>('metricas')
  const [stats, setStats] = useState({
    total: 0, criticos: 0, riesgoBajo: 0, riesgoMedio: 0,
    riesgoAlto: 0, riesgoCritico: 0, imcPromedio: 0, edadPromedio: 0,
    hipertensos: 0, diabeticos: 0, fumadores: 0, etlEjecutados: 0,
  })

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    const unsub = suscribirCambioPacientes(() => cargarDatos())
    const handleFocus = () => cargarDatos()
    window.addEventListener('focus', handleFocus)
    return () => { unsub(); window.removeEventListener('focus', handleFocus) }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => { cargarDatos() })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [])

  async function cargarDatos() {
    if (pacientes.length > 0) setRefreshing(true); else setLoading(true)
    try {
      const response = await fetch('/api/pacientes', { cache: 'no-store' })
      const json = await response.json()
      const data: Paciente[] = json.ok ? (json.pacientes || []) : []

      const pConRiesgoReal = data.map(x => ({
        ...x,
        riesgo_calculado: getRiesgoCalculado(x) as 'Bajo' | 'Medio' | 'Alto' | 'Critico',
      }))

      setPacientes(pConRiesgoReal)
      const t = pConRiesgoReal.length
      const criticos = pConRiesgoReal.filter(x => x.riesgo_calculado === 'Critico').length
      const altos = pConRiesgoReal.filter(x => x.riesgo_calculado === 'Alto').length
      const medios = pConRiesgoReal.filter(x => x.riesgo_calculado === 'Medio').length
      const bajos = pConRiesgoReal.filter(x => x.riesgo_calculado === 'Bajo').length

      setStats({
        total: t, criticos,
        riesgoBajo: bajos, riesgoMedio: medios, riesgoAlto: altos, riesgoCritico: criticos,
        imcPromedio: t > 0 ? Math.round(pConRiesgoReal.reduce((s, x) => s + x.imc, 0) / t * 10) / 10 : 0,
        edadPromedio: t > 0 ? Math.round(pConRiesgoReal.reduce((s, x) => s + x.edad, 0) / t * 10) / 10 : 0,
        hipertensos: pConRiesgoReal.filter(x => x.presion_sistolica >= 140 || x.presion_diastolica >= 90).length,
        diabeticos: pConRiesgoReal.filter(x => x.glucosa > 126).length,
        fumadores: pConRiesgoReal.filter(x => x.fumador).length, etlEjecutados: 0,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const pacientesConRiesgo = pacientes.map(p => ({
    ...p,
    riesgo_calculado: (p.riesgo_calculado || getRiesgoCalculado(p)) as 'Bajo' | 'Medio' | 'Alto' | 'Critico',
  }))

  const riesgoDist = [
    { name: 'Bajo', value: pacientesConRiesgo.filter(x => x.riesgo_calculado === 'Bajo').length, color: COLORS.bajo },
    { name: 'Medio', value: pacientesConRiesgo.filter(x => x.riesgo_calculado === 'Medio').length, color: COLORS.medio },
    { name: 'Alto', value: pacientesConRiesgo.filter(x => x.riesgo_calculado === 'Alto').length, color: COLORS.alto },
    { name: 'Critico', value: pacientesConRiesgo.filter(x => x.riesgo_calculado === 'Critico').length, color: COLORS.critico },
  ]

  const sexoDist = [
    { name: 'Masculino', value: pacientesConRiesgo.filter(p => p.sexo === 'Masculino').length },
    { name: 'Femenino', value: pacientesConRiesgo.filter(p => p.sexo === 'Femenino').length },
  ]

  const edadRangos = [
    { name: '0-18', value: pacientesConRiesgo.filter(p => p.edad <= 18).length },
    { name: '19-30', value: pacientesConRiesgo.filter(p => p.edad > 18 && p.edad <= 30).length },
    { name: '31-45', value: pacientesConRiesgo.filter(p => p.edad > 30 && p.edad <= 45).length },
    { name: '46-60', value: pacientesConRiesgo.filter(p => p.edad > 45 && p.edad <= 60).length },
    { name: '61+', value: pacientesConRiesgo.filter(p => p.edad > 60).length },
  ]

  const diagMap = new Map<string, number>()
  pacientesConRiesgo.forEach(p => diagMap.set(p.diagnostico_preliminar, (diagMap.get(p.diagnostico_preliminar) || 0) + 1))
  const diagDist = Array.from(diagMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 8)

  const sortedByDate = [...pacientesConRiesgo].sort((a, b) => new Date(a.fecha_consulta).getTime() - new Date(b.fecha_consulta).getTime())
  const fechaCount = new Map<string, number>()
  sortedByDate.forEach(p => { if (p.riesgo_calculado === 'Critico') fechaCount.set(p.fecha_consulta, (fechaCount.get(p.fecha_consulta) || 0) + 1) })
  const tendenciaCriticos = Array.from(fechaCount.entries()).map(([fecha, c]) => ({
    fecha: new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), criticos: c,
  }))

  const evolucionGlucosa = sortedByDate.slice(-20).map(p => ({
    fecha: new Date(p.fecha_consulta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), glucosa: p.glucosa,
  }))

  const evolucionPA = sortedByDate.slice(-20).map(p => ({
    fecha: new Date(p.fecha_consulta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    sistolica: p.presion_sistolica, diastolica: p.presion_diastolica,
  }))

  const statCards = [
    { label: 'Total Pacientes', value: stats.total, icon: Users, color: 'from-purple-600/20 to-purple-800/10', border: 'border-purple-500/25', textColor: 'text-purple-400', delay: '0ms' },
    { label: 'Críticos', value: stats.criticos, icon: AlertTriangle, color: 'from-red-600/20 to-red-800/10', border: 'border-red-500/25', textColor: 'text-red-400', delay: '40ms' },
    { label: 'Riesgo Bajo', value: stats.riesgoBajo, icon: ShieldAlert, color: 'from-emerald-600/20 to-emerald-800/10', border: 'border-emerald-500/25', textColor: 'text-emerald-400', delay: '80ms' },
    { label: 'Riesgo Medio', value: stats.riesgoMedio, icon: Activity, color: 'from-amber-600/20 to-amber-800/10', border: 'border-amber-500/25', textColor: 'text-amber-400', delay: '120ms' },
    { label: 'Riesgo Alto', value: stats.riesgoAlto, icon: TrendingUp, color: 'from-orange-600/20 to-orange-800/10', border: 'border-orange-500/25', textColor: 'text-orange-400', delay: '160ms' },
    { label: 'Riesgo Crítico', value: stats.riesgoCritico, icon: TrendingDown, color: 'from-rose-600/20 to-rose-800/10', border: 'border-rose-500/25', textColor: 'text-rose-400', delay: '200ms' },
    { label: 'IMC Promedio', value: stats.imcPromedio, icon: Heart, color: 'from-violet-600/20 to-violet-800/10', border: 'border-violet-500/25', textColor: 'text-violet-400', suffix: '', delay: '240ms' },
    { label: 'Edad Promedio', value: stats.edadPromedio, icon: Users, color: 'from-blue-600/20 to-blue-800/10', border: 'border-blue-500/25', textColor: 'text-blue-400', suffix: ' años', delay: '280ms' },
    { label: 'Hipertensos', value: stats.hipertensos, icon: Droplets, color: 'from-red-600/20 to-red-800/10', border: 'border-red-500/25', textColor: 'text-red-400', delay: '320ms' },
    { label: 'Diabéticos', value: stats.diabeticos, icon: Wind, color: 'from-amber-600/20 to-amber-800/10', border: 'border-amber-500/25', textColor: 'text-amber-400', delay: '360ms' },
    { label: 'Fumadores', value: stats.fumadores, icon: Brain, color: 'from-gray-600/20 to-gray-800/10', border: 'border-gray-500/25', textColor: 'text-gray-400', delay: '400ms' },
    { label: 'Procesos ETL', value: stats.etlEjecutados, icon: Activity, color: 'from-purple-600/20 to-purple-800/10', border: 'border-purple-500/25', textColor: 'text-purple-400', delay: '440ms' },
  ]

  if (loading) return (
    <AppLayout>
      <div className="w-full space-y-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
          {Array.from({ length: 12 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </div>
    </AppLayout>
  )

  if (pacientes.length === 0) return (
    <AppLayout>
      <div className="w-full space-y-8 relative z-10">
        <div className="animate-slide-left">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Análisis</h1>
              <p className="text-[#8888a0] text-base mt-1">Panel de control y métricas clínicas</p>
            </div>
          </div>
        </div>
        <EmptyState
          icon={Sparkles}
          title="Bienvenido a LULA ANÁLISIS"
          description="Cargue pacientes para visualizar métricas, alertas críticas, distribuciones de riesgo y predicciones inteligentes en tiempo real."
          badge={{ label: 'Sin datos aún', icon: Database }}
          variant="default"
          size="lg"
          primaryAction={{
            label: 'Cargar Datos',
            icon: FileSpreadsheet,
            onClick: () => window.location.href = '/etl',
          }}
          secondaryAction={{
            label: 'Agregar Paciente',
            icon: UserPlus,
            onClick: () => window.location.href = '/pacientes',
          }}
          metrics={[
            { label: 'Total Pacientes', value: 0, icon: Users, variant: 'default' },
            { label: 'Alertas Activas', value: 0, icon: AlertTriangle, variant: 'error' },
            { label: 'Riesgo Crítico', value: 0, icon: ShieldAlert, variant: 'error' },
            { label: 'Análisis IA', value: 0, icon: Brain, variant: 'purple' },
          ]}
          footerInfo={[
            { label: 'Estado:', value: 'Esperando datos', icon: Activity },
            { label: 'Última actualización:', value: '—', icon: RefreshCw },
          ]}
        />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="w-full space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="animate-slide-left">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20 border-gradient-flow">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Análisis Clínico</h1>
              <p className="text-[#8888a0] text-base mt-1">
                Monitorización clínica en tiempo real
                <span className="text-purple-400/60 ml-2">• {pacientes.length} registros</span>
              </p>
            </div>
            </div>
          </div>
          <button onClick={cargarDatos} disabled={refreshing}
            className="glass-button px-6 py-3 rounded-xl text-base flex items-center gap-2.5">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label}
                className={`glass-card rounded-2xl p-5 border ${card.border} bg-gradient-to-br ${card.color} glass-card-hover stat-card animate-slide-in`}
                style={{ animationDelay: card.delay }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#8888a0] uppercase tracking-widest">{card.label}</span>
                  <Icon className={`w-5 h-5 ${card.textColor} opacity-70`} />
                </div>
                <p className={`text-2xl md:text-3xl font-bold ${card.textColor} number-glow`}>
                  <AnimatedCounter value={card.value} suffix={card.suffix || ''} />
                </p>
                <div className={`stat-bar mt-3 ${card.textColor}`} />
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '100ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Distribución por Riesgo
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={riesgoDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} stroke="none">
                {riesgoDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie><Tooltip content={<CustomTooltip />} /></PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {riesgoDist.map(item => (
                <div key={item.name} className="flex items-center gap-2.5 text-sm text-[#8888a0] bg-[#1a1a2e]/40 rounded-xl px-3 py-2 border border-[#2a2a45]/20 hover:border-purple-500/20 transition-all">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}40` }} />
                  <span className="flex-1">{item.name}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '150ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Distribución por Sexo
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={sexoDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} stroke="none">
                {sexoDist.map((_, i) => <Cell key={i} fill={sexoColors[i]} />)}
              </Pie><Tooltip content={<CustomTooltip />} /></PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {sexoDist.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2.5 text-sm text-[#8888a0] bg-[#1a1a2e]/40 rounded-xl px-4 py-2 border border-[#2a2a45]/20 hover:border-purple-500/20 transition-all">
                  <span className="w-3 h-3 rounded-full" style={{ background: sexoColors[i], boxShadow: `0 0 6px ${sexoColors[i]}40` }} />
                  <span>{item.name}: <span className="font-semibold text-white">{item.value}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '200ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Distribución por Edad
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={edadRangos} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
                <XAxis dataKey="name" stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '250ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Distribución por Diagnóstico
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={diagDist} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" horizontal={false} />
                <XAxis type="number" stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#8888a0" fontSize={9} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Bar dataKey="value" fill="#a855f7" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '300ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Tendencia Críticos
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={tendenciaCriticos} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs><linearGradient id="colorCriticos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} /><stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
                <XAxis dataKey="fecha" stroke="#8888a0" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="criticos" stroke="#e11d48" strokeWidth={2.5} fill="url(#colorCriticos)"
                  dot={{ r: 3, fill: '#e11d48', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '350ms' }}>
            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
              Evolución Glucosa
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolucionGlucosa} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
                <XAxis dataKey="fecha" stroke="#8888a0" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <defs><linearGradient id="glucosaGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a855f7" />
                </linearGradient></defs>
                <Line type="monotone" dataKey="glucosa" stroke="url(#glucosaGradient)" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/35 animate-slide-in hover-lift" style={{ animationDelay: '400ms' }}>
          <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
            Evolución de Presión Arterial
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={evolucionPA} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
              <XAxis dataKey="fecha" stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#8888a0" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sistolica" stroke="#7c3aed" strokeWidth={2.5} name="Sistólica"
                dot={false} activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="diastolica" stroke="#a855f7" strokeWidth={2.5} name="Diastólica"
                dot={false} activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl border border-[#2a2a45]/40 overflow-hidden animate-slide-in" style={{ animationDelay: '450ms' }}>
          <div className="flex border-b border-[#2a2a45]/40 bg-gradient-to-r from-[#0e0e1a] to-[#12121f]">
            <button
              onClick={() => setTab('metricas')}
              className={`flex-1 px-6 py-4 text-sm font-semibold flex items-center justify-center gap-2.5 transition-all relative ${
                tab === 'metricas' ? 'text-purple-300 bg-purple-600/10' : 'text-[#8888a0] hover:text-purple-300 hover:bg-purple-600/5'
              }`}
            >
              <Activity size={16} />
              Métricas Clínicas
              {tab === 'metricas' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-400" />}
            </button>
            <button
              onClick={() => setTab('seguimientos')}
              className={`flex-1 px-6 py-4 text-sm font-semibold flex items-center justify-center gap-2.5 transition-all relative ${
                tab === 'seguimientos' ? 'text-rose-300 bg-rose-600/10' : 'text-[#8888a0] hover:text-rose-300 hover:bg-rose-600/5'
              }`}
            >
              <Stethoscope size={16} />
              Seguimientos Críticos
              {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').length}
                </span>
              )}
              {tab === 'seguimientos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-red-400" />}
            </button>
          </div>

          {tab === 'seguimientos' && (
            <div className="p-6">
              {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-9 h-9 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No hay pacientes en seguimiento crítico</h3>
                  <p className="text-sm text-[#8888a0]">Todos los pacientes se encuentran fuera del nivel de riesgo crítico.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').slice(0, 3).map((p, idx) => (
                    <div key={p.id_paciente}
                      className="glass-card rounded-2xl p-5 border border-rose-500/25 bg-gradient-to-br from-rose-900/15 to-red-900/5 hover-lift animate-fade-in relative overflow-hidden"
                      style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-rose-500/30">
                              {p.nombres.charAt(0)}{p.apellidos.charAt(0)}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-white">{p.nombres} {p.apellidos}</p>
                              <p className="text-xs text-[#8888a0] font-mono">ID: #{p.id_paciente} · {p.edad} años · {p.sexo}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Crítico
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-[#0e0e1a]/60 rounded-lg p-2.5 border border-[#2a2a45]/30">
                            <p className="text-[10px] text-[#666680] uppercase tracking-wider mb-0.5">PA</p>
                            <p className="text-sm font-bold text-white">{p.presion_sistolica}/{p.presion_diastolica}</p>
                          </div>
                          <div className="bg-[#0e0e1a]/60 rounded-lg p-2.5 border border-[#2a2a45]/30">
                            <p className="text-[10px] text-[#666680] uppercase tracking-wider mb-0.5">Glucosa</p>
                            <p className="text-sm font-bold text-white">{p.glucosa}</p>
                          </div>
                          <div className="bg-[#0e0e1a]/60 rounded-lg p-2.5 border border-[#2a2a45]/30">
                            <p className="text-[10px] text-[#666680] uppercase tracking-wider mb-0.5">IMC</p>
                            <p className="text-sm font-bold text-white">{p.imc.toFixed(1)}</p>
                          </div>
                        </div>

                        <div className="bg-[#0e0e1a]/40 rounded-lg p-3 border border-rose-500/15 mb-3">
                          <p className="text-[10px] text-rose-300 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                            <Stethoscope size={11} />
                            Diagnóstico Preliminar
                          </p>
                          <p className="text-sm text-white">{p.diagnostico_preliminar}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-rose-500/15">
                          <p className="text-[11px] text-[#8888a0] flex items-center gap-1.5">
                            <Calendar size={11} />
                            {new Date(p.fecha_consulta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <a href="/pacientes"
                            className="text-xs font-medium text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-all hover:gap-2">
                            Ver seguimiento <ChevronRight size={12} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').length > 3 && (
                <div className="mt-5 text-center">
                  <a href="/pacientes?filtro=critico"
                    className="inline-flex items-center gap-2 text-sm text-rose-300 hover:text-rose-200 transition-all hover:gap-3">
                    Ver los {pacientesConRiesgo.filter(p => p.riesgo_calculado === 'Critico').length} pacientes críticos
                    <ChevronRight size={14} />
                  </a>
                </div>
              )}
            </div>
          )}

          {tab === 'metricas' && (
            <div className="p-6">
              <p className="text-sm text-[#8888a0] text-center py-8">
                Las métricas se muestran en la parte superior del panel. Esta pestaña se reserva para los seguimientos críticos.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
