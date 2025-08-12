"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Calendar, Scan, Settings, Folder, BarChart3 } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Navigation items
const navItems = [
  {
    title: "Scanner",
    url: "/scan",
    icon: Scan,
  },
  {
    title: "Scanner 2.0",
    url: "/scan2",
    icon: Scan,
  },
  // {
  //   title: "Analytics",
  //   url: "/orders",
  //   icon: BarChart3,
  // },
  // {
  //   title: "All SKUs",
  //   url: "/skus",
  //   icon: Package,
  // },
  {
    title: "Ajustes",
    url: "/settings",
    icon: Settings,
  },
  // {
  //   title: "Categorias",
  //   url: "/categories",
  //   icon: Folder,
  // },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-2">
          <div
            className="w-10 h-10 bg-cover bg-center bg-no-repeat rounded-lg shadow-md border border-gray-200"
            style={{
              backgroundImage: "url('/images/background.png')",
            }}
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Laburandik</span>
            <span className="truncate text-xs text-muted-foreground">Scanner App</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
