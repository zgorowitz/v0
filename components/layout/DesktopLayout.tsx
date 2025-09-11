"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AccountSelector } from "@/components/layout/AccountSelector"
import { useUserRole } from "@/hooks/use-user-role"

interface DesktopLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Scan', href: '/scan2' },
  // { name: 'Categorias', href: '/categories' },
];

const reportsItems = [
  // { name: 'Productos', href: '/products' },
  { name: 'Dashboard', href: '/dashboard', adminOnly: true },
  { name: 'Ventas', href: '/dashboard/v2' },
  { name: 'Envios', href: '/shipments' },
];

const ajustesItems = [
  { name: 'Admin', href: '/metrics', adminOnly: true },
  { name: 'ML Account', href: '/settings', adminOnly: true },
];

export function DesktopLayout({ children }: DesktopLayoutProps) {
  const pathname = usePathname();
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAjustesOpen, setIsAjustesOpen] = useState(false);
  const { isAdmin, loading } = useUserRole()
  
  const filteredAjustesItems = ajustesItems.filter(item => 
    !item.adminOnly || isAdmin
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center h-12">
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

            {/* Centered Navigation Items */}
            <div className="flex-1 flex justify-center">
              <div className="hidden md:flex space-x-1">
                {navigationItems
                  .filter(item => !item.adminOnly || isAdmin)
                  .map((item) => {
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
                        {item.name}
                      </Link>
                    );
                  })}
                
                {/* Reports Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsReportsOpen(!isReportsOpen)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${reportsItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
                        ? 'bg-black text-white border border-gray-300' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    Reports
                    <svg className={`h-4 w-4 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isReportsOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {reportsItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsReportsOpen(false)}
                            className={`
                              block px-4 py-2 text-sm transition-colors
                              ${isActive
                                ? 'bg-black text-white'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }
                            `}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ajustes Dropdown */}
                {filteredAjustesItems.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setIsAjustesOpen(!isAjustesOpen)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${filteredAjustesItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
                          ? 'bg-black text-white border border-gray-300' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      Ajustes
                      <svg className={`h-4 w-4 transition-transform ${isAjustesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isAjustesOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        {filteredAjustesItems.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setIsAjustesOpen(false)}
                              className={`
                                block px-4 py-2 text-sm transition-colors
                                ${isActive
                                  ? 'bg-black text-white'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }
                              `}
                            >
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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