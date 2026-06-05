'use client'

import { LucideIcon, Sparkles } from 'lucide-react'
import { ReactNode } from 'react'

export interface PageHeaderAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
}

export interface PageHeaderStat {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
}

export interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string | ReactNode
  badge?: { label: string; icon?: LucideIcon; color?: string }
  stats?: PageHeaderStat[]
  actions?: PageHeaderAction[]
  animated?: boolean
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  stats,
  actions,
  animated = true,
  className = '',
}: PageHeaderProps) {
  const animClass = animated ? 'animate-slide-left' : ''

  return (
    <div className={`flex flex-col gap-6 ${animClass} ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/15 to-violet-600/5 blur-md" />
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/25 group hover:scale-105 transition-transform duration-300">
              <Icon className="w-7 h-7 text-purple-400 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {title}
              </h1>
              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    badge.color || 'text-purple-400 bg-purple-500/10 border-purple-500/25'
                  }`}
                >
                  {badge.icon && <badge.icon className="w-3.5 h-3.5" />}
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[#8888a0] text-base md:text-lg mt-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {actions.map((action, i) => {
              const AIcon = action.icon
              const variant = action.variant || 'secondary'
              const variantClass = {
                primary: 'btn-primary',
                secondary: 'glass-button',
                ghost: 'text-[#8888a0] hover:text-white hover:bg-[#1a1a2e] border border-transparent',
              }[variant]
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={`${variantClass} px-6 py-3 rounded-xl text-base font-medium flex items-center gap-2.5 transition-all duration-200`}
                >
                  {action.loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : AIcon ? (
                    <AIcon className="w-5 h-5" />
                  ) : null}
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className={`grid gap-3 md:gap-4 ${
          stats.length === 1 ? 'grid-cols-1' :
          stats.length === 2 ? 'grid-cols-2' :
          stats.length === 3 ? 'grid-cols-2 md:grid-cols-3' :
          stats.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        }`}>
          {stats.map((stat, i) => {
            const SIcon = stat.icon
            return (
              <div
                key={i}
                className="glass-card rounded-xl p-4 border border-[#2a2a45]/30 bg-gradient-to-br from-[#1a1a2e]/50 to-[#12121e]/30 flex items-center gap-3"
              >
                {SIcon && (
                  <div className={`p-2 rounded-lg ${stat.color || 'bg-purple-600/15 text-purple-400'}`}>
                    <SIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#666680] uppercase tracking-wider font-medium truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
