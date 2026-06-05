'use client'

import { LucideIcon, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react'
import { ReactNode } from 'react'

export type EmptyStateVariant = 'success' | 'default' | 'warning' | 'info' | 'error' | 'purple'

export interface EmptyStateMetric {
  label: string
  value: string | number
  icon: LucideIcon
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple'
}

export interface EmptyStateAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export interface EmptyStateFooterItem {
  label: string
  value?: string
  icon?: LucideIcon
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string | ReactNode
  variant?: EmptyStateVariant
  badge?: { label: string; icon?: LucideIcon }
  metrics?: EmptyStateMetric[]
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  footerInfo?: EmptyStateFooterItem[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const variantStyles: Record<EmptyStateVariant, {
  iconColor: string
  iconBg: string
  iconBorder: string
  iconGlow: string
  accent: string
  metricColor: string
  metricBg: string
  metricBorder: string
  metricBar: string
  badgeColor: string
}> = {
  success: {
    iconColor: 'text-emerald-400',
    iconBg: 'from-emerald-500/15 to-emerald-600/5',
    iconBorder: 'border-emerald-400/20',
    iconGlow: 'from-emerald-400/20 to-emerald-600/5',
    accent: 'text-emerald-400',
    metricColor: 'text-emerald-400',
    metricBg: 'from-emerald-600/15 to-emerald-800/5',
    metricBorder: 'border-emerald-500/15',
    metricBar: 'bg-emerald-500',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  default: {
    iconColor: 'text-purple-400',
    iconBg: 'from-purple-500/15 to-violet-600/5',
    iconBorder: 'border-purple-400/20',
    iconGlow: 'from-purple-400/20 to-violet-600/5',
    accent: 'text-purple-400',
    metricColor: 'text-purple-400',
    metricBg: 'from-purple-600/15 to-purple-800/5',
    metricBorder: 'border-purple-500/15',
    metricBar: 'bg-purple-500',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  purple: {
    iconColor: 'text-purple-400',
    iconBg: 'from-purple-500/15 to-violet-600/5',
    iconBorder: 'border-purple-400/20',
    iconGlow: 'from-purple-400/20 to-violet-600/5',
    accent: 'text-purple-400',
    metricColor: 'text-purple-400',
    metricBg: 'from-purple-600/15 to-purple-800/5',
    metricBorder: 'border-purple-500/15',
    metricBar: 'bg-purple-500',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  warning: {
    iconColor: 'text-amber-400',
    iconBg: 'from-amber-500/15 to-orange-600/5',
    iconBorder: 'border-amber-400/20',
    iconGlow: 'from-amber-400/20 to-orange-600/5',
    accent: 'text-amber-400',
    metricColor: 'text-amber-400',
    metricBg: 'from-amber-600/15 to-amber-800/5',
    metricBorder: 'border-amber-500/15',
    metricBar: 'bg-amber-500',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  info: {
    iconColor: 'text-cyan-400',
    iconBg: 'from-cyan-500/15 to-blue-600/5',
    iconBorder: 'border-cyan-400/20',
    iconGlow: 'from-cyan-400/20 to-blue-600/5',
    accent: 'text-cyan-400',
    metricColor: 'text-cyan-400',
    metricBg: 'from-cyan-600/15 to-cyan-800/5',
    metricBorder: 'border-cyan-500/15',
    metricBar: 'bg-cyan-500',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  error: {
    iconColor: 'text-red-400',
    iconBg: 'from-red-500/15 to-rose-600/5',
    iconBorder: 'border-red-400/20',
    iconGlow: 'from-red-400/20 to-rose-600/5',
    accent: 'text-red-400',
    metricColor: 'text-red-400',
    metricBg: 'from-red-600/15 to-red-800/5',
    metricBorder: 'border-red-500/15',
    metricBar: 'bg-red-500',
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
}

const sizeStyles = {
  sm: { padding: 'p-8 md:p-10', iconBox: 'w-20 h-20', iconSize: 'w-9 h-9', title: 'text-xl md:text-2xl', desc: 'text-sm' },
  md: { padding: 'p-12 md:p-16', iconBox: 'w-24 h-24', iconSize: 'w-11 h-11', title: 'text-2xl md:text-3xl', desc: 'text-base' },
  lg: { padding: 'p-12 md:p-20', iconBox: 'w-28 h-28', iconSize: 'w-12 h-12', title: 'text-3xl md:text-4xl', desc: 'text-base md:text-lg' },
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'default',
  badge,
  metrics,
  primaryAction,
  secondaryAction,
  footerInfo,
  size = 'lg',
  className = '',
}: EmptyStateProps) {
  const styles = variantStyles[variant]
  const sizing = sizeStyles[size]
  const PrimaryIcon = primaryAction?.icon
  const SecondaryIcon = secondaryAction?.icon
  const BadgeIcon = badge?.icon

  return (
    <div className={`w-full animate-fade-in ${className}`}>
      {metrics && metrics.length > 0 && (
        <div className={`grid grid-cols-1 ${
          metrics.length === 1 ? 'sm:grid-cols-1' :
          metrics.length === 2 ? 'sm:grid-cols-2' :
          metrics.length === 3 ? 'sm:grid-cols-3' :
          'sm:grid-cols-2 md:grid-cols-4'
        } gap-5 mb-8`}>
          {metrics.map((m, i) => {
            const MIcon = m.icon
            const mStyle = variantStyles[m.variant || variant]
            return (
              <div
                key={m.label}
                className={`glass-card rounded-2xl p-6 border ${mStyle.metricBorder} bg-gradient-to-br ${mStyle.metricBg} animate-slide-in text-center hover-lift`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 rounded-xl bg-[#1a1a2e]/50 border border-[#2a2a45]/20">
                    <MIcon className={`w-6 h-6 ${mStyle.metricColor}`} />
                  </div>
                </div>
                <p className={`text-4xl font-bold ${mStyle.metricColor} number-glow`}>{m.value}</p>
                <p className="text-sm text-[#8888a0] mt-2 font-medium">{m.label}</p>
                <div className={`h-1 w-full mt-4 rounded-full ${mStyle.metricBar} opacity-20`} />
              </div>
            )
          })}
        </div>
      )}

      <div className="glass-card rounded-2xl border border-[#2a2a45]/30 overflow-hidden animate-scale-in">
        <div className={`relative ${sizing.padding} text-center`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${styles.iconGlow} opacity-30`} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative z-10">
            <div className={`${sizing.iconBox} mx-auto mb-8 relative group`}>
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${styles.iconGlow} blur-xl ${variant === 'success' ? 'animate-pulse' : ''}`} />
              <div
                className={`relative w-full h-full rounded-3xl bg-gradient-to-br ${styles.iconBg} flex items-center justify-center border ${styles.iconBorder} backdrop-blur-sm group-hover:scale-105 transition-all duration-500`}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${styles.iconGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <Icon className={`${sizing.iconSize} ${styles.iconColor} relative z-10 group-hover:drop-shadow-[0_0_16px_rgba(168,85,247,0.5)] transition-all duration-500`} />
              </div>
              {variant === 'success' && (
                <>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center animate-float">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                </>
              )}
              {variant !== 'success' && badge && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center animate-float">
                  {BadgeIcon ? <BadgeIcon className="w-4 h-4 text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                </div>
              )}
            </div>

            {badge && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border mb-4 animate-fade-in ${styles.badgeColor}`}
              >
                {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                {badge.label}
              </div>
            )}

            <h2 className={`${sizing.title} font-bold text-white mb-4 glow-text animate-slide-in`}>
              {title}
            </h2>
            <p
              className={`text-[#8888a0] ${sizing.desc} max-w-lg mx-auto leading-relaxed animate-fade-in`}
              style={{ animationDelay: '200ms' }}
            >
              {description}
            </p>

            {(primaryAction || secondaryAction) && (
              <div
                className="flex flex-wrap items-center justify-center gap-4 mt-10 animate-fade-in"
                style={{ animationDelay: '400ms' }}
              >
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    className="btn-primary px-6 py-3 rounded-xl text-base font-medium flex items-center gap-2.5 group relative overflow-hidden"
                  >
                    {PrimaryIcon && (
                      <PrimaryIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    )}
                    {primaryAction.label}
                    <ChevronRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  </button>
                )}
                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    className="glass-button px-6 py-3 rounded-xl text-base font-medium flex items-center gap-2.5"
                  >
                    {SecondaryIcon && <SecondaryIcon className="w-5 h-5" />}
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {footerInfo && footerInfo.length > 0 && (
          <div className="border-t border-[#2a2a45]/20 px-8 py-5 bg-[#12121e]/50">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#555570]">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {footerInfo.map((item, i) => {
                  const FIcon = item.icon
                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      {FIcon && <FIcon className="w-4 h-4" />}
                      {item.label}
                      {item.value !== undefined && (
                        <span className="text-[#8888a0] font-medium">{item.value}</span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
