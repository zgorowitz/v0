"use client"

import * as React from "react"
import {
  Home,
  BarChart3,
  Package,
  ScanLine,
  Settings,
  ChevronRight,
  PanelLeft,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AccountSelector } from "@/components/layout/AccountSelector"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const iconMap = {
  Home,
  BarChart3,
  Package,
  ScanLine,
  Settings,
  Truck,
}

interface NavigationItem {
  name: string
  href: string
  icon?: keyof typeof iconMap
  adminOnly?: boolean
}

interface MainAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navigationItems: NavigationItem[]
  isAdmin?: boolean
}

export function MainAppSidebar({
  navigationItems,
  isAdmin = false,
  ...props
}: MainAppSidebarProps) {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  // Filter items based on admin status
  const filteredItems = navigationItems.filter(
    item => !item.adminOnly || isAdmin
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSidebar}
          >
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div
              className="w-8 h-8 bg-cover bg-center bg-no-repeat rounded-lg shadow-md border border-gray-200 flex-shrink-0"
              style={{
                backgroundImage: "url('/images/background.png')",
              }}
            />
            <div className="grid text-left text-sm leading-tight">
              <span className="font-semibold">Laburandik</span>
              <span className="text-xs text-muted-foreground">Scanner App</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon ? iconMap[item.icon] : null
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                    <Link href={item.href}>
                      {Icon && <Icon />}
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AccountSelector />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
