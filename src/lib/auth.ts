import { User, UserRole } from '@/types/auth'

const STORAGE_KEY = 'lula_auth_user'

export async function signIn(email: string, password: string): Promise<{ user: User; error?: string }> {
  await new Promise(r => setTimeout(r, 500))

  const credentials: Record<string, { password: string; rol: UserRole }> = {
    'admin@lula.com': { password: 'admin123', rol: 'admin' },
    'analista@lula.com': { password: 'analista123', rol: 'analista' },
    'medico@lula.com': { password: 'medico123', rol: 'medico' },
  }

  const emailLower = email.toLowerCase().trim()
  const cred = credentials[emailLower]

  if (!cred) {
    return { user: { id: '', email, nombre: '', rol: 'medico' }, error: 'Correo no registrado' }
  }

  if (cred.password !== password) {
    return { user: { id: '', email, nombre: '', rol: 'medico' }, error: 'Contraseña incorrecta' }
  }

  const user: User = {
    id: crypto.randomUUID(),
    email,
    nombre: email.split('@')[0],
    rol: cred.rol,
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }

  return { user }
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