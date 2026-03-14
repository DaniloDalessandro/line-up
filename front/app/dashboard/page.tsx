"use client"

import { useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import type { DashboardStats, BerthMapEntry, BerthingRequest } from "@/lib/types"
import { AnchorIcon, ClockIcon, BoatIcon, HourglassIcon } from "@phosphor-icons/react"

const OP_LABELS: Record<string, string> = {
  LOAD: "Carga",
  DISCHARGE: "Descarga",
  STS: "STS",
}

function formatWaitTime(etaStr: string): string {
  const now = new Date()
  const eta = new Date(etaStr)
  const diffMs = now.getTime() - eta.getTime()
  if (diffMs < 0) return "—"
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function formatDateTime(str: string): string {
  if (!str) return "—"
  const d = new Date(str)
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function BerthStatusDot({ occupied }: { occupied: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${occupied ? "bg-red-500" : "bg-emerald-500"}`}
    />
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [berthMap, setBerthMap] = useState<BerthMapEntry[]>([])
  const [waiting, setWaiting] = useState<BerthingRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0]
    try {
      const [statsData, berthData, waitData] = await Promise.allSettled([
        api("/lineup/dashboard-stats"),
        api(`/lineup/berth-map?date=${today}`),
        api("/lineup/requests/?status=WAITING"),
      ])

      if (statsData.status === "fulfilled") setStats(statsData.value)
      if (berthData.status === "fulfilled") setBerthMap(berthData.value ?? [])
      if (waitData.status === "fulfilled") setWaiting(waitData.value ?? [])
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 30_000)
    return () => clearInterval(id)
  }, [fetchAll])

  const now = new Date()

  function getCurrentShip(entry: BerthMapEntry) {
    return entry.ships.find(
      (s) => new Date(s.eta) <= now && new Date(s.etd) >= now
    )
  }

  function getNextShip(entry: BerthMapEntry) {
    return entry.ships
      .filter((s) => new Date(s.eta) > now)
      .sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime())[0]
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Painel Operacional</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          {/* Status Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Berços Total"
                  value={stats?.berths.total ?? 0}
                  sub={`${stats?.berths.free ?? 0} livre(s)`}
                  icon={<AnchorIcon className="size-4" />}
                />
                <StatCard
                  title="Berços Ocupados"
                  value={stats?.berths.occupied ?? 0}
                  icon={<BoatIcon className="size-4" />}
                />
                <StatCard
                  title="Aguardando"
                  value={`${stats?.ships.waiting ?? 0} navios`}
                  icon={<HourglassIcon className="size-4" />}
                />
                <StatCard
                  title="Em Operação"
                  value={`${stats?.ships.operating ?? 0} navios`}
                  sub={`${stats?.ships.finished_today ?? 0} finalizados hoje`}
                  icon={<ClockIcon className="size-4" />}
                />
              </>
            )}
          </div>

          {/* Berth Occupancy */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <AnchorIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Ocupação dos Berços</h2>
            </div>
            {loading ? (
              <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            ) : berthMap.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhum berço encontrado.
              </p>
            ) : (
              <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {berthMap.map((entry) => {
                  const current = getCurrentShip(entry)
                  const next = getNextShip(entry)
                  return (
                    <div
                      key={entry.berth_id}
                      className="rounded-md border bg-muted/30 p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <BerthStatusDot occupied={!!current} />
                        <span className="text-xs font-bold">Berço {entry.berth_number}</span>
                        {entry.berth_length && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {entry.berth_length} m
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">
                        {current ? current.ship_name : (
                          <span className="text-muted-foreground">Livre</span>
                        )}
                      </p>
                      {next && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Próx: {next.ship_name} — {formatDateTime(next.eta)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Waiting Queue */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <HourglassIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Fila de Espera</h2>
              {!loading && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {waiting.length} navio(s)
                </Badge>
              )}
            </div>
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : waiting.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhum navio aguardando.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ETA</TableHead>
                      <TableHead>Navio</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Carga</TableHead>
                      <TableHead>Tipo Op.</TableHead>
                      <TableHead>Tempo de Espera</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waiting.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-xs">{formatDateTime(req.eta)}</TableCell>
                        <TableCell className="text-xs font-medium">{req.ship}</TableCell>
                        <TableCell className="text-xs">{req.client}</TableCell>
                        <TableCell className="text-xs">{req.cargo_type ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {OP_LABELS[req.operation_type] ?? req.operation_type}
                        </TableCell>
                        <TableCell className="text-xs">{formatWaitTime(req.eta)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
