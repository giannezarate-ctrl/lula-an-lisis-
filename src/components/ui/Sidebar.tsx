'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, Users, AlertTriangle, Brain, FileText,
  ChevronLeft, ChevronRight, Menu, X, Database, BarChart3,
} from 'lucide-react'

const menuItems = [
  { href: '/dashboard', label: 'Análisis', icon: BarChart3 },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/alertas', label: 'Alertas Críticas', icon: AlertTriangle },
  { href: '/predicciones', label: 'Predicciones AI', icon: Brain },
  { href: '/etl', label: 'Carga ETL', icon: Database },
  { href: '/reportes', label: 'Reportes', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-5 left-5 z-50 lg:hidden p-3 glass-card rounded-xl text-purple-400 hover:text-purple-300 hover:border-purple-500/30 transition-all"
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
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-[80px]' : 'w-[280px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] via-[#0e0e1a] to-[#0a0a12] border-r border-[#2a2a45]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/8 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-purple-500/10 to-transparent" />

        <div className="relative z-10 flex flex-col h-full">
          <div className={`p-5 flex items-center gap-3.5 border-b border-[#2a2a45]/30 relative overflow-hidden ${
            collapsed ? 'justify-center px-2' : ''
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-transparent" />
            <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-purple-600 to-violet-400 rounded-xl flex items-center justify-center shadow-glow relative overflow-hidden group hover:scale-105 transition-transform duration-300"
              style={{ animation: 'float 4s ease-in-out infinite' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/50 to-violet-300/20" />
              <span className="relative text-white font-bold text-sm">LA</span>
            </div>
            {!collapsed && (
              <div className="min-w-0 relative">
                <h1 className="text-base font-bold text-white truncate tracking-tight">LULA ANÁLISIS</h1>
                <p className="text-[10px] text-purple-400/60 truncate tracking-wider uppercase font-medium">Plataforma Clínica</p>
              </div>
            )}
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item, idx) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    active
                      ? 'bg-gradient-to-r from-purple-600/20 to-violet-600/10 text-purple-300 border border-purple-500/25 shadow-sm'
                      : 'text-[#8888a0] hover:text-purple-300 hover:bg-purple-600/8 border border-transparent'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-purple-500 to-violet-400 rounded-full shadow-glow" />
                  )}
                  <div className={`relative ${active ? 'text-purple-400' : 'group-hover:scale-110 group-hover:text-purple-400'} transition-all duration-300`}>
                    <Icon size={20} className="transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                  </div>
                  {!collapsed && (
                    <span className="text-[15px] font-medium truncate">{item.label}</span>
                  )}
                  {active && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-glow" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className={`p-3.5 border-t border-[#2a2a45]/30 ${collapsed ? 'px-2' : ''}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl text-[#666680] hover:text-purple-400 hover:bg-purple-600/10 transition-all duration-200 group"
            >
              {collapsed ? (
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <>
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-sm">Colapsar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
