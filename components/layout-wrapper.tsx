"use client"

import type React from "react"
// import { Menu } from "lucide-react"
import { Menu, ArrowLeft, Home } from "lucide-react"   // Add after your existing lucide-react import
import Link from "next/link"                           // Add after your existing imports
import { useRouter } from "next/navigation" 

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <div className="relative min-h-screen">
          {/* Top bar */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
              aria-label="Go home"
            >
              <span className="text-2xl font-bold text-gray-800 drop-shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Laburandik
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="bg-white/90 hover:bg-white shadow-lg border-gray-200">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </SidebarTrigger>
              <button
                onClick={() => router.back()}
                className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Main content */}
          <div className="pt-20">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// export function LayoutWrapper({ children }: LayoutWrapperProps) {
//   const router = useRouter();
//   return (
//     <SidebarProvider defaultOpen={false}>
//       <AppSidebar />
//       <SidebarInset>
//         <div className="relative min-h-screen">
//           {/* Logo and hamburger menu in top bar */}
//           <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between">
//             {/* Hamburger menu button */}
//             <SidebarTrigger className="bg-white/90 hover:bg-white shadow-lg border-gray-200">
//               <Menu className="h-4 w-4" />
//               <span className="sr-only">Toggle menu</span>
//             </SidebarTrigger>
//             {/* Back button */}
//             <button
//               onClick={() => router.back()}
//               className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//               aria-label="Go back"
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </button>
//             {/* Home button */}ß
//             <Link
//               href="/"
//               className="bg-white/90 hover:bg-gray-200 shadow-lg border-gray-200 rounded p-2"
//               aria-label="Go home"
//             >
//               <Home className="h-4 w-4" />
//             </Link>
//           </div>

//             {/* Just the stylized name */}
//             <div className="text-2xl font-bold text-gray-800 drop-shadow-lg">
//               <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//                 Laburandik
//               </span>
//             </div>
//           </div>

//           {/* Main content */}
//           <div className="pt-20">{children}</div>
//         </div>
//       </SidebarInset>
//     </SidebarProvider>
//   )
// }
