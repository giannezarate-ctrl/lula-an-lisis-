'use client'

import { ReactNode, useEffect, useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-purple-400 animate-spin" />
          <p className="text-sm text-[#8888a0]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

function AppLayoutInner({ children }: { children: ReactNode }) {
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 })
  const [sidebarOffset, setSidebarOffset] = useState(0)

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    const handleResize = () => {
      setSidebarOffset(window.innerWidth >= 1024 ? 260 : 0)
    }
    handleResize()
    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="w-screen min-h-screen bg-[#0a0a12] relative overflow-x-hidden">
      <div className="orb" />
      <div className="orb" />
      <div className="orb" />
      <div className="cursor-glow" style={{ left: mousePos.x, top: mousePos.y }} />
      <Sidebar />
      <main
        className="w-full min-h-screen transition-all duration-300 flex flex-col"
        style={{ paddingLeft: sidebarOffset }}
      >
        <div className="flex-1 w-full flex justify-center pt-8 pb-12 lg:pb-16 page-enter">
          <div className="w-full max-w-[1600px] px-6 md:px-10 lg:px-14">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppLayoutInner>{children}</AppLayoutInner>
      </AuthGuard>
    </AuthProvider>
  )
}