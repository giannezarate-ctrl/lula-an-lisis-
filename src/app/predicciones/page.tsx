'use client'

import { useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Brain, Activity, Heart, Droplets, Wind, Thermometer,
  AlertTriangle, Shield, TrendingUp, Lightbulb,
  ChevronRight, Sparkles, Weight, Zap,
} from 'lucide-react'
import {
  calcularIMC, calcularRiesgoScore, generarFactoresRiesgo,
  generarRecomendaciones, generarExplicacion,
} from '@/lib/utils'
import { PacienteFormData } from '@/types/pacientes'

const inputClases = "glass-input w-full rounded-xl px-4 py-3 text-base transition-all"

const riesgoStyles: Record<string, { color: string; bar: string; border: string; icon: typeof Shield }> = {
  Bajo: { color: 'text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/20', icon: Shield },
  Medio: { color: 'text-amber-400', bar: 'bg-amber-500', border: 'border-amber-500/20', icon: Shield },
  Alto: { color: 'text-red-400', bar: 'bg-red-500', border: 'border-red-500/20', icon: Shield },
  Critico: { color: 'text-rose-400', bar: 'bg-rose-500', border: 'border-rose-500/20', icon: Shield },
}

export default function PrediccionesPage() {
  const [form, setForm] = useState({
    edad: 45, peso: 75, altura: 170, presion_sistolica: 120,
    presion_diastolica: 80, frecuencia_cardiaca: 75, glucosa: 100,
    colesterol: 200, fumador: false, sexo: 'Masculino' as string,
    antecedentes_familiares: false, consumo_alcohol: false,
    actividad_fisica: 'moderada' as string, temperatura: 36.5,
    saturacion_oxigeno: 98,
  })

  const [resultado, setResultado] = useState<null | {
    riesgo: string; score: number; probabilidad: number
    factores: string[]; explicacion: string; recomendaciones: string[]
  }>(null)
  const [predicting, setPredicting] = useState(false)

  function predecir() {
    setPredicting(true)
    setTimeout(() => {
      const p: PacienteFormData = {
        id_paciente: 0, nombres: '', apellidos: '', edad: form.edad,
        sexo: form.sexo, peso: form.peso, altura: form.altura,
        presion_sistolica: form.presion_sistolica,
        presion_diastolica: form.presion_diastolica,
        frecuencia_cardiaca: form.frecuencia_cardiaca, glucosa: form.glucosa,
        colesterol: form.colesterol, saturacion_oxigeno: form.saturacion_oxigeno,
        temperatura: form.temperatura,
        antecedentes_familiares: form.antecedentes_familiares,
        fumador: form.fumador, consumo_alcohol: form.consumo_alcohol,
        actividad_fisica: form.actividad_fisica,
        diagnostico_preliminar: '',
        fecha_consulta: new Date().toISOString().split('T')[0],
      }
      const score = calcularRiesgoScore(p)
      const factores = generarFactoresRiesgo(p)
      const riesgo = score >= 15 ? 'Critico' : score >= 10 ? 'Alto' : score >= 5 ? 'Medio' : 'Bajo'
      const probabilidad = Math.round((score / 30) * 100)
      setResultado({ riesgo, score, probabilidad, factores, explicacion: generarExplicacion(riesgo, score, factores), recomendaciones: generarRecomendaciones(riesgo, factores) })
      setPredicting(false)
    }, 1200)
  }

  const toggleForm = (key: 'fumador' | 'antecedentes_familiares' | 'consumo_alcohol') => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const imc = form.peso > 0 && form.altura > 0 ? calcularIMC(form.peso, form.altura) : null

  const inputGroup = (label: string, key: string, opts?: { type?: string; step?: string; options?: string[] }) => (
    <div>
      <label className="text-sm text-[#8888a0] block mb-2 font-medium">{label}</label>
      {opts?.options ? (
        <select value={form[key as keyof typeof form] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} className={inputClases}>
          {opts.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={opts?.type || 'number'} step={opts?.step || '1'}
          value={form[key as keyof typeof form] as number || ''}
          onChange={e => setForm({ ...form, [key]: opts?.type === 'number' || !opts?.type ? parseFloat(e.target.value) || 0 : e.target.value })}
          className={inputClases} />
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="w-full space-y-8 relative z-10">
        <div className="animate-slide-left">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20 border-gradient-flow">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Predicciones AI</h1>
              <p className="text-[#8888a0] text-base mt-1">Evaluación inteligente de riesgo clínico</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/35 animate-slide-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Datos del Paciente</h2>
                <p className="text-sm text-[#8888a0]">Ingrese los valores para la predicción</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                {inputGroup('Edad', 'edad')}
                {inputGroup('Sexo', 'sexo', { options: ['Masculino', 'Femenino'] })}
              </div>
              <div className="grid grid-cols-2 gap-5">
                {inputGroup('Peso (kg)', 'peso', { step: '0.1' })}
                {inputGroup('Altura (cm)', 'altura', { step: '0.1' })}
              </div>
              {imc && (
                <div className="bg-gradient-to-r from-purple-900/15 to-violet-900/10 rounded-xl px-5 py-4 border border-purple-500/15 flex items-center gap-3 hover:border-purple-500/30 transition-all">
                  <Weight className="w-5 h-5 text-purple-400" />
                  <span className="text-base text-[#d0d0e0]">IMC: <span className="text-purple-400 font-bold">{imc.toFixed(1)}</span></span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-5">
                {inputGroup('PA Sistólica', 'presion_sistolica')}
                {inputGroup('PA Diastólica', 'presion_diastolica')}
              </div>
              <div className="grid grid-cols-2 gap-5">
                {inputGroup('Glucosa (mg/dL)', 'glucosa', { step: '0.1' })}
                {inputGroup('Colesterol (mg/dL)', 'colesterol', { step: '0.1' })}
              </div>
              <div className="grid grid-cols-2 gap-5">
                {inputGroup('FC (lpm)', 'frecuencia_cardiaca')}
                {inputGroup('Actividad Física', 'actividad_fisica', { options: ['sedentario', 'moderada', 'activa'] })}
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                {[
                  { label: 'Fumador', key: 'fumador' as const },
                  { label: 'Antecedentes Familiares', key: 'antecedentes_familiares' as const },
                  { label: 'Consumo Alcohol', key: 'consumo_alcohol' as const },
                ].map(f => (
                  <button key={f.key} onClick={() => toggleForm(f.key)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      form[f.key]
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/30 shadow-glow'
                        : 'bg-[#1a1a2e]/50 text-[#8888a0] border-[#2a2a45]/30 hover:border-purple-500/30 hover:text-purple-300'
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      form[f.key] ? 'bg-purple-500 border-purple-500' : 'border-[#555570]'
                    }`}>
                      {form[f.key] && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    {f.label}
                  </button>
                ))}
              </div>

              <button onClick={predecir} disabled={predicting}
                className="btn-primary w-full py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2.5 mt-6 relative overflow-hidden group">
                {predicting ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando...</>
                ) : (
                  <><Sparkles className="w-5 h-5 group-hover:animate-spin" /> Predecir Riesgo</>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {!resultado && !predicting && (
              <EmptyState
                icon={Brain}
                title="Predicción Inteligente"
                description={
                  <>
                    Ingrese los datos del paciente y presione{' '}
                    <span className="text-purple-400 font-medium">Predecir Riesgo</span>{' '}
                    para obtener un análisis completo con factores y recomendaciones.
                  </>
                }
                badge={{ label: 'IA Clínica', icon: Sparkles }}
                variant="default"
                size="lg"
                className="h-full"
                footerInfo={[
                  { label: 'Modelo:', value: 'LULA Risk Score v2.0', icon: Brain },
                  { label: 'Variables analizadas:', value: '12', icon: Activity },
                ]}
              />
            )}

            {predicting && (
              <div className="glass-card rounded-2xl p-10 border border-purple-500/20 h-full flex items-center justify-center animate-fade-in">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 relative">
                    <div className="absolute inset-0 border-[3px] border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <div className="absolute inset-3 border-2 border-violet-500/20 border-b-violet-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="w-7 h-7 text-purple-400/60" />
                    </div>
                  </div>
                  <p className="text-purple-400 font-semibold">Analizando datos clínicos...</p>
                  <p className="text-sm text-[#8888a0] mt-1">Evaluando factores de riesgo</p>
                </div>
              </div>
            )}

            {resultado && !predicting && (
              <>
                <div className={`glass-card rounded-2xl p-8 border animate-slide-in ${riesgoStyles[resultado.riesgo].border}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-xl ${
                      resultado.riesgo === 'Bajo' ? 'bg-emerald-500/20' :
                      resultado.riesgo === 'Medio' ? 'bg-amber-500/20' :
                      resultado.riesgo === 'Alto' ? 'bg-red-500/20' : 'bg-rose-500/20'
                    }`}>
                      <Shield className={`w-6 h-6 ${
                        resultado.riesgo === 'Bajo' ? 'text-emerald-400' :
                        resultado.riesgo === 'Medio' ? 'text-amber-400' :
                        resultado.riesgo === 'Alto' ? 'text-red-400' : 'text-rose-400'
                      }`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Resultado de la Predicción</h2>
                      <p className="text-sm text-[#8888a0]">Evaluación completada</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-6">
                    <span className={`text-4xl font-bold ${riesgoStyles[resultado.riesgo].color}`}>
                      {resultado.riesgo}
                    </span>
                    <div className="flex-1">
                      <div className="h-4 bg-[#1a1a2e] rounded-full overflow-hidden relative">
                        <div className={`h-full rounded-full transition-all duration-1000 ${riesgoStyles[resultado.riesgo].bar}`}
                          style={{ width: `${resultado.probabilidad}%` }} />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-xs font-bold text-white drop-shadow-md">{resultado.probabilidad}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-[#2a2a45]/20 hover:border-purple-500/20 transition-all">
                      <p className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">Puntaje</p>
                      <p className="text-2xl font-bold text-white">{resultado.score}/30</p>
                    </div>
                    <div className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-[#2a2a45]/20 hover:border-purple-500/20 transition-all">
                      <p className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">Factores</p>
                      <p className="text-2xl font-bold text-white">{resultado.factores.length} detectados</p>
                    </div>
                  </div>
                </div>

                {resultado.factores.length > 0 && (
                  <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/35 animate-slide-in hover-lift">
                    <div className="flex items-center gap-3 mb-5">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-semibold text-white">Factores de Riesgo</h3>
                    </div>
                    <div className="space-y-3">
                      {resultado.factores.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 text-base text-[#d0d0e0] bg-[#1a1a2e]/40 rounded-xl px-4 py-3 border border-[#2a2a45]/20 hover:border-amber-500/20 transition-all">
                          <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0 shadow-glow" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/35 animate-slide-in hover-lift">
                  <div className="flex items-center gap-3 mb-5">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-white">Explicación</h3>
                  </div>
                  <p className="text-base text-[#d0d0e0] leading-relaxed">{resultado.explicacion}</p>
                </div>

                <div className="glass-card rounded-2xl p-8 border border-[#2a2a45]/35 animate-slide-in hover-lift">
                  <div className="flex items-center gap-3 mb-5">
                    <Lightbulb className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-white">Recomendaciones</h3>
                  </div>
                  <div className="space-y-3">
                    {resultado.recomendaciones.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 text-base text-[#d0d0e0] bg-[#1a1a2e]/40 rounded-xl px-4 py-3 border border-[#2a2a45]/20 hover:border-purple-500/20 transition-all">
                        <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
