'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { Paciente } from '@/types/pacientes'
import { getRiesgoColor, calcularRiesgo, suscribirCambioPacientes } from '@/lib/utils'
import {
  AlertTriangle, Heart, Droplets, Wind, Thermometer,
  Activity, FileText, Clock, CheckCircle, Sparkles,
  Zap, Shield, Users, Plus, Bell, Database, FileSpreadsheet,
} from 'lucide-react'
import jsPDF from 'jspdf'

interface Alerta {
  paciente: Paciente
  motivo: string
  detallesClinicos: string[]
  score: number
  icono: typeof AlertTriangle
  severidad: 'critica' | 'alta' | 'media'
}

const severityConfig = {
  critica: { label: 'Crítica', color: 'bg-red-500/15 text-red-300 border-red-500/25' },
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarAlertas() }, [])

  useEffect(() => {
    const unsub = suscribirCambioPacientes(() => cargarAlertas())
    const handleFocus = () => cargarAlertas()
    window.addEventListener('focus', handleFocus)
    return () => { unsub(); window.removeEventListener('focus', handleFocus) }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client
      .channel('alertas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => { cargarAlertas() })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [])

  function detectarAlertas(pacientes: Paciente[]): Alerta[] {
    const alertas: Alerta[] = []

    const iconoPorDetalle: Record<string, typeof AlertTriangle> = {
      'Crisis HTA': Heart,
      'HTA severa': Heart,
      'Glucosa crítica': Droplets,
      'Hipoxemia severa': Wind,
      'Hipoxemia': Wind,
      'Temp crítica': Thermometer,
      'FC anormal': Activity,
      'Obesidad III': Activity,
      'Obesidad II': Activity,
      'Colesterol crítico': AlertTriangle,
    }

    const iconoDefault = AlertTriangle

    pacientes.forEach(p => {
      const evaluacion = calcularRiesgo(p)
      const detalles = evaluacion.detalles

      if (detalles.length === 0) return

      const principales = detalles.slice(0, 3)
      const motivo = principales.join(' • ')

      let icono: typeof AlertTriangle = iconoDefault
      for (const d of principales) {
        const key = d.split(' (')[0]
        if (iconoPorDetalle[key]) { icono = iconoPorDetalle[key]; break }
      }

      alertas.push({
        paciente: p,
        motivo,
        detallesClinicos: detalles,
        score: evaluacion.score,
        icono,
        severidad: 'critica',
      })
    })

    return alertas.sort((a, b) => b.score - a.score)
  }

  async function cargarAlertas() {
    setLoading(true)
    try {
      const response = await fetch('/api/pacientes?all=true', { cache: 'no-store' })
      const json = await response.json()
      const data: Paciente[] = json.ok ? (json.pacientes || []) : []

      const criticos = data.filter(p => {
        const nivel = (p.riesgo_enfermedad as any)?.nivel || p.riesgo_enfermedad || calcularRiesgo(p).nivel
        return nivel === 'Critico'
      })
      setAlertas(detectarAlertas(criticos))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function generarReporte() {
    const doc = new jsPDF()
    const pw = doc.internal.pageSize.getWidth()
    doc.setFillColor(10, 10, 18)
    doc.rect(0, 0, pw, 45, 'F')
    doc.setFontSize(18)
    doc.setTextColor(168, 85, 247)
    doc.text('LULA ANALISIS', 14, 20)
    doc.setFontSize(8)
    doc.setTextColor(136, 136, 160)
    doc.text(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), pw - 14, 20, { align: 'right' })
    doc.setFontSize(11)
    doc.setTextColor(239, 68, 68)
    doc.text('Reporte de Pacientes en Estado Critico', 14, 32)
    let y = 55
    alertas.forEach((alerta) => {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFillColor(239, 68, 68)
      doc.roundedRect(14, y, pw - 28, 30, 3, 3, 'FD')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text(`${alerta.paciente.nombres} ${alerta.paciente.apellidos}`, 20, y + 8)
      doc.text(`Score: ${alerta.score}`, pw - 20, y + 8, { align: 'right' })
      doc.setFontSize(7)
      doc.setTextColor(255, 220, 220)
      const factores = alerta.detallesClinicos.slice(0, 4).join(' | ')
      doc.text(factores, 20, y + 16, { maxWidth: pw - 40 })
      doc.setTextColor(200, 200, 220)
      doc.text(`ID #${alerta.paciente.id_paciente} • ${alerta.paciente.edad}a ${alerta.paciente.sexo} • PA ${alerta.paciente.presion_sistolica}/${alerta.paciente.presion_diastolica} • Glu ${alerta.paciente.glucosa}`, 20, y + 24)
      y += 34
    })
    doc.setFillColor(10, 10, 18)
    doc.rect(0, doc.internal.pageSize.getHeight() - 15, pw, 15, 'F')
    doc.setFontSize(7)
    doc.setTextColor(102, 102, 128)
    doc.text(`Total pacientes criticos: ${alertas.length} | ${new Date().toLocaleString('es-ES')}`, pw / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
    doc.save(`pacientes-criticos-${Date.now()}.pdf`)
  }

  return (
    <AppLayout>
      <div className="w-full space-y-7 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#2a2a45]/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Pacientes en Estado Crítico</h1>
              <p className="text-[#8888a0] text-sm mt-0.5">
                Monitoreo clínico en tiempo real
                {!loading && alertas.length > 0
                  ? <span className="ml-2 text-red-400/80 font-medium">· {alertas.length} paciente{alertas.length === 1 ? '' : 's'} en estado crítico</span>
                  : !loading && <span className="ml-2 text-emerald-400/80 font-medium">· Sin pacientes críticos</span>
                }
              </p>
            </div>
          </div>
          {alertas.length > 0 && (
            <button onClick={generarReporte}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-200">
              <FileText size={16} />Reporte PDF
            </button>
          )}
        </div>

        {loading ? (
          <div className="w-full space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 border border-[#2a2a45]/20">
                <div className="flex gap-5">
                  <div className="skeleton w-14 h-14 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="skeleton h-6 w-56" /><div className="skeleton h-5 w-full" /><div className="skeleton h-4 w-40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alertas.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Sin pacientes en estado crítico"
            description="No hay pacientes con riesgo clínico calculado como Crítico. Todos se encuentran fuera del nivel crítico de alerta."
            badge={{ label: 'Sin alertas críticas', icon: CheckCircle }}
            variant="success"
            size="lg"
            primaryAction={{
              label: 'Agregar Pacientes',
              icon: Plus,
              onClick: () => window.location.href = '/pacientes',
            }}
            secondaryAction={{
              label: 'Cargar Datos',
              icon: FileSpreadsheet,
              onClick: () => window.location.href = '/etl',
            }}
            metrics={[
              { label: 'Pacientes Críticos', value: 0, icon: Shield, variant: 'success' },
              { label: 'Total Monitoreados', value: 0, icon: Users, variant: 'purple' },
              { label: 'Última Verificación', value: 'Ahora', icon: CheckCircle, variant: 'success' },
            ]}
            footerInfo={[
              { label: 'Sistema de monitoreo activo' },
              { label: 'Última verificación:', value: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), icon: Clock },
              { label: '0 pacientes críticos', icon: Users },
            ]}
          />
        ) : (
          <div className="w-full space-y-5">
            <div className="flex items-center gap-4 animate-fade-in glass-card rounded-2xl px-6 py-4 border border-[#2a2a45]/30">
              <Zap className="w-5 h-5 text-red-400" />
              <span className="text-sm text-[#8888a0]">Resumen:</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-red-500/15 text-red-300 border-red-500/25">
                Críticos: {alertas.length}
              </span>
              <span className="text-xs text-[#666680] ml-auto">
                Pacientes con riesgo clínico calculado como Crítico
              </span>
            </div>

            <div className="w-full grid grid-cols-1 gap-5">
              {alertas.map((alerta, i) => {
                const Icon = alerta.icono
                const isCritica = alerta.severidad === 'critica'
                return (
                  <div key={`${alerta.paciente.id_paciente}-${i}`}
                    className={`rounded-xl p-5 border bg-[#0e0e1a]/50 hover:border-red-500/40 transition-all duration-300 animate-fade-in ${
                      isCritica ? 'border-red-500/25' : 'border-amber-500/20'
                    }`}
                    style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        isCritica ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-white">
                              {alerta.paciente.nombres} {alerta.paciente.apellidos}
                            </h3>
                            <p className="text-xs text-[#8888a0] mt-0.5 font-mono">
                              ID #{alerta.paciente.id_paciente} · {alerta.paciente.edad} años · {alerta.paciente.sexo}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-red-500/15 text-red-300 border-red-500/25 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              Crítico
                            </span>
                            <div className="text-right">
                              <p className="text-[9px] text-[#666680] uppercase tracking-wider">Score</p>
                              <p className="text-base font-bold text-red-300">{alerta.score}</p>
                            </div>
                          </div>
                        </div>
                        <div className={`mt-4 p-3.5 rounded-lg border ${
                          isCritica
                            ? 'bg-red-500/5 border-red-500/15'
                            : 'bg-amber-500/5 border-amber-500/15'
                        }`}>
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCritica ? 'text-red-400' : 'text-amber-400'}`} />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#8888a0] font-semibold mb-2">Factores críticos</p>
                              <div className="flex flex-wrap gap-1.5">
                                {alerta.detallesClinicos.map((d, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.04] text-[#d0d0e0] border border-[#2a2a45]/40">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#8888a0]">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />{alerta.paciente.fecha_consulta}
                          </span>
                          <span className="text-[#3a3a55]">·</span>
                          <span>PA: <span className="text-white font-medium">{alerta.paciente.presion_sistolica}/{alerta.paciente.presion_diastolica}</span></span>
                          <span className="text-[#3a3a55]">·</span>
                          <span>Glucosa: <span className="text-white font-medium">{alerta.paciente.glucosa}</span></span>
                          <span className="text-[#3a3a55]">·</span>
                          <span>SpO2: <span className="text-white font-medium">{alerta.paciente.saturacion_oxigeno}%</span></span>
                          <span className="text-[#3a3a55]">·</span>
                          <span>IMC: <span className="text-white font-medium">{alerta.paciente.imc}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
