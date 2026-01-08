import * as React from 'react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import {
  BrainIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  NetworkIcon,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useContextStore } from '@/stores/contextStore'
import { useMemoryStore } from '@/stores/memoryStore'
import { GlobalSearch } from '@/components/global-search'

const items = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboardIcon,
  },
  {
    title: 'Contexts',
    url: '/contexts',
    icon: FolderKanbanIcon,
  },
  {
    title: 'Memories',
    url: '/memories',
    icon: BrainIcon,
  },
  {
    title: 'Search',
    url: '/search',
    icon: SearchIcon,
  },
  {
    title: 'Automation',
    url: '/automation',
    icon: SparklesIcon,
  },
  {
    title: 'Relationships',
    url: '/relationships',
    icon: NetworkIcon,
  },
  {
    title: 'Test Guide',
    url: '/test-guide',
    icon: RocketIcon,
  },
]

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { contexts } = useContextStore()
  const { memories } = useMemoryStore()
  const totalMemories = memories.length
  const totalContexts = contexts.length
  const location = useLocation()

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainIcon className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Free Context</span>
              <span className="text-xs text-muted-foreground">
                Context Manager
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2 py-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contexts</span>
                  <span className="font-medium">{totalContexts}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memories</span>
                  <span className="font-medium">{totalMemories}</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/contexts/new">
                  <PlusIcon />
                  <span>New Context</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button>
                  <SettingsIcon />
                  <span>Settings</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {items.find((item) => item.url === location.pathname)?.title ||
                'Dashboard'}
            </h1>
          </div>
          <GlobalSearch />
          <Link
            to="/contexts/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 transition-all disabled:pointer-events-none disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            New Context
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </SidebarProvider>
  )
}
