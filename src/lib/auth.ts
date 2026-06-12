import { User, UserRole } from '@/types/auth'

const STORAGE_KEY = 'lula_auth_user'

export async function signIn(email: string, password: string): Promise<User> {
  await new Promise(r => setTimeout(r, 500))

  const adminEmails = ['admin@lula.com', 'admin']
  const analistaEmails = ['analista@lula.com', 'analista']
  const medicoEmails = ['medico@lula.com', 'medico']

  let rol: UserRole = 'medico'
  if (adminEmails.includes(email.toLowerCase())) rol = 'admin'
  else if (analistaEmails.includes(email.toLowerCase())) rol = 'analista'
  else if (medicoEmails.includes(email.toLowerCase())) rol = 'medico'

  const user: User = {
    id: crypto.randomUUID(),
    email,
    nombre: email.split('@')[0],
    rol,
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }

  return user
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as User
  } catch {
    return null
  }
}

export function signOut(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'pacientes', 'alertas', 'predicciones', 'etl', 'reportes'],
  analista: ['dashboard', 'pacientes', 'etl'],
  medico: ['dashboard', 'pacientes', 'predicciones', 'reportes'],
}

export function hasPermission(role: UserRole, section: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(section) ?? false
}