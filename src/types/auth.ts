export type UserRole = 'admin' | 'analista' | 'medico'

export interface User {
  id: string
  email: string
  nombre: string
  rol: UserRole
  avatar?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  analista: 'Analista',
  medico: 'Médico',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'from-purple-600/20 to-purple-800/10 border-purple-500/25',
  analista: 'from-blue-600/20 to-blue-800/10 border-blue-500/25',
  medico: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/25',
}