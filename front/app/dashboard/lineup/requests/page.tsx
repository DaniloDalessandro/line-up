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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import { api } from "@/lib/api"
import type { BerthingRequest } from "@/lib/types"

type StatusKey = BerthingRequest["status"]
type OperationType = BerthingRequest["operation_type"]

const STATUS_LABELS: Record<StatusKey, string> = {
  WAITING: "Aguardando",
  SCHEDULED: "Agendado",
  OPERATING: "Operando",
  FINISHED: "Finalizado",
  BYPASS: "Bypass",
  CANCELLED: "Cancelado",
}

const STATUS_VARIANT: Record<StatusKey, string> = {
  WAITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
  OPERATING: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FINISHED: "bg-gray-100 text-gray-600 border-gray-200",
  BYPASS: "bg-orange-100 text-orange-800 border-orange-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

const OP_TYPE_LABELS: Record<OperationType, string> = {
  LOAD: "Carregamento",
  DISCHARGE: "Descarga",
  STS: "STS",
}

interface NewRequestForm {
  ship: string
  client: string
  cargo_type: string
  cargo_quantity: string
  eta: string
  operation_type: OperationType | ""
}

const EMPTY_FORM: NewRequestForm = {
  ship: "",
  client: "",
  cargo_type: "",
  cargo_quantity: "",
  eta: "",
  operation_type: "",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function BerthingRequestsPage() {
  const [requests, setRequests] = useState<BerthingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState<NewRequestForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  function fetchRequests() {
    setLoading(true)
    api("/lineup/requests/")
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ship || !form.client || !form.eta || !form.operation_type) return
    setSubmitting(true)
    try {
      await api("/lineup/requests/", {
        method: "POST",
        body: JSON.stringify({
          ship: form.ship,
          client: form.client,
          cargo_type: form.cargo_type || null,
          cargo_quantity: form.cargo_quantity || null,
          eta: new Date(form.eta).toISOString(),
          operation_type: form.operation_type,
        }),
      })
      setOpenNew(false)
      setForm(EMPTY_FORM)
      fetchRequests()
    } catch {
      // keep dialog open on error
    } finally {
      setSubmitting(false)
    }
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Pedidos de Atracação</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Pedidos de Atracação</h1>
            <Button
              size="sm"
              onClick={() => {
                setForm(EMPTY_FORM)
                setOpenNew(true)
              }}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Novo Pedido
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-background overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETA</TableHead>
                  <TableHead>Navio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Carga</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Tipo Op.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Bypass</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground text-sm"
                    >
                      Nenhum pedido de atracação encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(req.eta)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{req.ship}</TableCell>
                      <TableCell className="text-sm">{req.client}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.cargo_type ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {req.cargo_quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {OP_TYPE_LABELS[req.operation_type]}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_VARIANT[req.status]}`}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {req.bypass ? (
                          <span className="inline-flex items-center rounded-md border bg-orange-100 text-orange-800 border-orange-200 px-2 py-0.5 text-xs font-medium">
                            Sim
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* New Request Dialog */}
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Atracação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="req-ship">Navio *</Label>
                    <Input
                      id="req-ship"
                      placeholder="ID ou nome do navio"
                      value={form.ship}
                      onChange={(e) => setForm((f) => ({ ...f, ship: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="req-client">Cliente *</Label>
                    <Input
                      id="req-client"
                      placeholder="Nome do cliente"
                      value={form.client}
                      onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="req-cargo">Tipo de Carga</Label>
                    <Input
                      id="req-cargo"
                      placeholder="Ex: Soja, Milho..."
                      value={form.cargo_type}
                      onChange={(e) => setForm((f) => ({ ...f, cargo_type: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="req-qty">Quantidade</Label>
                    <Input
                      id="req-qty"
                      type="number"
                      placeholder="Toneladas"
                      value={form.cargo_quantity}
                      onChange={(e) => setForm((f) => ({ ...f, cargo_quantity: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="req-eta">ETA *</Label>
                    <Input
                      id="req-eta"
                      type="datetime-local"
                      value={form.eta}
                      onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="req-optype">Tipo de Operação *</Label>
                    <Select
                      value={form.operation_type}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, operation_type: v as OperationType }))
                      }
                      required
                    >
                      <SelectTrigger id="req-optype">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOAD">Carregamento</SelectItem>
                        <SelectItem value="DISCHARGE">Descarga</SelectItem>
                        <SelectItem value="STS">STS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenNew(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <SpinnerGapIcon className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  Criar Pedido
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
