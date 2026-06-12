'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types/auth'
import { getUser as getStoredUser, signIn as authSignIn, signOut as authSignOut } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => void
  hasPermission: (section: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    setUser(u)
    setLoading(false)
  }, [])

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      setError(null)
      setLoading(true)
      const result = await authSignIn(email, password)
      if (result.error) {
        setError(result.error)
        return { error: result.error }
      }
      setUser(result.user)
      return {}
    } catch (e: any) {
      const msg = e.message || 'Error al iniciar sesión'
      setError(msg)
      return { error: msg }
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    authSignOut()
    setUser(null)
  }

  function hasPermission(section: string): boolean {
    if (!user) return false
    const perms: Record<string, string[]> = {
      admin: ['dashboard', 'pacientes', 'alertas', 'predicciones', 'etl', 'reportes'],
      analista: ['dashboard', 'pacientes', 'etl'],
      medico: ['dashboard', 'pacientes', 'predicciones', 'reportes'],
    }
    return perms[user.rol]?.includes(section) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}