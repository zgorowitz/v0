"use client"

import type React from "react"
import { BarChart3, Home, QrCode, Settings, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AccountSelector } from "@/components/AccountSelector"

interface DesktopLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Scan', href: '/scan', icon: QrCode },
  { name: 'Analytics', href: '/', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DesktopLayout({ children }: DesktopLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo/Brand */}
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ML</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-900"></span>
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
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}