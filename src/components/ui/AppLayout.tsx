'use client'

import { ReactNode, useEffect, useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 })
  const [sidebarOffset, setSidebarOffset] = useState(0)

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    const handleResize = () => {
      setSidebarOffset(window.innerWidth >= 1024 ? 280 : 0)
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
        <div className="flex-1 w-full px-6 md:px-10 lg:px-12 pt-8 pb-10 lg:pb-12 page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
