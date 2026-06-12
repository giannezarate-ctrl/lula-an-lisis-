'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Sparkles, Shield, Database, Stethoscope } from 'lucide-react'

const roleInfo = [
  {
    role: 'admin',
    title: 'Administrador',
    description: 'Acceso total a todas las secciones',
    icon: Shield,
    color: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-500/30',
    hoverColor: 'hover:border-purple-500/50',
  },
  {
    role: 'analista',
    title: 'Analista',
    description: 'Carga y modificación de datos',
    icon: Database,
    color: 'from-blue-500 to-cyan-600',
    borderColor: 'border-blue-500/30',
    hoverColor: 'hover:border-blue-500/50',
  },
  {
    role: 'medico',
    title: 'Médico',
    description: 'Reportes, pacientes y predicciones',
    icon: Stethoscope,
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/30',
    hoverColor: 'hover:border-emerald-500/50',
  },
]

export default function LoginPage() {
  const { signIn, loading, error } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    await signIn(email, password)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/40 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
            <span className="relative text-white font-bold text-xl">LA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LULA ANÁLISIS</h1>
          <p className="text-[#8888a0] text-sm mt-1">Plataforma Inteligente de Analítica Clínica</p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/40 mb-4">
          <p className="text-xs text-[#8888a0] uppercase tracking-wider font-semibold mb-3">Selecciona tu rol</p>
          <div className="grid grid-cols-3 gap-3">
            {roleInfo.map((r) => {
              const Icon = r.icon
              const isSelected = selectedRole === r.role
              return (
                <button
                  key={r.role}
                  onClick={() => {
                    setSelectedRole(r.role)
                    setEmail(`${r.role}@lula.com`)
                    setPassword(`${r.role}123`)
                  }}
                  className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                    isSelected
                      ? `bg-gradient-to-br ${r.color}/15 ${r.borderColor} shadow-lg`
                      : `bg-white/[0.02] border-[#2a2a45]/30 ${r.hoverColor}`
                  }`}
                >
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                    isSelected ? `bg-gradient-to-br ${r.color}/30` : 'bg-white/[0.04]'
                  }`}>
                    <Icon size={18} className={isSelected ? 'text-white' : 'text-[#8888a0]'} />
                  </div>
                  <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#8888a0]'}`}>{r.title}</p>
                  <p className="text-[9px] text-[#555570] mt-0.5 leading-tight">{r.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-[#2a2a45]/40">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-2">Correo electrónico</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin, analista o médico"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#0e0e1a]/80 border border-[#2a2a45]/40 text-white text-sm placeholder:text-[#555570] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[#0e0e1a]/80 border border-[#2a2a45]/40 text-white text-sm placeholder:text-[#555570] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555570] hover:text-[#8888a0] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Iniciando sesión...</>
              ) : (
                <><Sparkles size={16} /> Iniciar Sesión</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#555570] mt-6">
          LULA ANÁLISIS v0.1.0 · Plataforma de Análisis Clínico
        </p>
      </div>
    </div>
  )
}