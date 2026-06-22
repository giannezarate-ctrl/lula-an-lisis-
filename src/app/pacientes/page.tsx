'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import ModalPortal from '@/components/ui/ModalPortal'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { Paciente, PacienteFormData, FiltroRiesgo } from '@/types/pacientes'
import {
  calcularIMC, clasificarIMC, calcularRiesgo,
  getRiesgoColor, formatDate, predecirDiagnostico,
  getColorProbabilidad, getBgProbabilidad,
  getRiesgoCalculado,
  emitirCambioPacientes, suscribirCambioPacientes,
} from '@/lib/utils'
import {
  Plus, Edit3, Trash2, Eye, Search,
  X, AlertCircle, CheckCircle2, Users,
  Sparkles, RefreshCw, Database, FileSpreadsheet, UserPlus,
  Brain, Stethoscope, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Loader2,
  BarChart3, Activity,
} from 'lucide-react'

const initialForm: PacienteFormData = {
  id_paciente: 0, nombres: '', apellidos: '', edad: 0, sexo: 'Masculino',
  peso: 0, altura: 0, presion_sistolica: 0, presion_diastolica: 0,
  frecuencia_cardiaca: 0, glucosa: 0, colesterol: 0, saturacion_oxigeno: 0,
  temperatura: 0, antecedentes_familiares: false, fumador: false,
  consumo_alcohol: false, actividad_fisica: 'moderada',
  diagnostico_preliminar: '', fecha_consulta: new Date().toISOString().split('T')[0],
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroRiesgo>('todos')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'crear' | 'editar' | 'ver'>('crear')
  const [form, setForm] = useState<PacienteFormData>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [detallePaciente, setDetallePaciente] = useState<Paciente | null>(null)
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalServer, setTotalServer] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })
  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'criticos' | 'estadisticas'>('tabla')

  const stats = {
    total: pacientes.length,
    criticos: pacientes.filter(p => p.riesgo_enfermedad === 'Critico').length,
    alto: pacientes.filter(p => p.riesgo_enfermedad === 'Alto').length,
    medio: pacientes.filter(p => p.riesgo_enfermedad === 'Medio').length,
    bajo: pacientes.filter(p => p.riesgo_enfermedad === 'Bajo').length,
    imcPromedio: pacientes.length > 0 ? (pacientes.reduce((s, p) => s + (p.imc || 0), 0) / pacientes.length).toFixed(1) : '0',
    edadPromedio: pacientes.length > 0 ? (pacientes.reduce((s, p) => s + p.edad, 0) / pacientes.length).toFixed(1) : '0',
    paPromedio: pacientes.length > 0 ? Math.round(pacientes.reduce((s, p) => s + p.presion_sistolica, 0) / pacientes.length) : 0,
    glucosaPromedio: pacientes.length > 0 ? Math.round(pacientes.reduce((s, p) => s + p.glucosa, 0) / pacientes.length) : 0,
  }

  useEffect(() => { cargarTodosLosPacientes() }, [])

  useEffect(() => {
    const unsub = suscribirCambioPacientes(() => cargarTodosLosPacientes())
    const handleFocus = () => cargarTodosLosPacientes()
    window.addEventListener('focus', handleFocus)
    return () => { unsub(); window.removeEventListener('focus', handleFocus) }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client
      .channel('pacientes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => cargarTodosLosPacientes())
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filtro, search])

  async function cargarTodosLosPacientes() {
    setLoading(true)
    try {
      const todos: Paciente[] = []
      let paginaActual = 1
      let total = 0
      let totalPags = 1
      const batchSize = 500
      const maxIteraciones = 100

      do {
        const response = await fetch(`/api/pacientes?page=${paginaActual}&pageSize=${batchSize}`, { cache: 'no-store' })
        const data = await response.json()
        if (!data.ok || !data.pacientes) break
        todos.push(...data.pacientes)
        total = data.total ?? todos.length
        totalPags = data.totalPages ?? 1
        setLoadingProgress({ loaded: todos.length, total })
        paginaActual++
        if (paginaActual > totalPags) break
        if (paginaActual > maxIteraciones) break
      } while (true)

      setPacientes(todos)
      setTotalServer(total)
      setTotalPages(totalPags)
    } catch (e) {
      console.error('Error al cargar pacientes:', e)
    }
    setLoading(false)
  }

  const pacientesFiltrados = pacientes.filter(p => {
    const riesgoReal = (p.riesgo_enfermedad || getRiesgoCalculado(p)).toLowerCase()
    if (filtro !== 'todos' && riesgoReal !== filtro) return false
    if (search) {
      const q = search.toLowerCase()
      return `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || String(p.id_paciente).includes(q)
    }
    return true
  }).sort((a, b) => a.id_paciente - b.id_paciente)

  const totalItems = pacientesFiltrados.length
  const totalPagsFiltradas = Math.max(1, Math.ceil(totalItems / pageSize))
  const pacientesPaginados = pacientesFiltrados.slice((page - 1) * pageSize, page * pageSize)
  const paginaActual = Math.min(page, totalPagsFiltradas)
  const desde = totalItems === 0 ? 0 : (paginaActual - 1) * pageSize + 1
  const hasta = Math.min(paginaActual * pageSize, totalItems)

  const filtros: { label: string; value: FiltroRiesgo }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Riesgo Bajo', value: 'bajo' },
    { label: 'Riesgo Medio', value: 'medio' },
    { label: 'Riesgo Alto', value: 'alto' },
    { label: 'Riesgo Crítico', value: 'critico' },
  ]

  function validar(): boolean {
    const errs: Record<string, string> = {}
    if (modalMode === 'editar' && (!form.id_paciente || form.id_paciente <= 0)) errs.id_paciente = 'ID de paciente inválido'
    if (!form.nombres.trim()) errs.nombres = 'Los nombres son obligatorios'
    if (!form.apellidos.trim()) errs.apellidos = 'Los apellidos son obligatorios'
    if (form.edad < 0 || form.edad > 150) errs.edad = 'Edad debe estar entre 0 y 150'
    if (form.peso <= 0 || form.peso > 500) errs.peso = 'Peso inválido (1-500 kg)'
    if (form.altura <= 0 || form.altura > 300) errs.altura = 'Altura inválida (1-300 cm)'
    if (form.presion_sistolica < 50 || form.presion_sistolica > 300) errs.presion_sistolica = 'Presión sistólica inválida (50-300)'
    if (form.presion_diastolica < 30 || form.presion_diastolica > 200) errs.presion_diastolica = 'Presión diastólica inválida (30-200)'
    if (form.frecuencia_cardiaca < 20 || form.frecuencia_cardiaca > 300) errs.frecuencia_cardiaca = 'FC inválida (20-300)'
    if (form.glucosa < 10 || form.glucosa > 1000) errs.glucosa = 'Glucosa inválida (10-1000)'
    if (form.colesterol < 50 || form.colesterol > 800) errs.colesterol = 'Colesterol inválido (50-800)'
    if (form.saturacion_oxigeno < 0 || form.saturacion_oxigeno > 100) errs.saturacion_oxigeno = 'SpO2 inválida (0-100)'
    if (form.temperatura < 30 || form.temperatura > 45) errs.temperatura = 'Temperatura inválida (30-45°C)'
    if (!form.fecha_consulta) errs.fecha_consulta = 'Fecha de consulta obligatoria'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function guardar() {
    if (!validar()) {
      setToast({ tipo: 'error', mensaje: 'Revisa los campos marcados en rojo' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setSubmitting(true)

    const imc = calcularIMC(form.peso, form.altura)
    const riesgo = calcularRiesgo(form)

    const record = {
      id_paciente: form.id_paciente, nombres: form.nombres.trim(), apellidos: form.apellidos.trim(),
      edad: form.edad, sexo: form.sexo, peso: form.peso, altura: form.altura, imc,
      clasificacion_imc: clasificarIMC(imc),
      presion_sistolica: form.presion_sistolica, presion_diastolica: form.presion_diastolica,
      frecuencia_cardiaca: form.frecuencia_cardiaca, glucosa: form.glucosa,
      colesterol: form.colesterol, saturacion_oxigeno: form.saturacion_oxigeno,
      temperatura: form.temperatura, antecedentes_familiares: form.antecedentes_familiares,
      fumador: form.fumador, consumo_alcohol: form.consumo_alcohol,
      actividad_fisica: form.actividad_fisica, diagnostico_preliminar: form.diagnostico_preliminar.trim(),
      riesgo_enfermedad: riesgo, fecha_consulta: form.fecha_consulta,
    }

    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modalMode === 'editar' ? 'update' : 'create', paciente: record }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        const errorMsg = data.error === 'RLS_BLOQUEANDO'
          ? `RLS bloqueando. SQL: ${data.sql}`
          : (data.error || 'Error al guardar paciente')
        setErrors({ submit: errorMsg })
        setToast({ tipo: 'error', mensaje: errorMsg })
        setTimeout(() => setToast(null), 5000)
        setSubmitting(false)
        return
      }

      setModalOpen(false)
      setForm(initialForm)
      setErrors({})
      setToast({ tipo: 'success', mensaje: data.mensaje || 'Paciente guardado correctamente' })
      await cargarTodosLosPacientes()
      emitirCambioPacientes()
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    } catch (e: any) {
      setErrors({ submit: e?.message || 'Error de red al guardar paciente' })
      setToast({ tipo: 'error', mensaje: e?.message || 'Error de red' })
      setTimeout(() => setToast(null), 5000)
      setSubmitting(false)
    }
  }


  const [confirmDelete, setConfirmDelete] = useState<{ id: number; nombre: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  function pedirEliminar(id: number, nombre: string) {
    setConfirmDelete({ id, nombre })
  }

  async function confirmarEliminar() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/pacientes?id=${confirmDelete.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!data.ok) {
        setToast({ tipo: 'error', mensaje: data.error === 'RLS_BLOQUEANDO' ? `RLS bloqueando. SQL: ${data.sql}` : (data.error || 'Error al eliminar') })
        setTimeout(() => setToast(null), 5000)
        setDeleting(false)
        return
      }
      setToast({ tipo: 'success', mensaje: 'Paciente eliminado correctamente' })
      setTimeout(() => setToast(null), 3000)
      setConfirmDelete(null)
      await cargarTodosLosPacientes()
      emitirCambioPacientes()
    } catch (e: any) {
      setToast({ tipo: 'error', mensaje: e?.message || 'Error de red al eliminar' })
      setTimeout(() => setToast(null), 5000)
    }
    setDeleting(false)
  }

  function abrirModal(mode: 'crear' | 'editar' | 'ver', paciente?: Paciente) {
    setModalMode(mode)
    setErrors({})
    if (paciente) {
      setForm({
        id_paciente: paciente.id_paciente, nombres: paciente.nombres, apellidos: paciente.apellidos,
        edad: paciente.edad, sexo: paciente.sexo, peso: paciente.peso, altura: paciente.altura,
        presion_sistolica: paciente.presion_sistolica, presion_diastolica: paciente.presion_diastolica,
        frecuencia_cardiaca: paciente.frecuencia_cardiaca, glucosa: paciente.glucosa,
        colesterol: paciente.colesterol, saturacion_oxigeno: paciente.saturacion_oxigeno,
        temperatura: paciente.temperatura, antecedentes_familiares: paciente.antecedentes_familiares,
        fumador: paciente.fumador, consumo_alcohol: paciente.consumo_alcohol,
        actividad_fisica: paciente.actividad_fisica, diagnostico_preliminar: paciente.diagnostico_preliminar,
        fecha_consulta: paciente.fecha_consulta,
      })
      setDetallePaciente(paciente)
    } else {
      setForm(initialForm)
      setDetallePaciente(null)
    }
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setErrors({})
    setTimeout(() => {
      setDetallePaciente(null)
      setForm(initialForm)
      setModalMode('crear')
    }, 200)
  }

  const renderForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">
            ID Paciente
            {modalMode !== 'editar' && <span className="text-purple-400 ml-1 text-xs">(opcional - se asigna automáticamente)</span>}
          </label>
          <input type="number" value={form.id_paciente || ''}
            onChange={e => setForm({ ...form, id_paciente: parseInt(e.target.value) || 0 })}
            disabled={modalMode === 'editar'}
            placeholder="Auto-generado"
            className="glass-input w-full rounded-xl px-4 py-3 text-base disabled:opacity-50 transition-all" />
          {errors.id_paciente && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.id_paciente}</p>}
        </div>
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Fecha Consulta</label>
          <input type="date" value={form.fecha_consulta}
            onChange={e => setForm({ ...form, fecha_consulta: e.target.value })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base" />
          {errors.fecha_consulta && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.fecha_consulta}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Nombres</label>
          <input type="text" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base" />
          {errors.nombres && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.nombres}</p>}
        </div>
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Apellidos</label>
          <input type="text" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base" />
          {errors.apellidos && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.apellidos}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[{ label: 'Edad', key: 'edad', type: 'number' }, { label: 'Sexo', key: 'sexo', type: 'select', options: ['Masculino', 'Femenino'] },
          { label: 'Peso (kg)', key: 'peso', type: 'number', step: 0.1 },
          { label: 'Altura (cm)', key: 'altura', type: 'number', step: 0.1 }].map(f => (
          <div key={f.key}>
            <label className="text-sm text-[#8888a0] block mb-2 font-medium">{f.label}</label>
            {f.type === 'select' ? (
              <select value={form[f.key as keyof PacienteFormData] as string}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="glass-input w-full rounded-xl px-4 py-3 text-base">
                {(f as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type="number" step={(f as any).step || 1} value={(form[f.key as keyof PacienteFormData] as number) || ''}
                onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                className="glass-input w-full rounded-xl px-4 py-3 text-base" />
            )}
            {errors[f.key] && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {[{ label: 'PA Sistólica', key: 'presion_sistolica' }, { label: 'PA Diastólica', key: 'presion_diastolica' },
          { label: 'FC (lpm)', key: 'frecuencia_cardiaca' }].map(f => (
          <div key={f.key}>
            <label className="text-sm text-[#8888a0] block mb-2 font-medium">{f.label}</label>
            <input type="number" value={(form[f.key as keyof PacienteFormData] as number) || ''}
              onChange={e => setForm({ ...form, [f.key]: parseInt(e.target.value) || 0 })}
              className="glass-input w-full rounded-xl px-4 py-3 text-base" />
            {errors[f.key] && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {[{ label: 'Glucosa (mg/dL)', key: 'glucosa', step: 0.1 }, { label: 'Colesterol (mg/dL)', key: 'colesterol', step: 0.1 },
          { label: 'SpO2 (%)', key: 'saturacion_oxigeno', step: 0.1 }].map(f => (
          <div key={f.key}>
            <label className="text-sm text-[#8888a0] block mb-2 font-medium">{f.label}</label>
            <input type="number" step={f.step} value={(form[f.key as keyof PacienteFormData] as number) || ''}
              onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
              className="glass-input w-full rounded-xl px-4 py-3 text-base" />
            {errors[f.key] && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors[f.key]}</p>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Temperatura (°C)</label>
          <input type="number" step="0.1" value={form.temperatura || ''}
            onChange={e => setForm({ ...form, temperatura: parseFloat(e.target.value) || 0 })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base" />
          {errors.temperatura && <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{errors.temperatura}</p>}
        </div>
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Actividad Física</label>
          <select value={form.actividad_fisica} onChange={e => setForm({ ...form, actividad_fisica: e.target.value })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base">
            <option value="sedentario">Sedentario</option>
            <option value="moderada">Moderada</option>
            <option value="activa">Activa</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-[#8888a0] block mb-2 font-medium">Diagnóstico Preliminar</label>
          <input type="text" value={form.diagnostico_preliminar}
            onChange={e => setForm({ ...form, diagnostico_preliminar: e.target.value })}
            className="glass-input w-full rounded-xl px-4 py-3 text-base" />
        </div>
      </div>
      <div className="flex flex-wrap gap-5 pt-2">
        {[
          { label: 'Antecedentes Familiares', key: 'antecedentes_familiares' as const },
          { label: 'Fumador', key: 'fumador' as const },
          { label: 'Consumo Alcohol', key: 'consumo_alcohol' as const },
        ].map(f => (
          <label key={f.key} className="flex items-center gap-3 text-base text-[#d0d0e0] cursor-pointer group">
            <div className={`w-5 h-5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
              form[f.key] ? 'bg-purple-600 border-purple-500' : 'border-[#2a2a45] bg-[#1a1a2e] group-hover:border-purple-500/50'
            }`}>
              {form[f.key] && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <input type="checkbox" checked={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.checked })}
              className="hidden" />
            {f.label}
          </label>
        ))}
      </div>
      {form.peso > 0 && form.altura > 0 && (
        <div className="bg-gradient-to-r from-purple-900/15 to-violet-900/10 rounded-xl p-5 border border-purple-500/15 hover:border-purple-500/30 transition-all">
          <p className="text-base text-[#d0d0e0]">
            IMC: <span className="text-purple-400 font-bold">{calcularIMC(form.peso, form.altura).toFixed(1)}</span>
            <span className="mx-2 text-[#555570]">|</span>
            Clasificación: <span className="text-purple-400 font-bold">{clasificarIMC(calcularIMC(form.peso, form.altura))}</span>
            <span className="mx-2 text-[#555570]">|</span>
            Riesgo: <span className="text-purple-400 font-bold">{calcularRiesgo(form).nivel}</span>
          </p>
        </div>
      )}
      {errors.submit && (
        <div className="bg-red-900/15 border border-red-500/25 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-base text-red-300">{errors.submit}</p>
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in">
          <div className={`glass-card rounded-xl px-5 py-3.5 flex items-center gap-3 border-2 shadow-2xl ${
            toast.tipo === 'success' ? 'border-emerald-500/50 bg-emerald-900/30' : 'border-red-500/50 bg-red-900/30'
          }`}>
            {toast.tipo === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm font-medium text-white">{toast.mensaje}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-[#8888a0] hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="w-full space-y-7 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#2a2a45]/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Pacientes</h1>
              <p className="text-[#8888a0] text-sm mt-0.5">
                Gestión clínica · <span className="text-purple-400/80">{pacientes.length.toLocaleString()} registros</span>
                {loading && loadingProgress.total > 0 && (
                  <span className="text-purple-400/60 ml-2">· Cargando {loadingProgress.loaded}/{loadingProgress.total}...</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => abrirModal('crear')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200">
            <Plus size={16} />
            Agregar Paciente
          </button>
        </div>

        <div className="sticky top-0 z-30 py-3 bg-[#0a0a12]/95 backdrop-blur-xl -mx-6 md:-mx-10 lg:-mx-14 px-6 md:px-10 lg:px-14 border-b border-[#2a2a45]/20 shadow-lg shadow-black/30 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555570]" />
              <input type="text" placeholder="Buscar por nombre o ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg pl-11 pr-4 py-2.5 text-sm bg-white/[0.04] border border-[#2a2a45]/40 focus:border-purple-500/50 focus:bg-white/[0.06] text-white placeholder-[#666680] focus:outline-none transition-all" />
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#0e0e1a]/60 rounded-xl border border-[#2a2a45]/30 overflow-x-auto">
              {([
                { key: 'tabla' as const, label: 'Todos', icon: Users, badge: stats.total },
                { key: 'criticos' as const, label: 'Criticos', icon: AlertCircle, badge: stats.criticos },
                { key: 'estadisticas' as const, label: 'Estadisticas', icon: BarChart3, badge: null },
              ]).map(tab => (
                <button key={tab.key}
                  onClick={() => {
                    setVistaActiva(tab.key)
                    if (tab.key === 'criticos') setFiltro('critico')
                    else if (tab.key === 'tabla') setFiltro('todos')
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    vistaActiva === tab.key
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10'
                      : 'text-[#666680] hover:text-white hover:bg-white/[0.03] border border-transparent'
                  }`}>
                  <tab.icon size={15} />
                  {tab.label}
                  {tab.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      vistaActiva === tab.key ? 'bg-purple-500/30 text-purple-200' : 'bg-[#1a1a2e] text-[#8888a0] border border-[#2a2a45]/40'
                    }`}>{tab.badge.toLocaleString()}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap bg-white/[0.03] rounded-lg p-1 border border-[#2a2a45]/30">
              {filtros.map(f => (
                <button key={f.value}
                  onClick={() => setFiltro(f.value)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200 ${
                    filtro === f.value
                      ? 'bg-purple-500/15 text-purple-300'
                      : 'text-[#666680] hover:text-white'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {vistaActiva === 'estadisticas' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
            {[
              { label: 'Pacientes Totales', value: stats.total, icon: Users, color: 'purple' },
              { label: 'Edad Promedio', value: `${stats.edadPromedio} a`, icon: Users, color: 'blue' },
              { label: 'IMC Promedio', value: stats.imcPromedio, icon: Activity, color: 'emerald' },
              { label: 'PA Promedio', value: `${stats.paPromedio} mmHg`, icon: Activity, color: 'amber' },
            ].map((m, i) => (
              <div key={i} className={`glass-card rounded-xl p-4 border border-${m.color}-500/20 bg-${m.color}-900/10`}>
                <p className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-lg font-bold text-${m.color}-400`}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {vistaActiva !== 'estadisticas' && (loading ? (
          <div className="glass-card rounded-2xl border border-[#2a2a45]/30 overflow-hidden">
            <div className="p-10 space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-5">
                  <div className="skeleton h-6 w-16" />
                  <div className="skeleton h-6 flex-1" />
                  <div className="skeleton h-6 w-20" />
                  <div className="skeleton h-6 w-24" />
                  <div className="skeleton h-6 w-20" />
                  <div className="skeleton h-6 w-24" />
                  <div className="skeleton h-6 w-44" />
                  <div className="skeleton h-6 w-28" />
                  <div className="skeleton h-6 w-28" />
                </div>
              ))}
            </div>
          </div>
        ) : pacientes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay pacientes registrados"
            description="Comience cargando datos mediante un archivo Excel/CSV o registrando pacientes manualmente para empezar a analizar la información clínica."
            badge={{ label: 'Base de datos vacía', icon: Database }}
            variant="default"
            size="lg"
            primaryAction={{
              label: 'Cargar Archivo',
              icon: FileSpreadsheet,
              onClick: () => window.location.href = '/etl',
            }}
            secondaryAction={{
              label: 'Agregar Paciente',
              icon: UserPlus,
              onClick: () => abrirModal('crear'),
            }}
            metrics={[
              { label: 'Pacientes Registrados', value: 0, icon: Users, variant: 'default' },
              { label: 'Consultas Totales', value: 0, icon: Database, variant: 'info' },
              { label: 'Riesgo Crítico', value: 0, icon: AlertCircle, variant: 'error' },
              { label: 'Última Carga', value: '—', icon: RefreshCw, variant: 'success' },
            ]}
            footerInfo={[
              { label: 'Fuentes soportadas:', value: 'Excel, CSV', icon: FileSpreadsheet },
              { label: 'Límite de pacientes:', value: 'Ilimitado', icon: Database },
            ]}
          />
        ) : (
          <div className="rounded-xl border border-[#2a2a45]/30 bg-[#0e0e1a]/50 animate-fade-in relative">
            <div className="px-5 py-3 border-b border-[#2a2a45]/30 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-[#8888a0] flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Desliza horizontalmente para ver todas las columnas · {pacientesFiltrados.length} pacientes</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-purple-600/15 text-purple-300 border border-purple-500/20 font-mono">23 columnas</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-custom w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a45]/40">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider font-mono">ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Nombres</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Apellidos</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Edad</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Sexo</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Peso</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Altura</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">IMC</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">PA</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">FC</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Glucosa</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Colest.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">SpO₂</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Temp.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Ant. Fam.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Fumador</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Alcohol</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Actividad</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Diagnóstico</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Riesgo</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Brain size={12} className="text-purple-400" />
                        Predicción IA
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={23} className="p-0">
                        <div className="py-16 px-8 text-center animate-fade-in">
                          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-purple-600/10 to-violet-600/5 flex items-center justify-center border border-purple-500/15 empty-state-icon">
                            <Search className="w-9 h-9 text-purple-400/50" />
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">Sin resultados</h3>
                          <p className="text-sm text-[#8888a0] mb-5 max-w-md mx-auto">
                            No hay pacientes que coincidan con los filtros aplicados. Intente ajustar la búsqueda.
                          </p>
                          <button
                            onClick={() => { setSearch(''); setFiltro('todos') }}
                            className="glass-button px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2"
                          >
                            <RefreshCw size={14} /> Limpiar Filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pacientesPaginados.map((p, idx) => (
                      <tr key={p.id_paciente} className="border-b border-[#2a2a45]/20 hover:bg-white/[0.02] transition-colors animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                        <td className="px-4 py-3 font-mono text-xs text-[#8888a0]">#{p.id_paciente}</td>
                        <td className="px-4 py-3 text-sm font-medium text-white whitespace-nowrap">{p.nombres}</td>
                        <td className="px-4 py-3 text-sm text-[#b0b0c8] whitespace-nowrap">{p.apellidos}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.edad}<span className="text-[#666680] text-[10px]"> a</span></td>
                        <td className="px-4 py-3 text-sm text-[#b0b0c8] whitespace-nowrap">{p.sexo}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.peso}<span className="text-[#666680] text-[10px]"> kg</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.altura}<span className="text-[#666680] text-[10px]"> cm</span></td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{p.imc.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{p.presion_sistolica}/{p.presion_diastolica}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.frecuencia_cardiaca}<span className="text-[#666680] text-[10px]"> lpm</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.glucosa}<span className="text-[#666680] text-[10px]"> mg</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.colesterol}<span className="text-[#666680] text-[10px]"> mg</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.saturacion_oxigeno}<span className="text-[#666680] text-[10px]">%</span></td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{p.temperatura}<span className="text-[#666680] text-[10px]">°</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.antecedentes_familiares
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Sí</span>
                            : <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#1a1a2e]/50 text-[#555570] border border-[#2a2a45]/30 text-xs">No</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.fumador
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs">Sí</span>
                            : <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#1a1a2e]/50 text-[#555570] border border-[#2a2a45]/30 text-xs">No</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.consumo_alcohol
                            ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">Sí</span>
                            : <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#1a1a2e]/50 text-[#555570] border border-[#2a2a45]/30 text-xs">No</span>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                            p.actividad_fisica === 'sedentario' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                            p.actividad_fisica === 'activa' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          }`}>{p.actividad_fisica}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#b0b0c8] max-w-[180px] truncate" title={p.diagnostico_preliminar}>{p.diagnostico_preliminar}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const riesgoReal = p.riesgo_enfermedad || getRiesgoCalculado(p)
                            return (
                              <span className={`risk-indicator inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiesgoColor(riesgoReal)}`}>
                                <span className={`risk-${riesgoReal.toLowerCase()}`} />
                                {riesgoReal}
                              </span>
                            )
                          })()}
                        </td>
                        <td>
                          {(() => {
                            const preds = predecirDiagnostico(p)
                            const top3 = preds.slice(0, 3)
                            if (top3.length === 0) return <span className="text-xs text-[#666680]">—</span>
                            return (
                              <div className="flex flex-col gap-1 min-w-[200px]">
                                {top3.map((pred, i) => {
                                  const prob = Math.round(pred.probabilidad)
                                  const bgClass = getBgProbabilidad(prob)
                                  const barColor = prob >= 75 ? 'bg-red-400' : prob >= 55 ? 'bg-orange-400' : prob >= 35 ? 'bg-amber-400' : 'bg-emerald-400'
                                  return (
                                    <div key={i} className={`flex flex-col gap-0.5 px-2 py-1 rounded-md border ${bgClass} ${i === 0 ? '' : 'opacity-80'}`}
                                      title={pred.descripcion}>
                                      <div className="flex items-center gap-1">
                                        {i === 0 && <Stethoscope size={10} className={getColorProbabilidad(prob)} />}
                                        <span className={`text-[11px] font-semibold ${getColorProbabilidad(prob)} ${i === 0 ? '' : 'text-[10px]'} truncate`}>
                                          {pred.condicion}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="flex-1 h-0.5 bg-[#0e0e1a] rounded-full overflow-hidden">
                                          <div className={`h-full ${barColor}`} style={{ width: `${prob}%` }} />
                                        </div>
                                        <span className={`text-[9px] font-bold ${getColorProbabilidad(prob)}`}>{prob}%</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8888a0] whitespace-nowrap">{formatDate(p.fecha_consulta)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); abrirModal('ver', p) }}
                              onTouchEnd={(e) => { e.preventDefault(); abrirModal('ver', p) }}
                              title="Ver detalles completos"
                              aria-label="Ver paciente"
                              data-action="ver"
                              data-id={p.id_paciente}
                              className="group flex items-center justify-center gap-1 min-w-[36px] h-9 px-2.5 rounded-lg text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600/40 active:bg-purple-600/50 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-150 active:scale-95 cursor-pointer select-none">
                              <Eye size={15} />
                              <span className="text-[10px] font-bold uppercase tracking-wider hidden xl:inline">Ver</span>
                            </button>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); abrirModal('editar', p) }}
                              onTouchEnd={(e) => { e.preventDefault(); abrirModal('editar', p) }}
                              title="Editar paciente"
                              aria-label="Editar paciente"
                              data-action="editar"
                              data-id={p.id_paciente}
                              className="group flex items-center justify-center gap-1 min-w-[36px] h-9 px-2.5 rounded-lg text-amber-300 hover:text-white bg-amber-600/20 hover:bg-amber-600/40 active:bg-amber-600/50 border border-amber-500/30 hover:border-amber-500/50 transition-all duration-150 active:scale-95 cursor-pointer select-none">
                              <Edit3 size={15} />
                              <span className="text-[10px] font-bold uppercase tracking-wider hidden xl:inline">Editar</span>
                            </button>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); pedirEliminar(p.id_paciente, `${p.nombres} ${p.apellidos}`) }}
                              onTouchEnd={(e) => { e.preventDefault(); pedirEliminar(p.id_paciente, `${p.nombres} ${p.apellidos}`) }}
                              title="Eliminar paciente"
                              aria-label="Eliminar paciente"
                              data-action="eliminar"
                              data-id={p.id_paciente}
                              className="group flex items-center justify-center gap-1 min-w-[36px] h-9 px-2.5 rounded-lg text-rose-300 hover:text-white bg-rose-600/20 hover:bg-rose-600/40 active:bg-rose-600/50 border border-rose-500/30 hover:border-rose-500/50 transition-all duration-150 active:scale-95 cursor-pointer select-none">
                              <Trash2 size={15} />
                              <span className="text-[10px] font-bold uppercase tracking-wider hidden xl:inline">Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 border-t border-[#2a2a45]/30 flex flex-wrap items-center justify-between gap-3 bg-[#0a0a14]/40">
              <p className="text-sm text-[#555570]">
                {totalItems === 0 ? (
                  <>Sin resultados</>
                ) : (
                  <>Mostrando <span className="text-[#8888a0] font-medium">{desde}-{hasta}</span> de{' '}
                  <span className="text-[#8888a0] font-medium">{totalItems}</span> pacientes filtrados
                  {pacientes.length !== totalItems && <span className="text-[#555570]"> (de {pacientes.length} totales)</span>}
                  </>
                )}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                  <span>Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="bg-[#1a1a2e] border border-[#2a2a45]/50 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500/50">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                </div>

                {totalPagsFiltradas > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(1)}
                      disabled={paginaActual === 1}
                      className="p-1.5 rounded-md text-[#8888a0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Primera página">
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="p-1.5 rounded-md text-[#8888a0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Página anterior">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-[#8888a0] px-2">
                      <span className="text-white font-medium">{paginaActual}</span> / {totalPagsFiltradas}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPagsFiltradas, p + 1))}
                      disabled={paginaActual === totalPagsFiltradas}
                      className="p-1.5 rounded-md text-[#8888a0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Página siguiente">
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => setPage(totalPagsFiltradas)}
                      disabled={paginaActual === totalPagsFiltradas}
                      className="p-1.5 rounded-md text-[#8888a0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Última página">
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}

                <button onClick={cargarTodosLosPacientes} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors">
                  <RefreshCw size={14} /> Recargar
                </button>
              </div>
            </div>
          </div>
        )      )}
      </div>

      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(null) }}>
          <div className="glass-card rounded-2xl w-full max-w-md p-6 border border-rose-500/30 animate-scale-in shadow-2xl shadow-rose-500/20 relative z-[301]">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 rounded-xl bg-rose-600/30 border border-rose-500/40 flex-shrink-0">
                <Trash2 className="w-6 h-6 text-rose-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">¿Eliminar paciente?</h3>
                <p className="text-sm text-[#8888a0]">
                  Estás a punto de eliminar a <span className="text-white font-semibold">{confirmDelete.nombre}</span>.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm text-[#8888a0] hover:text-white hover:bg-[#2a2a45] transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/50 transition-all disabled:opacity-50 flex items-center gap-2">
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : <><Trash2 size={14} /> Sí, eliminar</>}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-8 pb-8 px-4 modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className={`glass-card rounded-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in relative z-[201] ${
            modalMode === 'ver' ? 'max-w-4xl' : 'max-w-3xl'
          }`}
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#12121e]/95 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-[#2a2a45]/30">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {modalMode === 'crear' ? 'Nuevo Paciente' : modalMode === 'editar' ? 'Editar Paciente' : 'Detalles del Paciente'}
                  </h2>
                  {modalMode !== 'ver' && (
                    <Sparkles className="w-5 h-5 text-purple-400 animate-float" />
                  )}
                </div>
                <p className="text-sm text-[#8888a0] mt-0.5">
                  {modalMode === 'crear' ? 'Complete todos los campos del paciente' : `ID: #${form.id_paciente}`}
                </p>
              </div>
              <button onClick={cerrarModal}
                title="Cerrar"
                className="p-2 rounded-lg text-[#555570] hover:text-white hover:bg-[#2a2a45] transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {modalMode === 'ver' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ['ID', `#${detallePaciente?.id_paciente}`],
                      ['Nombre Completo', `${detallePaciente?.nombres} ${detallePaciente?.apellidos}`],
                      ['Edad', `${detallePaciente?.edad} años`],
                      ['Sexo', detallePaciente?.sexo],
                      ['Peso', `${detallePaciente?.peso} kg`],
                      ['Altura', `${detallePaciente?.altura} cm`],
                      ['IMC', detallePaciente?.imc.toFixed(1)],
                      ['Clasificación IMC', detallePaciente?.clasificacion_imc],
                      ['PA', `${detallePaciente?.presion_sistolica}/${detallePaciente?.presion_diastolica}`],
                      ['FC', `${detallePaciente?.frecuencia_cardiaca} lpm`],
                      ['Glucosa', `${detallePaciente?.glucosa} mg/dL`],
                      ['Colesterol', `${detallePaciente?.colesterol} mg/dL`],
                      ['SpO2', `${detallePaciente?.saturacion_oxigeno}%`],
                      ['Temperatura', `${detallePaciente?.temperatura}°C`],
                      ['Actividad Física', detallePaciente?.actividad_fisica],
                      ['Diagnóstico', detallePaciente?.diagnostico_preliminar],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#1a1a2e]/50 rounded-xl p-3 border border-[#2a2a45]/20">
                        <p className="text-[9px] text-[#555570] uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-sm font-medium text-white">{value || '-'}</p>
                      </div>
                    ))}
                    <div className="bg-[#1a1a2e]/50 rounded-xl p-3 border border-[#2a2a45]/20">
                      <p className="text-[9px] text-[#555570] uppercase tracking-wider mb-1">Riesgo</p>
                      {detallePaciente && (() => {
                        const riesgoReal = detallePaciente.riesgo_enfermedad || getRiesgoCalculado(detallePaciente)
                        return (
                          <span className={`risk-indicator inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiesgoColor(riesgoReal)}`}>
                            <span className={`risk-${riesgoReal.toLowerCase()}`} />
                            {riesgoReal}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="bg-[#1a1a2e]/50 rounded-xl p-3 border border-[#2a2a45]/20">
                      <p className="text-[9px] text-[#555570] uppercase tracking-wider mb-1">Fecha Consulta</p>
                      <p className="text-sm text-white">{detallePaciente?.fecha_consulta}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['Antecedentes Familiares', detallePaciente?.antecedentes_familiares],
                      ['Fumador', detallePaciente?.fumador],
                      ['Consumo Alcohol', detallePaciente?.consumo_alcohol],
                    ] as [string, boolean | undefined][]).map(([label, value]) => (
                      <div key={label}
                        className={`flex items-center gap-2 text-xs rounded-xl px-3.5 py-2 border ${
                          value ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-[#1a1a2e]/50 border-[#2a2a45]/20 text-[#8888a0]'
                        }`}>
                        {value ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-[#555570]" />}
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-900/15 to-violet-900/5 p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30">
                        <Brain className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Predicción Clínica IA</h3>
                        <p className="text-[11px] text-[#8888a0]">Análisis inteligente basado en los signos vitales del paciente</p>
                      </div>
                    </div>

                    {(() => {
                      if (!detallePaciente) return null
                      const preds = predecirDiagnostico(detallePaciente)
                      return (
                        <div className="space-y-3">
                          {preds.map((pred, i) => {
                            const prob = Math.round(pred.probabilidad)
                            const bgClass = getBgProbabilidad(prob)
                            const barColor = prob >= 75 ? 'bg-red-400' : prob >= 55 ? 'bg-orange-400' : prob >= 35 ? 'bg-amber-400' : 'bg-emerald-400'
                            return (
                              <div key={i} className={`rounded-xl border ${bgClass} p-4 ${i === 0 ? 'ring-1 ring-purple-500/30' : ''}`}>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {i === 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-500/40">Principal</span>}
                                      <p className={`text-sm font-bold ${getColorProbabilidad(prob)}`}>{pred.condicion}</p>
                                    </div>
                                    <p className="text-[11px] text-[#8888a0] leading-relaxed">{pred.descripcion}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className={`text-xl font-bold ${getColorProbabilidad(prob)} number-glow`}>{prob}%</p>
                                    <p className="text-[9px] text-[#666680] uppercase tracking-wider">probabilidad</p>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-[#0e0e1a] rounded-full overflow-hidden mb-2.5">
                                  <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${prob}%` }} />
                                </div>
                                {pred.evidencia.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {pred.evidencia.map((ev, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0e0e1a]/60 text-[#8888a0] border border-[#2a2a45]/30">
                                        {ev}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-[#2a2a45]/20">
                    <button onClick={() => detallePaciente && pedirEliminar(detallePaciente.id_paciente, `${detallePaciente.nombres} ${detallePaciente.apellidos}`)}
                      className="px-5 py-3 rounded-xl text-sm text-rose-300 hover:text-white bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 transition-all flex items-center gap-2">
                      <Trash2 size={16} />
                      Eliminar Paciente
                    </button>
                    <div className="flex items-center gap-3">
                      <button onClick={cerrarModal}
                        className="px-5 py-3 rounded-xl text-sm text-[#8888a0] hover:text-white transition-all">
                        Cerrar
                      </button>
                      <button onClick={() => detallePaciente && abrirModal('editar', detallePaciente)}
                        className="btn-primary px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                        <Edit3 size={16} />
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {renderForm()}
                  <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-[#2a2a45]/20">
                    <button onClick={cerrarModal}
                      className="px-6 py-3 rounded-xl text-base text-[#8888a0] hover:text-white transition-all">
                      Cancelar
                    </button>
                    <button onClick={guardar} disabled={submitting}
                      className="btn-primary px-8 py-3 rounded-xl text-base font-medium flex items-center gap-2.5">
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : <CheckCircle2 size={18} />}
                      {modalMode === 'editar' ? 'Actualizar' : 'Guardar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </AppLayout>
  )
}
