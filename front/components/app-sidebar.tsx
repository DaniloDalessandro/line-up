"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  RowsIcon,
  ChartPieIcon,
  AnchorIcon,
  PackageIcon,
  ClipboardTextIcon,
  PresentationChartIcon,
  ShieldIcon,
  QuestionIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react"

const data = {
  teams: [
    {
      name: "Lineup Itaqui",
      logo: <RowsIcon />,
      plan: "Operacional",
    },
  ],
  navMain: [
    {
      title: "Line-Up",
      url: "/dashboard",
      icon: <RowsIcon />,
      isActive: true,
    },
    {
      title: "Mapa de Atracação",
      url: "/dashboard/lineup/map",
      icon: <MapTrifoldIcon />,
    },
    {
      title: "Berços",
      url: "/dashboard/berths",
      icon: <AnchorIcon />,
    },
    {
      title: "Cargas",
      url: "/dashboard/cargo",
      icon: <PackageIcon />,
    },
    {
      title: "Clientes",
      url: "/dashboard/clients",
      icon: <ChartPieIcon />,
    },
    {
      title: "Pedidos",
      url: "/dashboard/lineup/requests",
      icon: <ClipboardTextIcon />,
    },
    {
      title: "Simulação",
      url: "/dashboard/lineup/simulate",
      icon: <PresentationChartIcon />,
    },
    {
      title: "Regras",
      url: "/dashboard/rules",
      icon: <ShieldIcon />,
    },
    {
      title: "Ajuda",
      url: "/dashboard/help",
      icon: <QuestionIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
