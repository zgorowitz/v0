"use client"

import type React from "react"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { MainAppSidebar } from "@/components/main-app-sidebar"
import { useUserRole } from "@/hooks/use-user-role"

interface DesktopLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { name: 'Home', href: '/dashboard', icon: 'Home' as const, adminOnly: true  },
  { name: 'P&L', href: '/daily', icon: 'BarChart3' as const, adminOnly: true  },
  { name: 'Products', href: '/cogs', icon: 'Package' as const, adminOnly: true  },
  { name: 'Envios', href: '/shipments', icon: 'BarChart3' as const, adminOnly: true  },
  { name: 'Scan', href: '/scan2', icon: 'ScanLine' as const },
  { name: 'Settings', href: '/settings', icon: 'Settings' as const },
];

export function DesktopLayout({ children }: DesktopLayoutProps) {
  const { isAdmin, loading } = useUserRole()

  return (
    <SidebarProvider defaultOpen={false}>
      <MainAppSidebar navigationItems={navigationItems} isAdmin={isAdmin} />
      <SidebarInset className="overflow-x-hidden">
        <main className="flex flex-1 flex-col gap-4 p-4 overflow-x-hidden">
          <div className="w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}