"use client"

import type React from "react"
import { useState } from "react"
import { Menu, ArrowLeft, Home, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { MobileAccountSidebar } from "@/components/layout/MobileAccountSidebar"

interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const router = useRouter();
  const [isAccountSidebarOpen, setIsAccountSidebarOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <div className="relative min-h-screen">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur-sm border-b">
            {/* Left: Menu, Back, and Home */}
            <div className="flex items-center gap-2">
              <SidebarTrigger className="bg-white hover:bg-gray-100 shadow-sm border">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </SidebarTrigger>
              
              <button
                onClick={() => router.back()}
                className="bg-white hover:bg-gray-100 shadow-sm border rounded p-2"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              
              <Link
                href="/"
                className="bg-white hover:bg-gray-100 shadow-sm border rounded p-2"
                aria-label="Go home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </div>

            {/* Right: Account Trigger */}
            <button
              onClick={() => setIsAccountSidebarOpen(true)}
              className="bg-white hover:bg-gray-100 shadow-sm border rounded p-2"
              aria-label="Open account menu"
            >
              <User className="h-4 w-4" />
            </button>
          </div>
          
          {/* Mobile Account Sidebar */}
          <MobileAccountSidebar 
            isOpen={isAccountSidebarOpen}
            onClose={() => setIsAccountSidebarOpen(false)}
          />
          
          {/* Main content */}
          <div className="pt-16">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}