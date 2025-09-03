"use client"

import type React from "react"
import { BarChart3, Home, QrCode, Settings, TrendingUp, Folder, Package } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AccountSelector } from "@/components/layout/AccountSelector"

interface DesktopLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  // { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: QrCode },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Ordenes', href: '/orders', icon: TrendingUp },
  { name: 'Envios', href: '/shipments', icon: Package },
  { name: 'Categorias', href: '/categories', icon: Folder },
  { name: 'Admin', href: '/metrics', icon: BarChart3 },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function DesktopLayout({ children }: DesktopLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo/Brand */}
              <Link href="/" className="flex items-center">
                <div
                  className="w-10 h-10 bg-cover bg-center bg-no-repeat rounded-lg shadow-md border border-gray-200"
                  style={{
                    backgroundImage: "url('/images/background.png')",
                  }}
                />
                <div className="ml-3 grid text-left text-sm leading-tight">
                  <span className="font-semibold">Laburandik</span>
                  <span className="text-xs text-muted-foreground">Scanner App</span>
                </div>
              </Link>

              {/* Navigation Items */}
              <div className="hidden md:flex space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-black text-white border border-gray-300' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Account Selector */}
            <div className="flex items-center">
              <AccountSelector />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}