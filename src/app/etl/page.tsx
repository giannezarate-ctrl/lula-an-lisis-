'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertCircle, Database, Clock, BarChart3,
  Trash2, History, RefreshCw,
  ArrowRight, Loader2, Sparkles, Download,
  Users, Heart, FileText,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface ETLResumen {
  antes: { total: number; nulos: number; duplicados: number; inconsistencias: number; columnasDetectadas?: string[] }
  despues: { validos: number; duplicadosEliminados: number; corregidos: number; calidad: number; criticos: number }
  registrosProcesados: number; tiempoEjecucion: number; errores: string[]
  tipo: string | null; archivo: string
}

interface ETLLog {
  id: number; fecha_ejecucion: string; archivo_nombre: string
  total_registros: number; registros_validos: number
  duplicados_eliminados: number; nulos_corregidos: number
  inconsistencias: number; calidad_pct: number
  tiempo_ejecucion: number; errores: string[]
}

type EstadoProceso = 'idle' | 'subiendo' | 'procesando' | 'insertando' | 'completado' | 'error'

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#0e0e1a]/50 rounded-lg p-4 border border-[#2a2a45]/30 text-center hover:border-purple-500/30 transition-colors">
      <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-[#8888a0] mt-1 font-medium">{label}</p>
    </div>
  )
}

const COLUMNAS_TEMPLATE = [
  'id_paciente', 'nombres', 'apellidos', 'edad', 'sexo', 'peso', 'altura',
  'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'glucosa', 'colesterol',
  'saturacion_oxigeno', 'temperatura', 'antecedentes_familiares', 'fumador', 'consumo_alcohol',
  'actividad_fisica', 'diagnostico_preliminar', 'fecha_consulta',
]

export default function ETLPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null)
  const [limpiando, setLimpiando] = useState(false)
  const [estado, setEstado] = useState<EstadoProceso>('idle')
  const [pasoActual, setPasoActual] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [resumen, setResumen] = useState<ETLResumen | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<any>(null)
  const [historial, setHistorial] = useState<ETLLog[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [stats, setStats] = useState({ total: 0, criticos: 0 })
  const [generando, setGenerando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarHistorial = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('etl_logs').select('*').order('fecha_ejecucion', { ascending: false }).limit(10)
      if (data) setHistorial(data as unknown as ETLLog[])
    } catch { /* tabla no existe */ }
  }, [])

  const cargarStats = useCallback(async () => {
    if (!supabase) return
    try {
      const { count: total } = await supabase.from('pacientes').select('*', { count: 'exact', head: true })
      const { count: criticos } = await supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('riesgo_enfermedad', 'Critico')
      setStats({ total: total || 0, criticos: criticos || 0 })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    cargarHistorial()
    cargarStats()
    const client = supabase
    if (client) {
      const channel = client
        .channel('pacientes-etl-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => { cargarStats() })
        .subscribe()
      return () => { client.removeChannel(channel) }
    }
  }, [cargarHistorial, cargarStats])

  function descargarTemplate() {
    const sample: any = { id_paciente: 1, nombres: 'Juan', apellidos: 'Pérez', edad: 45, sexo: 'M', peso: 75, altura: 170, presion_sistolica: 130, presion_diastolica: 85, frecuencia_cardiaca: 75, glucosa: 100, colesterol: 190, saturacion_oxigeno: 97, temperatura: 36.5, antecedentes_familiares: 'false', fumador: 'false', consumo_alcohol: 'false', actividad_fisica: 'moderada', diagnostico_preliminar: 'Chequeo', fecha_consulta: '2025-01-15' }
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(COLUMNAS_TEMPLATE.map(c => [c, sample[c] ?? '']))])
    XLSX.utils.sheet_add_aoa(ws, [COLUMNAS_TEMPLATE], { origin: 'A1' })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_pacientes_lula.xlsx')
  }

  async function limpiarPacientesPrueba() {
    if (!confirm('¿Eliminar todos los pacientes con datos por defecto (Sin nombre / Sin apellido)?')) return
    setLimpiando(true)
    try {
      const response = await fetch('/api/pacientes?scope=test', { method: 'DELETE' })
      const data = await response.json()
      if (!data.ok) {
        const msg = data.error === 'RLS_BLOQUEANDO'
          ? 'RLS bloqueando. Ejecuta el SQL: ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;'
          : (data.error || 'Error al limpiar')
        setToast({ tipo: 'error', mensaje: msg })
        setTimeout(() => setToast(null), 5000)
      } else {
        setToast({ tipo: 'success', mensaje: data.mensaje || `${data.eliminados} pacientes eliminados` })
        setTimeout(() => setToast(null), 4000)
        await cargarStats()
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lula:pacientes-updated'))
      }
    } catch (e: any) {
      setToast({ tipo: 'error', mensaje: e?.message || 'Error de red' })
      setTimeout(() => setToast(null), 5000)
    }
    setLimpiando(false)
  }

  async function ejecutarETL() {
    if (!archivo) {
      setErrorMsg('Selecciona un archivo antes de ejecutar el ETL')
      setEstado('error')
      setErrorDetail({ message: 'No hay archivo seleccionado' })
      return
    }
    if (archivo.size === 0) {
      setErrorMsg('El archivo está vacío (0 bytes). Selecciona otro archivo.')
      setEstado('error')
      return
    }
    if (archivo.size > 50 * 1024 * 1024) {
      setErrorMsg('El archivo es demasiado grande. Máximo 50 MB.')
      setEstado('error')
      return
    }
    setEstado('subiendo'); setProgreso(5); setPasoActual('Subiendo archivo...')
    setResumen(null); setErrorMsg(null); setErrorDetail(null)

    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('tipo', 'archivo')

      setTimeout(() => {
        setEstado('procesando'); setProgreso(35); setPasoActual('Procesando datos clínicos...')
      }, 600)

      const response = await fetch('/api/etl', { method: 'POST', body: formData })

      setEstado('insertando'); setProgreso(75); setPasoActual('Insertando en base de datos...')

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (data.error === 'RLS_BLOQUEANDO' || data.stats?.rls) {
          setErrorMsg('🔒 RLS bloqueando inserts en la tabla pacientes')
          setErrorDetail({
            message: 'RLS (Row Level Security) está activado en la tabla pacientes.',
            rls: true,
            sql: data.sql || 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
            sqlExtra: 'ALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;',
            detalle: data.mensaje || 'La tabla tiene Row Level Security activado, lo que impide los inserts del ETL.',
            registrosLeidos: data.registrosLeidos || data.antes?.total,
            registrosGuardados: 0,
            errores: data.errores,
          })
          setEstado('error')
          setPasoActual('RLS bloqueando inserts')
          return
        }
        const msg = data.error || 'Error en el proceso ETL'

        const rlsEnErrores = (data.errores || []).some((e: string) => e.includes('row-level security') || e.includes('RLS'))
        const rlsEnStats = data.stats?.rls || false
        const isRls = rlsEnErrores || rlsEnStats || msg.includes('row-level security') || msg.includes('RLS')

        if (isRls) {
          setErrorMsg('🔒 La tabla "pacientes" tiene RLS activado. Ejecuta el SQL abajo en Supabase.')
          setErrorDetail({
            message: 'RLS (Row Level Security) está bloqueando los inserts en la tabla pacientes.',
            rls: true,
            sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
            sqlExtra: 'ALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;',
            detalle: `El proceso ETL procesó ${data.antes?.total || 0} filas pero 0 se guardaron. Esto es 100% porque la tabla tiene Row Level Security activado.`,
            registrosLeidos: data.antes?.total,
            registrosGuardados: data.registrosProcesados,
            errores: data.errores,
          })
          setEstado('error')
          setPasoActual('RLS bloqueando inserts')
          return
        }

        setErrorDetail({
          message: msg,
          detalle: data.detalle,
          columnasDetectadas: data.stats?.columnasDetectadas,
          columnasNormalizadas: data.stats?.columnasNormalizadas,
          muestraOriginal: data.stats?.muestraOriginal,
          motivosRechazo: data.stats?.motivosRechazo,
          sql: data.sql,
          lineasLeidas: data.detalle?.lineasLeidas,
          primeraLinea: data.detalle?.primeraLinea,
        })
        throw new Error(msg)
      }

      setProgreso(100)
      setPasoActual('¡Proceso completado!')
      setEstado('completado')
      setResumen(data)
      await cargarStats()
      await cargarHistorial()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lula:pacientes-updated'))
      }
    } catch (e: any) {
      console.error('ETL error:', e)
      setErrorMsg(e?.message || 'Error desconocido')
      setEstado('error')
      setPasoActual('Error en el proceso')
    }
  }

  async function generarYProcesar() {
    setGenerando(true)
    setEstado('subiendo')
    setProgreso(5)
    setPasoActual('Generando dataset sucio (~1800 registros)...')
    setResumen(null)
    setErrorMsg(null)
    setErrorDetail(null)

    try {
      setTimeout(() => {
        setProgreso(20)
        setPasoActual('Generando datos con errores intencionales...')
      }, 500)

      const genResponse = await fetch('/api/etl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', tipo: 'generate' }),
      })

      if (!genResponse.ok) {
        const errData = await genResponse.json()
        throw new Error(errData.error || 'Error al generar dataset')
      }

      setEstado('procesando')
      setProgreso(40)
      setPasoActual('Transformando y limpiando datos...')

      const data = await genResponse.json()

      if (!data.ok) {
        if (data.error === 'RLS_BLOQUEANDO') {
          setErrorMsg('🔒 RLS bloqueando inserts en la tabla pacientes')
          setErrorDetail({
            message: 'RLS (Row Level Security) está activado en la tabla pacientes.',
            rls: true,
            sql: data.sql || 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
            sqlExtra: 'ALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;',
            registrosLeidos: data.antes?.total,
            registrosGuardados: 0,
            errores: data.errores,
          })
          setEstado('error')
          return
        }
        throw new Error(data.error || 'Error en el proceso ETL')
      }

      setEstado('insertando')
      setProgreso(80)
      setPasoActual('Cargando en base de datos...')

      await new Promise(r => setTimeout(r, 300))

      setProgreso(100)
      setPasoActual('¡Proceso completado!')
      setEstado('completado')
      setResumen(data)
      await cargarStats()
      await cargarHistorial()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lula:pacientes-updated'))
      }
    } catch (e: any) {
      console.error('ETL generate error:', e)
      setErrorMsg(e?.message || 'Error desconocido')
      setEstado('error')
      setPasoActual('Error en el proceso')
    }
    setGenerando(false)
  }

  function resetear() {
    setArchivo(null); setEstado('idle'); setProgreso(0); setPasoActual('')
    setResumen(null); setErrorMsg(null); setErrorDetail(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const SQL_SETUP = `ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS etl_logs (
  id SERIAL PRIMARY KEY,
  fecha_ejecucion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archivo_nombre TEXT NOT NULL,
  total_registros INTEGER NOT NULL,
  registros_validos INTEGER NOT NULL,
  duplicados_eliminados INTEGER NOT NULL DEFAULT 0,
  nulos_corregidos INTEGER NOT NULL DEFAULT 0,
  inconsistencias INTEGER NOT NULL DEFAULT 0,
  calidad_pct NUMERIC(5,2) NOT NULL,
  tiempo_ejecucion NUMERIC(10,2) NOT NULL,
  errores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;`

  function copiarSQL() {
    navigator.clipboard.writeText(SQL_SETUP).then(() => {
      alert('SQL copiado al portapapeles. Pégalo en el editor SQL de Supabase.')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = SQL_SETUP
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('SQL copiado. Pégalo en el editor SQL de Supabase.')
    })
  }

  const pasos = [
    { key: 'subiendo', label: 'Subir archivo', icon: Upload },
    { key: 'procesando', label: 'Procesar datos', icon: FileText },
    { key: 'insertando', label: 'Insertar en BD', icon: Database },
    { key: 'completado', label: 'Completado', icon: CheckCircle2 },
  ]

  const estadoIndex = pasos.findIndex(p => p.key === estado)

  return (
    <AppLayout>
      <div className="w-full space-y-7 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#2a2a45]/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Proceso ETL</h1>
              <p className="text-[#8888a0] text-sm mt-0.5">Extracción, Transformación y Carga de datos clínicos</p>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-[#2a2a45]/30 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-[#8888a0]">Total:</span>
                <span className="text-sm font-bold text-white">{stats.total.toLocaleString()}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-[#8888a0]">Críticos:</span>
                <span className="text-sm font-bold text-rose-300">{stats.criticos}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-violet-900/10 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">Generar y Procesar Dataset</h2>
                <p className="text-xs text-[#8888a0] mt-0.5">Crea ~1800 registros sucios y los limpia automáticamente</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-[#0a0a12]/60 rounded-lg p-4 border border-purple-500/15 mb-4">
                <p className="text-xs text-[#8888a0] mb-2 font-semibold">El dataset incluye intencionalmente:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Valores nulos', 'Duplicados', 'Tipos incorrectos',
                    'Valores atípicos', 'Errores ortográficos', 'Errores de sexo',
                    'Fechas inválidas', 'Booleanos corruptos',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-[10px] text-[#666680]">
                      <span className="w-1 h-1 rounded-full bg-purple-500/60" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={generarYProcesar} disabled={generando || (estado !== 'idle' && estado !== 'completado' && estado !== 'error')}
                className="w-full px-4 py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {generando
                  ? <><Loader2 size={18} className="animate-spin" /> Generando y procesando...</>
                  : <><Sparkles size={18} /> Generar y Procesar Dataset</>}
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6 border border-[#2a2a45]/30 bg-[#0e0e1a]/50 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">Subir Archivo Propio</h2>
                <p className="text-xs text-[#8888a0] mt-0.5">Excel (.xlsx, .xls) o CSV</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={e => { setArchivo(e.target.files?.[0] || null); setResumen(null); setEstado('idle') }}
                className="hidden" />

              <button onClick={() => fileInputRef.current?.click()} disabled={estado !== 'idle' && estado !== 'completado' && estado !== 'error'}
                className="w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-[#2a2a45]/40 hover:border-purple-500/30 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <FileSpreadsheet size={18} /> {archivo ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
              </button>

              <button onClick={descargarTemplate}
                className="w-full px-4 py-2.5 rounded-lg text-[13px] text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2 border border-purple-500/20">
                <Download size={15} /> Descargar Plantilla Excel
              </button>

              <button onClick={limpiarPacientesPrueba} disabled={limpiando}
                title="Elimina todos los pacientes con datos por defecto (Sin nombre / Sin apellido)"
                className="w-full px-4 py-2.5 rounded-lg text-[13px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2 border border-rose-500/20 disabled:opacity-50">
                {limpiando ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {limpiando ? 'Limpiando...' : 'Limpiar Pacientes de Prueba'}
              </button>
            </div>

            {archivo && (
              <div className="mt-4 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between bg-white/[0.04] rounded-lg px-4 py-3 border border-[#2a2a45]/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{archivo.name}</p>
                      <p className="text-xs text-[#8888a0]">{(archivo.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={resetear}
                    className="p-1.5 rounded-md text-[#666680] hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
                <button onClick={ejecutarETL} disabled={estado !== 'idle' && estado !== 'completado' && estado !== 'error'}
                  className="w-full px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {estado !== 'idle' && estado !== 'completado' && estado !== 'error'
                    ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                    : <><Sparkles size={16} /> Ejecutar ETL Completo</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {estado !== 'idle' && estado !== 'completado' && (
          <div className="glass-card rounded-2xl p-8 border border-purple-500/30 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {estado === 'error'
                  ? <XCircle className="w-7 h-7 text-red-400 flex-shrink-0" />
                  : <Loader2 className="w-7 h-7 text-purple-400 animate-spin flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-lg font-semibold ${estado === 'error' ? 'text-red-300' : 'text-white'}`}>
                    {pasoActual || 'Procesando...'}
                  </p>
                  {errorMsg && <p className="text-sm text-red-300/70 mt-1">{errorMsg}</p>}
                </div>
              </div>
              <span className="text-2xl text-purple-400 font-bold">{progreso}%</span>
            </div>
            <div className="w-full h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${estado === 'error' ? 'bg-gradient-to-r from-red-600 to-red-400' : 'progress-bar'}`} style={{ width: `${progreso}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pasos.map((paso, i) => {
                const Icon = paso.icon
                const activo = i === estadoIndex
                const completado = estadoIndex > i || estadoIndex === -1 && i < pasos.length - 1
                return (
                  <div key={paso.key} className={`p-3 rounded-xl border transition-all ${
                    activo ? 'bg-purple-600/20 border-purple-500/40 text-purple-200' :
                    completado ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' :
                    'bg-[#1a1a2e]/30 border-[#2a2a45]/20 text-[#666680]'
                  }`}>
                    <div className="flex items-center gap-2">
                      {completado ? <CheckCircle2 className="w-4 h-4" /> : <Icon className={`w-4 h-4 ${activo ? 'animate-pulse' : ''}`} />}
                      <span className="text-xs font-medium">{paso.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {estado === 'error' && errorMsg && (
          <div className="glass-card rounded-2xl p-8 border border-red-500/30 bg-gradient-to-r from-red-900/20 to-rose-900/10 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-600/30 border border-red-500/40 flex-shrink-0">
                <XCircle className="w-7 h-7 text-red-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-200 mb-2">No se pudo completar el proceso ETL</h3>
                <p className="text-sm text-[#d0d0e0] mb-4">{errorMsg}</p>

                {errorDetail && (
                  <div className="bg-[#0a0a12]/60 rounded-lg p-5 border border-red-500/20 mt-3 space-y-4">
                    {errorDetail.columnasDetectadas && errorDetail.columnasDetectadas.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                          <FileText size={14} /> Columnas detectadas ({errorDetail.columnasDetectadas.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {errorDetail.columnasDetectadas.map((c: string) => (
                            <span key={c} className="text-xs px-2 py-1 rounded bg-purple-600/15 text-purple-300 border border-purple-500/20">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {errorDetail.columnasNormalizadas && errorDetail.columnasNormalizadas.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                          <RefreshCw size={14} /> Normalización aplicada
                        </p>
                        <div className="bg-[#050510] rounded-lg p-3 max-h-32 overflow-y-auto">
                          {errorDetail.columnasNormalizadas.map((c: any, i: number) => (
                            <p key={i} className="text-[11px] text-[#8888a0] font-mono">
                              <span className="text-purple-300">{c.original}</span>
                              <span className="text-[#666680] mx-2">→</span>
                              <span className="text-emerald-300">{c.normalizada}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {errorDetail.muestraOriginal && errorDetail.muestraOriginal.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                          <Database size={14} /> Primeras filas leídas
                        </p>
                        <div className="bg-[#050510] rounded-lg p-3 overflow-x-auto">
                          <pre className="text-[10px] text-[#d0d0e0] font-mono whitespace-pre">
{JSON.stringify(errorDetail.muestraOriginal, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {errorDetail.motivosRechazo && errorDetail.motivosRechazo.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                          <XCircle size={14} /> Motivos de rechazo
                        </p>
                        <div className="space-y-1">
                          {errorDetail.motivosRechazo.map((m: any, i: number) => (
                            <p key={i} className="text-xs text-amber-200/70 font-mono bg-[#050510] rounded px-3 py-1.5">
                              Fila {m.fila}: {m.motivo}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-red-500/20">
                      <p className="text-xs text-[#8888a0] mb-2">💡 <span className="text-amber-200 font-medium">Sugerencias:</span></p>
                      <ul className="text-xs text-[#d0d0e0] space-y-1 list-disc list-inside">
                        <li>Descarga la plantilla Excel y compara con tu archivo</li>
                        <li>Asegúrate de que las columnas tengan nombres similares a: <code className="text-purple-300">id, nombres, apellidos, edad, sexo, peso, altura</code></li>
                        <li>Si tu archivo no tiene columna de ID, se asignará uno automáticamente</li>
                        <li>Los acentos y mayúsculas se normalizan automáticamente</li>
                      </ul>
                    </div>
                  </div>
                )}

                {errorDetail?.rls && (
                  <div className="bg-gradient-to-br from-red-900/30 to-orange-900/15 rounded-xl p-5 border-2 border-red-500/40 mt-4 shadow-lg shadow-red-500/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-red-600/40 border border-red-500/50">
                        <AlertCircle className="w-5 h-5 text-red-200" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-red-200">🔒 RLS (Row Level Security) activado</h4>
                        <p className="text-xs text-red-300/80">
                          {errorDetail.registrosLeidos} filas leídas · {errorDetail.registrosGuardados || 0} guardadas
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[#d0d0e0] mb-4 leading-relaxed">
                      Tu tabla <code className="text-purple-300">pacientes</code> tiene RLS activado, lo que <strong className="text-red-300">bloquea los inserts del ETL</strong>.
                      El archivo se procesa bien pero no se guarda nada. Es un problema de <strong>configuración de Supabase</strong>, no de la web.
                    </p>

                    <div className="bg-[#0a0a12]/80 rounded-lg p-4 border border-red-500/20">
                      <p className="text-xs font-semibold text-amber-300 mb-2">📋 Pasos para solucionarlo:</p>
                      <ol className="text-xs text-[#d0d0e0] space-y-1 list-decimal list-inside mb-3">
                        <li>Ve a <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-purple-300 underline">supabase.com/dashboard</a></li>
                        <li>Selecciona tu proyecto</li>
                        <li>En el menú lateral: <strong>SQL Editor</strong></li>
                        <li>Pega el SQL de abajo y haz clic en <strong>RUN</strong></li>
                        <li>Vuelve aquí y reintenta el ETL</li>
                      </ol>

                      <p className="text-xs font-semibold text-amber-300 mb-2 mt-3">SQL a ejecutar:</p>
                      <div className="relative">
                        <pre className="text-[11px] text-emerald-200 bg-[#050510] rounded-lg p-3 overflow-x-auto font-mono">
{`ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;`}
                        </pre>
                        <button onClick={() => {
                          const sql = 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;\nALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;'
                          navigator.clipboard.writeText(sql).then(() => {
                            setToast({ tipo: 'success', mensaje: 'SQL copiado al portapapeles' })
                            setTimeout(() => setToast(null), 2500)
                          }).catch(() => alert('SQL copiado'))
                        }}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-purple-600/40 hover:bg-purple-600/60 text-purple-100 border border-purple-500/40 transition-all flex items-center gap-1">
                          <FileText size={10} /> Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!errorDetail?.rls && errorMsg.includes('row-level security') && (
                  <div className="bg-[#0a0a12]/60 rounded-lg p-4 border border-red-500/20 mt-3">
                    <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                      <AlertCircle size={16} /> Solución rápida
                    </p>
                    <p className="text-xs text-[#8888a0] mb-3 leading-relaxed">
                      La tabla <code className="text-purple-300">pacientes</code> tiene RLS activado. Ejecuta este SQL en Supabase:
                    </p>
                    <pre className="text-[11px] text-purple-200 bg-[#050510] rounded-lg p-3 overflow-x-auto font-mono">
{`ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;`}
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <button onClick={resetear}
                    className="px-5 py-2.5 rounded-xl text-sm bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 transition-all flex items-center gap-2">
                    <RefreshCw size={14} /> Reintentar
                  </button>
                  <button onClick={descargarTemplate}
                    className="px-5 py-2.5 rounded-xl text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 transition-all flex items-center gap-2">
                    <Download size={14} /> Descargar Plantilla
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {estado === 'completado' && resumen && (
          <div className="space-y-8 animate-fade-in">
            <div className="glass-card rounded-2xl p-8 border border-emerald-500/30 bg-gradient-to-r from-emerald-900/20 to-teal-900/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-600/30 border border-emerald-500/40">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">¡ETL Completado Exitosamente!</h2>
                    <p className="text-sm text-[#8888a0] mt-1">
                      <span className="text-emerald-300 font-semibold">{resumen.registrosProcesados} pacientes</span> insertados desde <span className="text-purple-300">{resumen.archivo}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={resetear}
                    className="px-5 py-3 rounded-xl text-sm text-[#8888a0] hover:text-white border border-[#2a2a45]/30 hover:border-purple-500/30 transition-all flex items-center gap-2">
                    <RefreshCw size={16} /> Nuevo ETL
                  </button>
                  <a href="/pacientes"
                    className="btn-primary px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2.5 no-underline">
                    Ver Lista de Pacientes <ArrowRight size={18} />
                  </a>
                </div>
              </div>
            </div>

            {resumen.despues.criticos > 0 && (
              <div className="glass-card rounded-2xl p-6 border border-rose-500/30 bg-gradient-to-r from-rose-900/20 to-red-900/10 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-600/30 border border-rose-500/40 alert-pulse">
                  <AlertCircle className="w-7 h-7 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-200">{resumen.despues.criticos} pacientes críticos detectados</h3>
                  <p className="text-sm text-[#8888a0] mt-0.5">Revisar inmediatamente en la sección de Alertas Críticas</p>
                </div>
                <a href="/alertas" className="ml-auto px-4 py-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-sm font-medium transition-all flex items-center gap-2 no-underline">
                  Ver Alertas <ArrowRight size={14} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card rounded-2xl p-8 border border-red-500/20 bg-gradient-to-br from-red-900/10 to-red-800/5">
                <h3 className="text-base font-semibold text-red-400 mb-5 flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> Antes de la Limpieza
                </h3>
                <div className="space-y-4">
                  {[
                    ['Total Registros', resumen.antes.total],
                    ['Valores Nulos Detectados', resumen.antes.nulos],
                    ['Duplicados', resumen.antes.duplicados],
                    ['Inconsistencias', resumen.antes.inconsistencias],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex items-center justify-between bg-[#1a1a2e]/50 rounded-lg px-4 py-3 border border-[#2a2a45]/20">
                      <span className="text-sm text-[#8888a0]">{label as string}</span>
                      <span className="text-base font-bold text-white">{value as number}</span>
                    </div>
                  ))}
                </div>
                {resumen.antes.columnasDetectadas && resumen.antes.columnasDetectadas.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-[#2a2a45]/20">
                    <p className="text-xs text-[#8888a0] mb-2">Columnas detectadas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.antes.columnasDetectadas.map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-purple-600/15 text-purple-300 border border-purple-500/20">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-8 border border-emerald-500/20 bg-gradient-to-br from-emerald-900/10 to-emerald-800/5">
                <h3 className="text-base font-semibold text-emerald-400 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Después de la Limpieza
                </h3>
                <div className="space-y-4">
                  {[
                    ['Registros Válidos', resumen.despues.validos, 'text-emerald-400'],
                    ['Duplicados Eliminados', resumen.despues.duplicadosEliminados, 'text-white'],
                    ['Valores Corregidos', resumen.despues.corregidos, 'text-white'],
                    ['Críticos Detectados', resumen.despues.criticos, 'text-rose-300'],
                    ['Calidad Final', `${resumen.despues.calidad}%`, resumen.despues.calidad >= 80 ? 'text-emerald-400' : 'text-amber-400'],
                  ].map(([label, value, color]) => (
                    <div key={label as string} className="flex items-center justify-between bg-[#1a1a2e]/50 rounded-lg px-4 py-3 border border-[#2a2a45]/20">
                      <span className="text-sm text-[#8888a0]">{label as string}</span>
                      <span className={`text-base font-bold ${color as string}`}>{value as number | string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/40">
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" /> Resumen de Ejecución
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <StatBox icon={Database} label="Registros Procesados" value={resumen.registrosProcesados} color="text-purple-400" />
                <StatBox icon={FileSpreadsheet} label="Tipo Archivo" value={resumen.tipo || 'N/A'} color="text-purple-400" />
                <StatBox icon={Clock} label="Tiempo" value={`${resumen.tiempoEjecucion}s`} color="text-purple-400" />
                <StatBox icon={CheckCircle2} label="Calidad" value={`${resumen.despues.calidad}%`} color="text-emerald-400" />
              </div>
            </div>

            {resumen.errores.length > 0 && (
              <div className="glass-card rounded-2xl p-8 border border-amber-500/20">
                <h3 className="text-base font-semibold text-amber-400 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Avisos ({resumen.errores.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {resumen.errores.map((err, i) => (
                    <p key={i} className="text-sm text-amber-300/70 font-mono bg-[#1a1a2e]/30 rounded-lg px-4 py-2">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showHistorial && historial.length > 0 && (
          <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/40 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" /> Historial ETL
              </h3>
              <button onClick={cargarHistorial} className="p-2 rounded-lg text-[#555570] hover:text-purple-400 hover:bg-purple-600/15 transition-all">
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a45]/30">
                    <th className="text-left py-3 px-3 text-[#8888a0] font-medium">Fecha</th>
                    <th className="text-left py-3 px-3 text-[#8888a0] font-medium">Archivo</th>
                    <th className="text-right py-3 px-3 text-[#8888a0] font-medium">Total</th>
                    <th className="text-right py-3 px-3 text-[#8888a0] font-medium">Válidos</th>
                    <th className="text-right py-3 px-3 text-[#8888a0] font-medium">Calidad</th>
                    <th className="text-right py-3 px-3 text-[#8888a0] font-medium">Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((log) => (
                    <tr key={log.id} className="border-b border-[#2a2a45]/10 hover:bg-[#1a1a2e]/30 transition-all">
                      <td className="py-3 px-3 text-white text-xs">{new Date(log.fecha_ejecucion).toLocaleString('es-ES')}</td>
                      <td className="py-3 px-3 text-[#d0d0e0]">{log.archivo_nombre}</td>
                      <td className="py-3 px-3 text-right text-white">{log.total_registros}</td>
                      <td className="py-3 px-3 text-right text-emerald-400">{log.registros_validos}</td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={`${log.calidad_pct >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{log.calidad_pct}%</span>
                      </td>
                      <td className="py-3 px-3 text-right text-[#8888a0]">{log.tiempo_ejecucion}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {historial.length > 0 && !showHistorial && (
          <div className="flex justify-center">
            <button onClick={() => setShowHistorial(true)}
              className="glass-button px-6 py-3 rounded-xl text-sm flex items-center gap-2">
              <History size={16} /> Ver Historial ({historial.length})
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-[120] animate-fade-in">
          <div className={`glass-card rounded-xl px-5 py-3.5 border-2 flex items-center gap-3 shadow-2xl ${
            toast.tipo === 'success' ? 'border-emerald-500/40' : 'border-rose-500/40'
          }`}>
            {toast.tipo === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            <span className={`text-sm font-medium ${toast.tipo === 'success' ? 'text-emerald-200' : 'text-rose-200'}`}>{toast.mensaje}</span>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
