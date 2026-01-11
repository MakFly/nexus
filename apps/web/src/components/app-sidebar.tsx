"use client"

import * as React from "react"
import { Link } from "@tanstack/react-router"
import { IconInnerShadowTop } from "@tabler/icons-react"
import type { Icon } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavDocuments } from "@/components/nav-documents"
import { NavUser } from "@/components/nav-user"
import { StatusCard } from "@/components/status-card"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BarChart3Icon,
  BrainIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SparklesIcon,
  NetworkIcon,
  FolderCodeIcon,
  HelpCircleIcon,
  SettingsIcon,
  GitCompareArrowsIcon,
} from "lucide-react"

const data = {
  user: {
    name: "nexus",
    email: "contact@m7academy.com",
    avatar: "/avatars/nexus-github.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Search",
      url: "/search",
      icon: SearchIcon,
    },
  ],
  content: [
    {
      name: "Memories",
      url: "/memories",
      icon: BrainIcon,
    },
    {
      name: "Relationships",
      url: "/relationships",
      icon: NetworkIcon,
    },
  ],
  tools: [
    {
      name: "Automation",
      url: "/automation",
      icon: SparklesIcon,
    },
    {
      name: "Codebase",
      url: "/codebase",
      icon: FolderCodeIcon,
    },
  ],
  analytics: [
    {
      name: "Stats",
      url: "/stats",
      icon: BarChart3Icon,
    },
  ],
  footer: [
    {
      name: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
    {
      name: "Help",
      url: "/help",
      icon: HelpCircleIcon,
    },
    {
      name: "Changelog",
      url: "/changelog",
      icon: GitCompareArrowsIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">nexus</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.content} title="Content" />
        <NavDocuments items={data.tools} title="Tools" />
        <NavDocuments items={data.analytics} title="Analytics" />
      </SidebarContent>
      <SidebarFooter>
        <NavDocuments items={data.footer} title="" />
        <StatusCard />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
