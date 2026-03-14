"use client"

import * as React from "react"
import { useState, useEffect } from "react"
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
  PlusIcon,
  SpinnerGapIcon,
  XIcon,
  FlaskIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { api } from "@/lib/api"
import type { BerthingRequest, Perturbation, SimulateScenarioResult } from "@/lib/types"

interface PerturbationRow extends Perturbation {
  _key: number
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SimulatePage() {
  const [requests, setRequests] = useState<BerthingRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const [perturbations, setPerturbations] = useState<PerturbationRow[]>([])
  const [perturbForm, setPerturbForm] = useState<Perturbation>({
    type: "delay_eta",
    request_id: "",
    hours: 4,
  })
  const [keyCounter, setKeyCounter] = useState(0)

  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState<SimulateScenarioResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRequestsLoading(true)
    api("/lineup/requests/?status=WAITING")
      .then((data) => setRequests(Array.isArray(data) ? data : data?.results ?? []))
      .catch(() => setRequests([]))
      .finally(() => setRequestsLoading(false))
  }, [])

  function addPerturbationFromRequest(req: BerthingRequest) {
    const alreadyAdded = perturbations.some((p) => p.request_id === req.id)
    if (alreadyAdded) return
    setPerturbations((prev) => [
      ...prev,
      { type: "delay_eta", request_id: req.id, hours: 4, _key: keyCounter },
    ])
    setKeyCounter((k) => k + 1)
  }

  function addPerturbationFromForm() {
    if (!perturbForm.request_id.trim()) return
    setPerturbations((prev) => [
      ...prev,
      { ...perturbForm, _key: keyCounter },
    ])
    setKeyCounter((k) => k + 1)
    setPerturbForm({ type: "delay_eta", request_id: "", hours: 4 })
  }

  function removePerturbation(key: number) {
    setPerturbations((prev) => prev.filter((p) => p._key !== key))
  }

  function updatePerturbationType(key: number, type: Perturbation["type"]) {
    setPerturbations((prev) =>
      prev.map((p) =>
        p._key === key
          ? { ...p, type, hours: type === "cancel" ? undefined : (p.hours ?? 4) }
          : p
      )
    )
  }

  function updatePerturbationHours(key: number, hours: number | undefined) {
    setPerturbations((prev) =>
      prev.map((p) => (p._key === key ? { ...p, hours } : p))
    )
  }

  async function handleSimulate() {
    setSimulating(true)
    setResult(null)
    setError(null)
    try {
      const payload = perturbations.map(({ _key, ...p }) => p)
      const res: SimulateScenarioResult = await api("/operations/simulate-scenario", {
        method: "POST",
        body: JSON.stringify({ perturbations: payload }),
      })
      setResult(res)
    } catch {
      setError("Erro ao executar simulacao de cenario. Verifique a conexao e tente novamente.")
    } finally {
      setSimulating(false)
    }
  }

  const perturbationLabel = (p: PerturbationRow) => {
    if (p.type === "delay_eta") return `Atraso ETA +${p.hours}h`
    if (p.type === "rain") return `Chuva ${p.hours}h`
    return "Cancelamento"
  }

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/lineup">Line-Up</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Simulacao de Cenarios</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center gap-2">
            <FlaskIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Simulacao de Cenarios</h1>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left panel — WAITING requests */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pedidos em Espera</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {requestsLoading ? "..." : requests.length}
                </span>
              </div>

              <div className="rounded-xl border bg-background overflow-hidden">
                {requestsLoading ? (
                  <div className="divide-y">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32 ml-auto" />
                      </div>
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                    <ClockIcon className="h-8 w-8 mb-2 opacity-40" />
                    Nenhum pedido em espera
                  </div>
                ) : (
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {requests.map((req) => {
                      const isAdded = perturbations.some((p) => p.request_id === req.id)
                      return (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{req.id}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ETA: {formatDateTime(req.eta)} &middot;{" "}
                              {req.operation_type}
                            </p>
                          </div>
                          <Button
                            variant={isAdded ? "secondary" : "outline"}
                            size="sm"
                            className="shrink-0"
                            onClick={() => addPerturbationFromRequest(req)}
                            disabled={isAdded}
                            aria-label={`Adicionar perturbacao para pedido ${req.id}`}
                          >
                            <PlusIcon className="h-3.5 w-3.5 mr-1" />
                            {isAdded ? "Adicionado" : "Perturbar"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — perturbation builder */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Construtor de Perturbacoes</h2>

              {/* Manual add form */}
              <div className="rounded-xl border bg-background p-4 grid gap-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Adicionar manualmente
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="manual-request-id">ID do Pedido</Label>
                  <Input
                    id="manual-request-id"
                    placeholder="Ex: REQ-001"
                    value={perturbForm.request_id}
                    onChange={(e) =>
                      setPerturbForm((f) => ({ ...f, request_id: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="manual-type">Tipo</Label>
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
                      <SelectTrigger id="manual-type">
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
                      <Label htmlFor="manual-hours">Horas</Label>
                      <Input
                        id="manual-hours"
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
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={addPerturbationFromForm}
                  disabled={!perturbForm.request_id.trim()}
                >
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {/* Perturbations list */}
              {perturbations.length > 0 && (
                <div className="rounded-xl border bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Perturbacoes selecionadas
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {perturbations.length}
                    </span>
                  </div>
                  <div className="divide-y max-h-[220px] overflow-y-auto">
                    {perturbations.map((p) => (
                      <div key={p._key} className="flex items-center gap-2 px-4 py-2.5">
                        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                          <span className="text-sm font-medium truncate">{p.request_id}</span>
                          <Select
                            value={p.type}
                            onValueChange={(v) =>
                              updatePerturbationType(p._key, v as Perturbation["type"])
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="delay_eta">Atraso de ETA</SelectItem>
                              <SelectItem value="rain">Chuva</SelectItem>
                              <SelectItem value="cancel">Cancelamento</SelectItem>
                            </SelectContent>
                          </Select>
                          {(p.type === "delay_eta" || p.type === "rain") && (
                            <Input
                              type="number"
                              min={1}
                              value={p.hours ?? ""}
                              onChange={(e) =>
                                updatePerturbationHours(
                                  p._key,
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                              className="h-7 text-xs w-16"
                              aria-label="Horas"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePerturbation(p._key)}
                          className="ml-1 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remover"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulate button */}
              <Button
                onClick={handleSimulate}
                disabled={simulating || perturbations.length === 0}
                className="self-end"
              >
                {simulating ? (
                  <SpinnerGapIcon className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FlaskIcon className="mr-1.5 h-4 w-4" />
                )}
                {simulating ? "Simulando..." : "Simular"}
              </Button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
              <WarningIcon className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Result panel */}
          {result && (
            <div className="flex flex-col gap-4">
              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-background p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground font-medium">Total agendados</p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    {result.metrics.total_assignments}
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <ClockIcon className="h-4 w-4 text-blue-500" />
                    <p className="text-xs text-muted-foreground font-medium">Horas de espera</p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    {result.metrics.total_wait_hours.toFixed(1)}
                    <span className="text-lg font-normal text-muted-foreground ml-0.5">h</span>
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <WarningIcon className="h-4 w-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground font-medium">Nao agendados</p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-amber-500">
                    {result.metrics.unassigned}
                  </p>
                </div>
              </div>

              {/* Assignments table */}
              {result.assignments && result.assignments.length > 0 && (
                <div className="rounded-xl border bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Atribuicoes</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Pedido
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Berco
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Navio
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Inicio
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Fim
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.assignments.map((a, i) => (
                          <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{a.request_id}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{a.berth_id}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{a.ship_id}</td>
                            <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                              {formatDateTime(a.start_time)}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                              {formatDateTime(a.end_time)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
