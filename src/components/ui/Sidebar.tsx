'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Users, AlertTriangle, Brain, FileText,
  ChevronLeft, ChevronRight, Menu, X, Database,
  Activity, Sparkles, LogOut, User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/types/auth'

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut, hasPermission } = useAuth()
  const [badges, setBadges] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadBadges() {
      try {
        const res = await fetch('/api/pacientes?all=true')
        const data = await res.json()
        if (data.ok && Array.isArray(data.pacientes)) {
          const total = data.pacientes.length
          const criticos = data.pacientes.filter((p: any) => p.riesgo_enfermedad === 'Critico').length
          setBadges({
            pacientes: total > 0 ? String(total) : '',
            alertas: criticos > 0 ? String(criticos) : '',
          })
        }
      } catch {}
    }
    loadBadges()
  }, [])

  const allMenuItems = [
    { href: '/dashboard', label: 'Análisis', icon: BarChart3, badge: null, group: 'Principal', section: 'dashboard' },
    { href: '/pacientes', label: 'Pacientes', icon: Users, badge: badges.pacientes || null, group: 'Principal', section: 'pacientes' },
    { href: '/alertas', label: 'Alertas Críticas', icon: AlertTriangle, badge: badges.alertas || null, group: 'Principal', section: 'alertas' },
    { href: '/predicciones', label: 'Predicciones AI', icon: Brain, badge: null, group: 'Inteligencia', section: 'predicciones' },
    { href: '/etl', label: 'Carga ETL', icon: Database, badge: null, group: 'Datos', section: 'etl' },
    { href: '/reportes', label: 'Reportes', icon: FileText, badge: null, group: 'Datos', section: 'reportes' },
  ]

  const menuItems = allMenuItems.filter(item => hasPermission(item.section))

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const groups = Array.from(new Set(menuItems.map(m => m.group)))

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-5 left-5 z-50 lg:hidden p-3 glass-card rounded-xl text-purple-400 hover:text-purple-300 hover:border-purple-500/30 transition-all"
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-400 ease-out flex flex-col ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080f] via-[#0a0a14] to-[#08080f] border-r border-[#1f1f35]/60" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-purple-500/20 via-50% to-transparent" />
        <div className="absolute top-20 right-0 h-32 w-px bg-gradient-to-b from-purple-500/40 to-transparent" />
        <div className="absolute bottom-32 right-0 h-32 w-px bg-gradient-to-t from-violet-500/30 to-transparent" />

        <div className="relative z-10 flex flex-col h-full">
          <div className={`px-5 py-6 flex items-center gap-3 border-b border-[#1f1f35]/60 ${
            collapsed ? 'justify-center px-2' : ''
          }`}>
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/40 relative overflow-hidden ring-1 ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/40 rounded-full blur-[2px]" />
              <Brain className="relative w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] font-bold text-white tracking-tight leading-tight">LULA ANÁLISIS</h1>
                  <Sparkles size={10} className="text-purple-400/70" />
                </div>
                <p className="text-[9.5px] text-purple-400/80 tracking-[0.18em] uppercase font-semibold mt-0.5">Plataforma Clínica</p>
              </div>
            )}
          </div>

          {!collapsed && user && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/5 border border-purple-500/20">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-white truncate">{user.nombre}</p>
                  <p className="text-[9px] text-purple-300/70 uppercase tracking-wider font-semibold">{ROLE_LABELS[user.rol]}</p>
                </div>
              </div>
            </div>
          )}

          {!collapsed && (
            <div className="px-5 pt-6 pb-2">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-[#555570]">
                <div className="w-1 h-1 rounded-full bg-purple-500/60" />
                <span>Menú Principal</span>
              </div>
            </div>
          )}

          <nav className="flex-1 py-3 px-3 space-y-5 overflow-y-auto">
            {groups.map((group) => (
              <div key={group} className="space-y-1">
                {collapsed && group !== groups[0] && (
                  <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f35] to-transparent my-3" />
                )}
                {!collapsed && group !== groups[0] && (
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[10px] tracking-[0.2em] uppercase font-semibold text-[#555570]">
                    <div className="w-1 h-1 rounded-full bg-purple-500/40" />
                    <span>{group}</span>
                  </div>
                )}
                {menuItems.filter(m => m.group === group).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                        active
                          ? 'text-white'
                          : 'text-[#8a8aa3] hover:text-white'
                      } ${collapsed ? 'justify-center px-2' : ''}`}
                    >
                      {active && (
                        <>
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/15 via-violet-500/10 to-transparent border border-purple-500/20" />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-purple-400 via-violet-400 to-fuchsia-400 rounded-r-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        </>
                      )}
                      {!active && (
                        <div className="absolute inset-0 rounded-xl bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      )}
                      <div className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
                        <Icon size={17} className={`transition-all duration-300 ${
                          active
                            ? 'text-purple-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]'
                            : 'text-[#8a8aa3] group-hover:text-purple-400 group-hover:scale-110'
                        }`} strokeWidth={active ? 2.2 : 1.8} />
                      </div>
                      {!collapsed && (
                        <>
                          <span className={`relative text-[13.5px] truncate tracking-tight transition-all ${
                            active ? 'font-semibold' : 'font-medium'
                          }`}>{item.label}</span>
                          {item.badge && (
                            <span className={`relative ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${
                              active
                                ? 'bg-purple-500/30 text-purple-100'
                                : 'bg-white/[0.04] text-[#8a8aa3] group-hover:bg-purple-500/20 group-hover:text-purple-200'
                            } transition-colors`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className={`p-3 border-t border-[#1f1f35]/60 ${collapsed ? 'px-2' : ''}`}>
            {!collapsed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.02] border border-[#1f1f35]/40">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
                    <Activity size={13} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/90">Sistema Activo</p>
                    <p className="text-[9.5px] text-[#666680] tracking-wide">Supabase conectado</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-[11px] font-medium text-[#666680] hover:text-purple-300 hover:bg-purple-500/5 transition-all duration-200 group border border-transparent hover:border-purple-500/20"
                  >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Colapsar</span>
                  </button>
                  <button
                    onClick={signOut}
                    title="Cerrar sesión"
                    className="flex items-center justify-center p-2 rounded-lg text-[#666680] hover:text-rose-300 hover:bg-rose-500/5 transition-all duration-200 border border-transparent hover:border-rose-500/20"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  title="Expandir menú"
                  className="w-full flex items-center justify-center p-2.5 rounded-lg text-[#666680] hover:text-purple-300 hover:bg-purple-500/5 transition-all duration-200 group border border-transparent hover:border-purple-500/20"
                >
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={signOut}
                  title="Cerrar sesión"
                  className="w-full flex items-center justify-center p-2.5 rounded-lg text-[#666680] hover:text-rose-300 hover:bg-rose-500/5 transition-all duration-200 border border-transparent hover:border-rose-500/20"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}