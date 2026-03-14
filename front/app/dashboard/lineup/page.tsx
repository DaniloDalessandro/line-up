"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  CaretDownIcon,
  CaretUpIcon,
  XIcon,
  FlaskIcon,
} from "@phosphor-icons/react"
import { api } from "@/lib/api"
import type {
  TimelineGroup,
  LineupEntry,
  Berth,
  GenerateResult,
  SimulateScenarioResult,
  Perturbation,
} from "@/lib/types"

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatDateRange(start: Date): string {
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  return `${formatDate(start)} — ${formatDate(end)}`
}

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatShortDateTime(isoString: string): string {
  const d = new Date(isoString)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const hour = String(d.getHours()).padStart(2, "0")
  return `${day}/${month} ${hour}h`
}

function getBarStyle(entry: LineupEntry, weekStart: Date): React.CSSProperties {
  const totalMs = 7 * 24 * 60 * 60 * 1000
  const start = new Date(entry.start_time).getTime()
  const end = new Date(entry.end_time).getTime()
  const weekStartMs = weekStart.getTime()

  const left = Math.max(0, ((start - weekStartMs) / totalMs) * 100)
  const right = Math.min(100, ((end - weekStartMs) / totalMs) * 100)
  const width = Math.max(0, right - left)

  return { left: `${left}%`, width: `${width}%` }
}

function sourceColor(source: LineupEntry["source"]): string {
  switch (source) {
    case "MANUAL":
      return "bg-blue-500 hover:bg-blue-600"
    case "AUTOMATIC":
      return "bg-emerald-500 hover:bg-emerald-600"
    case "SHIFTING":
      return "bg-amber-500 hover:bg-amber-600"
  }
}

function getDayColumns(weekStart: Date): { label: string; date: Date }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
    return { label: `${DAY_NAMES[d.getDay()]} ${formatDate(d)}`, date: d }
  })
}

// SVG sparkline for fitness history
function FitnessChart({ history }: { history: number[] }) {
  if (!history.length) return null
  const max = Math.max(...history)
  const min = Math.min(...history)
  const range = max - min || 1
  const w = 300
  const h = 60
  const points = history
    .map((v, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg
      width={w}
      height={h}
      className="mt-2"
      aria-label="Histórico de fitness"
      role="img"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-blue-500"
      />
    </svg>
  )
}

interface ManualEntryForm {
  ship: string
  berth: string
  start_time: string
  end_time: string
}

interface PerturbationRow extends Perturbation {
  _key: number
}

export default function LineupPage() {
  const [timelineData, setTimelineData] = useState<TimelineGroup[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [openManual, setOpenManual] = useState(false)
  const [berths, setBerths] = useState<Berth[]>([])
  const [manualForm, setManualForm] = useState<ManualEntryForm>({
    ship: "",
    berth: "",
    start_time: "",
    end_time: "",
  })
  const [submitting, setSubmitting] = useState(false)

  // Generate line-up state
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null)
  const [generatePanelOpen, setGeneratePanelOpen] = useState(true)
  // Simulated fitness history (GA doesn't return it, so we mock a descending curve for visual)
  const [fitnessHistory, setFitnessHistory] = useState<number[]>([])

  // Simulate scenario state
  const [openSimulate, setOpenSimulate] = useState(false)
  const [perturbations, setPerturbations] = useState<PerturbationRow[]>([])
  const [perturbForm, setPerturbForm] = useState<Perturbation>({
    type: "delay_eta",
    request_id: "",
    hours: 4,
  })
  const [perturbKeyCounter, setPerturbKeyCounter] = useState(0)
  const [simulating, setSimulating] = useState(false)
  const [simulateResult, setSimulateResult] = useState<SimulateScenarioResult | null>(null)
  const [openSimulateResult, setOpenSimulateResult] = useState(false)

  const fetchTimeline = useCallback(() => {
    setLoading(true)
    const start = weekStart.toISOString()
    const end = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    api(`/lineup/timeline?start=${start}&end=${end}`)
      .then((data) => setTimelineData(Array.isArray(data) ? data : []))
      .catch(() => setTimelineData([]))
      .finally(() => setLoading(false))
  }, [weekStart])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  useEffect(() => {
    api("/berths/")
      .then((data) => setBerths(Array.isArray(data) ? data : []))
      .catch(() => setBerths([]))
  }, [])

  function prevWeek() {
    setWeekStart((d) => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  function nextWeek() {
    setWeekStart((d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateResult(null)
    setFitnessHistory([])
    try {
      const result: GenerateResult = await api("/operations/generate", {
        method: "POST",
        body: JSON.stringify({}),
      })
      setGenerateResult(result)
      setGeneratePanelOpen(true)
      // Build a mock fitness history curve for visual: descending from high to result.fitness
      const gens = result.generations_run ?? 100
      const endFitness = result.fitness ?? 0
      const startFitness = endFitness * 2.5
      const history = Array.from({ length: Math.min(gens, 40) }, (_, i) => {
        const t = i / (Math.min(gens, 40) - 1)
        return startFitness - (startFitness - endFitness) * (1 - Math.exp(-5 * t))
      })
      setFitnessHistory(history)
      fetchTimeline()
    } catch {
      showToast("Erro ao gerar Line-Up")
    } finally {
      setGenerating(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualForm.ship || !manualForm.berth || !manualForm.start_time || !manualForm.end_time) return
    setSubmitting(true)
    try {
      await api("/lineup/create", {
        method: "POST",
        body: JSON.stringify({
          ship: manualForm.ship,
          berth: manualForm.berth,
          start_time: new Date(manualForm.start_time).toISOString(),
          end_time: new Date(manualForm.end_time).toISOString(),
          source: "MANUAL",
        }),
      })
      setOpenManual(false)
      setManualForm({ ship: "", berth: "", start_time: "", end_time: "" })
      fetchTimeline()
    } catch {
      // keep dialog open on error
    } finally {
      setSubmitting(false)
    }
  }

  function addPerturbation() {
    if (!perturbForm.request_id.trim()) return
    setPerturbations((prev) => [
      ...prev,
      { ...perturbForm, _key: perturbKeyCounter },
    ])
    setPerturbKeyCounter((k) => k + 1)
    setPerturbForm({ type: "delay_eta", request_id: "", hours: 4 })
  }

  function removePerturbation(key: number) {
    setPerturbations((prev) => prev.filter((p) => p._key !== key))
  }

  async function handleSimulateScenario() {
    setSimulating(true)
    try {
      const payload = perturbations.map(({ _key, ...p }) => p)
      const result: SimulateScenarioResult = await api("/operations/simulate-scenario", {
        method: "POST",
        body: JSON.stringify({ perturbations: payload }),
      })
      setSimulateResult(result)
      setOpenSimulate(false)
      setOpenSimulateResult(true)
    } catch {
      showToast("Erro ao simular cenário")
    } finally {
      setSimulating(false)
    }
  }

  const days = getDayColumns(weekStart)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Operacional</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Line-Up</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Line-Up</h1>
              <div className="flex items-center gap-1 rounded-md border bg-background px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={prevWeek}
                  aria-label="Semana anterior"
                >
                  <CaretLeftIcon className="h-4 w-4" />
                </Button>
                <span className="min-w-[140px] text-center text-sm font-medium">
                  {formatDateRange(weekStart)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={nextWeek}
                  aria-label="Proxima semana"
                >
                  <CaretRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPerturbations([])
                  setPerturbForm({ type: "delay_eta", request_id: "", hours: 4 })
                  setOpenSimulate(true)
                }}
              >
                <FlaskIcon className="mr-1.5 h-4 w-4" />
                Simular Cenario
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <SpinnerGapIcon className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="mr-1.5 h-4 w-4" />
                )}
                Gerar Line-Up
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setManualForm({
                    ship: "",
                    berth: "",
                    start_time: formatDateTimeLocal(weekStart),
                    end_time: formatDateTimeLocal(new Date(weekStart.getTime() + 12 * 60 * 60 * 1000)),
                  })
                  setOpenManual(true)
                }}
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Manual
              </Button>
            </div>
          </div>

          {/* Generate result panel */}
          {generateResult && (
            <div className="rounded-xl border bg-background overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                onClick={() => setGeneratePanelOpen((v) => !v)}
                aria-expanded={generatePanelOpen}
              >
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-sm">Line-Up Gerado</span>
                  <span className="text-sm text-muted-foreground">
                    {generateResult.generated} navios agendados &middot; Fitness:{" "}
                    {generateResult.fitness?.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    &middot; Algoritmo: {generateResult.generations_run} geracoes
                  </span>
                </div>
                {generatePanelOpen ? (
                  <CaretUpIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <CaretDownIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {generatePanelOpen && (
                <div className="border-t px-4 pb-4 pt-3">
                  {/* Fitness sparkline */}
                  {fitnessHistory.length > 1 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Convergencia do fitness</p>
                      <FitnessChart history={fitnessHistory} />
                    </div>
                  )}

                  {/* Schedule table */}
                  {generateResult.schedule && generateResult.schedule.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              Navio
                            </th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              Berco
                            </th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              Inicio
                            </th>
                            <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              Fim
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {generateResult.schedule.map((row) => (
                            <tr key={row.lineup_id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 pr-4 font-medium">{row.ship}</td>
                              <td className="py-2 pr-4 text-muted-foreground">{row.berth}</td>
                              <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                                {formatShortDateTime(row.start_time)}
                              </td>
                              <td className="py-2 text-muted-foreground tabular-nums">
                                {formatShortDateTime(row.end_time)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum agendamento retornado.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-background px-4 py-3 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
              {toast}
            </div>
          )}

          {/* Gantt chart */}
          <div className="rounded-xl border bg-background overflow-hidden">
            {/* Day header */}
            <div className="flex border-b">
              <div className="w-[120px] shrink-0 border-r px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40">
                Berco
              </div>
              <div className="flex flex-1 min-w-0">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r last:border-r-0 px-2 py-2 text-center text-xs font-medium text-muted-foreground bg-muted/40"
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-[120px] shrink-0 border-r px-3 py-4">
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex-1 px-3 py-4">
                      <Skeleton className="h-7 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timelineData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma atracacao agendada para este periodo</p>
              </div>
            ) : (
              <div className="divide-y">
                {timelineData.map((group) => (
                  <div key={group.berth_id} className="flex min-h-[52px]">
                    {/* Berth label */}
                    <div className="w-[120px] shrink-0 border-r px-3 py-2 flex items-center">
                      <span className="text-sm font-medium truncate">
                        Berco {group.berth_number}
                      </span>
                    </div>

                    {/* Timeline area */}
                    <div className="relative flex-1 min-w-0">
                      {/* Day grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r last:border-r-0 border-border/40"
                          />
                        ))}
                      </div>

                      {/* Bars */}
                      <div className="relative h-full min-h-[52px] py-2 px-0">
                        {group.entries.map((entry) => {
                          const style = getBarStyle(entry, weekStart)
                          if (parseFloat(String(style.width)) === 0) return null
                          const label = entry.ship_name || entry.ship
                          const startFormatted = new Date(entry.start_time).toLocaleString("pt-BR")
                          const endFormatted = new Date(entry.end_time).toLocaleString("pt-BR")
                          return (
                            <div
                              key={entry.id}
                              className={`absolute top-2 bottom-2 rounded transition-colors cursor-default flex items-center px-2 text-white text-xs font-medium truncate ${sourceColor(entry.source)}`}
                              style={style}
                              title={`${label}\nInicio: ${startFormatted}\nFim: ${endFormatted}\nFonte: ${entry.source}`}
                            >
                              <span className="truncate">{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-blue-500 inline-block" />
              Manual
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500 inline-block" />
              Automatico
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500 inline-block" />
              Shifting
            </div>
          </div>
        </div>

        {/* Manual Entry Dialog */}
        <Dialog open={openManual} onOpenChange={setOpenManual}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Entrada Manual</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleManualSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="manual-ship">ID do Navio</Label>
                  <Input
                    id="manual-ship"
                    placeholder="Ex: SHIP-001"
                    value={manualForm.ship}
                    onChange={(e) => setManualForm((f) => ({ ...f, ship: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-berth">Berco</Label>
                  <Select
                    value={manualForm.berth}
                    onValueChange={(v) => setManualForm((f) => ({ ...f, berth: v }))}
                    required
                  >
                    <SelectTrigger id="manual-berth">
                      <SelectValue placeholder="Selecione um berco" />
                    </SelectTrigger>
                    <SelectContent>
                      {berths.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          Berco {b.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-start">Data/Hora de Inicio</Label>
                  <Input
                    id="manual-start"
                    type="datetime-local"
                    value={manualForm.start_time}
                    onChange={(e) => setManualForm((f) => ({ ...f, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-end">Data/Hora de Fim</Label>
                  <Input
                    id="manual-end"
                    type="datetime-local"
                    value={manualForm.end_time}
                    onChange={(e) => setManualForm((f) => ({ ...f, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenManual(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <SpinnerGapIcon className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  Criar Entrada
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Simulate Scenario Dialog */}
        <Dialog open={openSimulate} onOpenChange={setOpenSimulate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Simular Cenario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Add perturbation row */}
              <div className="rounded-lg border p-3 grid gap-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Adicionar Perturbacao
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="perturb-request">ID do Pedido</Label>
                  <Input
                    id="perturb-request"
                    placeholder="Ex: REQ-001"
                    value={perturbForm.request_id}
                    onChange={(e) =>
                      setPerturbForm((f) => ({ ...f, request_id: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="perturb-type">Tipo</Label>
                  <Select
                    value={perturbForm.type}
                    onValueChange={(v) =>
                      setPerturbForm((f) => ({
                        ...f,
                        type: v as Perturbation["type"],
                        hours: v === "cancel" ? undefined : (f.hours ?? 4),
                      }))
                    }
                  >
                    <SelectTrigger id="perturb-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delay_eta">Atraso de ETA</SelectItem>
                      <SelectItem value="rain">Chuva</SelectItem>
                      <SelectItem value="cancel">Cancelamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(perturbForm.type === "delay_eta" || perturbForm.type === "rain") && (
                  <div className="grid gap-2">
                    <Label htmlFor="perturb-hours">Horas</Label>
                    <Input
                      id="perturb-hours"
                      type="number"
                      min={1}
                      value={perturbForm.hours ?? ""}
                      onChange={(e) =>
                        setPerturbForm((f) => ({
                          ...f,
                          hours: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={addPerturbation}
                  disabled={!perturbForm.request_id.trim()}
                >
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {/* Perturbation list */}
              {perturbations.length > 0 && (
                <div className="grid gap-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    Perturbacoes ({perturbations.length})
                  </p>
                  <div className="rounded-lg border divide-y">
                    {perturbations.map((p) => (
                      <div
                        key={p._key}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{p.request_id}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                            {p.type === "delay_eta"
                              ? `Atraso ${p.hours}h`
                              : p.type === "rain"
                              ? `Chuva ${p.hours}h`
                              : "Cancelado"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePerturbation(p._key)}
                          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remover perturbacao"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenSimulate(false)}
                disabled={simulating}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSimulateScenario}
                disabled={simulating || perturbations.length === 0}
              >
                {simulating && (
                  <SpinnerGapIcon className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Simular
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Simulate Result Dialog */}
        <Dialog open={openSimulateResult} onOpenChange={setOpenSimulateResult}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resultado da Simulacao</DialogTitle>
            </DialogHeader>
            {simulateResult && (
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">
                      {simulateResult.metrics.total_assignments}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total agendados</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">
                      {simulateResult.metrics.total_wait_hours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Horas de espera</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums text-amber-500">
                      {simulateResult.metrics.unassigned}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Nao agendados</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => setOpenSimulateResult(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
