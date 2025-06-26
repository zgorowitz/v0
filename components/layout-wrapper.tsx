"use client"

import type React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative min-h-screen">
          {/* Logo in top-left corner */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
            <div
              className="w-12 h-12 bg-cover bg-center bg-no-repeat rounded-lg shadow-lg border-2 border-white"
              style={{
                backgroundImage: "url('/images/background.png')",
              }}
            />
            <div className="text-2xl font-bold text-gray-800 drop-shadow-lg">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Laburandik
              </span>
            </div>
          </div>

          {/* Sidebar trigger for mobile */}
          <div className="absolute top-4 right-4 z-20 md:hidden">
            <SidebarTrigger className="bg-white/90 hover:bg-white shadow-lg" />
          </div>

          {/* Main content */}
          <div className="pt-20">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
