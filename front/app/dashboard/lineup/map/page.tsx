"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/api"
import type { BerthMapEntry } from "@/lib/types"
import {
  CaretLeftIcon,
  CaretRightIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react"

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_LABELS = ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h"]

const OP_COLORS: Record<string, string> = {
  LOAD: "bg-green-600",
  DISCHARGE: "bg-blue-600",
  STS: "bg-purple-600",
  default: "bg-slate-500",
}

const OP_LABELS: Record<string, string> = {
  LOAD: "Carga",
  DISCHARGE: "Descarga",
  STS: "STS",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getShipBarStyle(
  eta: string,
  etd: string,
  dayStart: Date
): React.CSSProperties {
  const DAY_MS = 24 * 60 * 60 * 1000
  const dayStartMs = dayStart.getTime()
  const startMs = new Date(eta).getTime()
  const endMs = new Date(etd).getTime()

  const left = Math.max(0, ((startMs - dayStartMs) / DAY_MS) * 100)
  const right = Math.min(100, ((endMs - dayStartMs) / DAY_MS) * 100)
  const width = Math.max(0.5, right - left)

  return {
    left: `${left}%`,
    width: `${width}%`,
    position: "absolute",
    top: "4px",
    bottom: "4px",
  }
}

function barColor(operationType: string): string {
  return OP_COLORS[operationType] ?? OP_COLORS.default
}

function formatTime(str: string): string {
  if (!str) return "—"
  const d = new Date(str)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipDetail = BerthMapEntry["ships"][number]

// ─── Ship Detail Modal ────────────────────────────────────────────────────────

function ShipDetailModal({
  ship,
  onClose,
}: {
  ship: ShipDetail | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!ship} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{ship?.ship_name}</DialogTitle>
        </DialogHeader>
        {ship && (
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Cliente</p>
                <p>{ship.client || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Carga</p>
                <p>{ship.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">ETA</p>
                <p>{new Date(ship.eta).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">ETD</p>
                <p>{new Date(ship.etd).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Operação</p>
                <Badge variant="outline" className="mt-0.5">
                  {OP_LABELS[ship.operation_type] ?? ship.operation_type}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Origem</p>
                <p>{ship.source || "—"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => alert("Shifting — em breve")}>
                Shifting
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Bypass — em breve")}>
                Bypass
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Ajustar ETA — em breve")}>
                Ajustar ETA
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Berth Row ────────────────────────────────────────────────────────────────

function BerthRow({
  entry,
  dayStart,
  onShipClick,
}: {
  entry: BerthMapEntry
  dayStart: Date
  onShipClick: (ship: ShipDetail) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)

  useEffect(() => {
    if (!rowRef.current) return
    const observer = new ResizeObserver(([e]) => setRowWidth(e.contentRect.width))
    observer.observe(rowRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex min-h-[52px] border-b last:border-b-0">
      {/* Left: berth info */}
      <div className="w-[100px] shrink-0 flex flex-col justify-center px-2 border-r bg-muted/20">
        <span className="text-[11px] font-bold leading-tight">
          BERÇO {entry.berth_number}
        </span>
        {entry.berth_length && (
          <span className="text-[10px] text-muted-foreground">{entry.berth_length} m</span>
        )}
      </div>

      {/* Right: timeline */}
      <div ref={rowRef} className="flex-1 relative min-h-[52px]">
        {/* Hour grid lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-border/30"
            style={{ left: `${(i / 24) * 100}%` }}
          />
        ))}

        {/* Empty label */}
        {entry.ships.length === 0 && (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/40 select-none pointer-events-none">
            Livre
          </span>
        )}

        {/* Ship bars */}
        {entry.ships.map((ship) => {
          const style = getShipBarStyle(ship.eta, ship.etd, dayStart)
          const color = barColor(ship.operation_type)
          const pxWidth = rowWidth * (parseFloat(style.width as string) / 100)
          const wide = pxWidth > 90

          const tooltipTitle = `${ship.ship_name} | ${ship.client} | ${formatTime(ship.eta)} – ${formatTime(ship.etd)} | ${ship.cargo}`

          return (
            <div
              key={ship.lineup_id}
              className={`${color} text-white rounded cursor-pointer hover:brightness-110 transition-all overflow-hidden`}
              style={style}
              title={tooltipTitle}
              onClick={() => onShipClick(ship)}
            >
              <div className="h-full flex flex-col justify-center px-1.5 overflow-hidden">
                <span className="text-[10px] font-semibold truncate leading-tight">
                  {ship.ship_name}
                </span>
                {wide && (
                  <span className="text-[9px] opacity-80 truncate leading-tight">
                    {ship.client} · {formatTime(ship.eta)}–{formatTime(ship.etd)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BerthMapPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [data, setData] = useState<BerthMapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShip, setSelectedShip] = useState<ShipDetail | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async (d: Date) => {
    const dateStr = d.toISOString().split("T")[0]
    try {
      const result = await api(`/lineup/berth-map?date=${dateStr}`)
      setData(result ?? [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData(date)
  }, [date, fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchData(date), 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, date, fetchData])

  const dayStart = getDayStart(date)

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    setDate(new Date(e.target.value + "T00:00:00"))
  }

  const dateInputValue = date.toISOString().split("T")[0]

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Operacional</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Mapa de Atracação</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate((d) => addDays(d, -1))}
              title="Dia anterior"
            >
              <CaretLeftIcon className="size-4" />
            </Button>
            <input
              type="date"
              value={dateInputValue}
              onChange={handleDateInput}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate((d) => addDays(d, 1))}
              title="Próximo dia"
            >
              <CaretRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(date)}
              className="gap-1.5"
            >
              <ArrowsClockwiseIcon className="size-3.5" />
              Atualizar
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="ml-auto"
            >
              Auto ({autoRefresh ? "ON" : "OFF"})
            </Button>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-2">
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-sm bg-green-600" />
                Carga
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-sm bg-blue-600" />
                Descarga
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-sm bg-purple-600" />
                STS
              </span>
            </div>
          </div>

          {/* Berth map panel */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {/* Hour header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-[100px] shrink-0 border-r px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">
                  Berço
                </span>
              </div>
              <div className="flex-1 relative h-7">
                {HOUR_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className="absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground"
                    style={{ left: `${(i * 3 / 24) * 100}%` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="p-4 flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : data.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                Nenhum berço disponível para {formatDate(date)}.
              </p>
            ) : (
              data.map((entry) => (
                <BerthRow
                  key={entry.berth_id}
                  entry={entry}
                  dayStart={dayStart}
                  onShipClick={setSelectedShip}
                />
              ))
            )}
          </div>
        </div>

        <ShipDetailModal ship={selectedShip} onClose={() => setSelectedShip(null)} />
      </SidebarInset>
    </SidebarProvider>
  )
}
