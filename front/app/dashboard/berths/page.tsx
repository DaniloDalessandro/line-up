"use client"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { Berth } from "@/lib/types"
import { PlusIcon, PencilSimpleIcon, TrashIcon, AnchorIcon } from "@phosphor-icons/react"

type BerthStatus = "ATIVO" | "INATIVO" | "OCIOSO" | "MANUTENCAO"

type BerthForm = {
  name: string
  length: string | null
  depth: string | null
  max_draft: string | null
  max_loa: string | null
  max_beam: string | null
  max_air_draft: string | null
  max_dwt: string | null
  status: BerthStatus
}

const STATUS_LABELS: Record<BerthStatus, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  OCIOSO: "Ocioso",
  MANUTENCAO: "Em Manutenção",
}

const STATUS_BADGE: Record<BerthStatus, string> = {
  ATIVO: "bg-emerald-100 text-emerald-800",
  INATIVO: "bg-gray-100 text-gray-600",
  OCIOSO: "bg-yellow-100 text-yellow-800",
  MANUTENCAO: "bg-red-100 text-red-700",
}

const emptyForm: BerthForm = {
  name: "",
  length: null,
  depth: null,
  max_draft: null,
  max_loa: null,
  max_beam: null,
  max_air_draft: null,
  max_dwt: null,
  status: "ATIVO",
}

export default function BerthsPage() {
  const [berths, setBerths] = useState<Berth[]>([])
  const [defaultPortId, setDefaultPortId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingBerth, setEditingBerth] = useState<Berth | null>(null)
  const [deletingBerth, setDeletingBerth] = useState<Berth | null>(null)
  const [form, setForm] = useState<BerthForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [berthsData, portsData] = await Promise.all([
        api("/berths/"),
        api("/ports/"),
      ])
      setBerths(berthsData)
      if (portsData.length > 0) setDefaultPortId(portsData[0].id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function openCreate() {
    setEditingBerth(null)
    setForm(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(berth: Berth) {
    setEditingBerth(berth)
    setForm({
      name: (berth as any).name ?? "",
      length: berth.length,
      depth: berth.depth,
      max_draft: berth.max_draft,
      max_loa: berth.max_loa,
      max_beam: berth.max_beam,
      max_air_draft: berth.max_air_draft,
      max_dwt: berth.max_dwt,
      status: ((berth as any).status as BerthStatus) ?? "ATIVO",
    })
    setError(null)
    setDialogOpen(true)
  }

  function openDelete(berth: Berth) {
    setDeletingBerth(berth)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name,
        number: form.name,
        port: defaultPortId,
        length: form.length || null,
        depth: form.depth || null,
        max_draft: form.max_draft || null,
        max_loa: form.max_loa || null,
        max_beam: form.max_beam || null,
        max_air_draft: form.max_air_draft || null,
        max_dwt: form.max_dwt || null,
        status: form.status,
        active: form.status === "ATIVO",
      }
      if (editingBerth) {
        await api(`/berths/${editingBerth.id}/`, { method: "PUT", body: JSON.stringify(body) })
      } else {
        await api("/berths/", { method: "POST", body: JSON.stringify(body) })
      }
      setDialogOpen(false)
      await loadData()
    } catch {
      setError("Erro ao salvar berço. Verifique os dados.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingBerth) return
    setSaving(true)
    try {
      await api(`/berths/${deletingBerth.id}/`, { method: "DELETE" })
      setDeleteDialogOpen(false)
      setDeletingBerth(null)
      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Operacional</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Berços</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AnchorIcon className="size-5 text-muted-foreground" />
              <h1 className="text-base font-semibold">Berços</h1>
            </div>
            <Button onClick={openCreate} size="sm">
              <PlusIcon />
              Novo Berço
            </Button>
          </div>

          <div className="rounded-none border bg-card overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">Carregando...</div>
            ) : berths.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">Nenhum berço cadastrado.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Compr. (m)</TableHead>
                    <TableHead>Profund. (m)</TableHead>
                    <TableHead>Calado Máx (m)</TableHead>
                    <TableHead>LOA Máx (m)</TableHead>
                    <TableHead>Boca Máx (m)</TableHead>
                    <TableHead>DWT (t)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berths.map((berth) => (
                    <TableRow key={berth.id}>
                      <TableCell className="font-medium">{(berth as any).name || berth.number}</TableCell>
                      <TableCell>{berth.length ?? "—"}</TableCell>
                      <TableCell>{berth.depth ?? "—"}</TableCell>
                      <TableCell>{berth.max_draft ?? "—"}</TableCell>
                      <TableCell>{berth.max_loa ?? "—"}</TableCell>
                      <TableCell>{berth.max_beam ?? "—"}</TableCell>
                      <TableCell>{berth.max_dwt ?? "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const s = ((berth as any).status ?? (berth.active ? "ATIVO" : "INATIVO")) as BerthStatus
                          return (
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s] ?? STATUS_BADGE.INATIVO}`}>
                              {STATUS_LABELS[s] ?? s}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(berth)} title="Editar">
                            <PencilSimpleIcon />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openDelete(berth)}
                            title="Excluir" className="text-destructive hover:text-destructive">
                            <TrashIcon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingBerth ? "Editar Berço" : "Novo Berço"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}

              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Berço 01"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="length">Comprimento (m)</Label>
                  <Input id="length" type="number" step="0.01" value={form.length ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, length: e.target.value || null }))}
                    placeholder="250.0" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="depth">Profundidade (m)</Label>
                  <Input id="depth" type="number" step="0.01" value={form.depth ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, depth: e.target.value || null }))}
                    placeholder="16.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="max_draft">Calado Máximo (m)</Label>
                  <Input id="max_draft" type="number" step="0.01" value={form.max_draft ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_draft: e.target.value || null }))}
                    placeholder="14.5" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="max_loa">LOA Máxima (m)</Label>
                  <Input id="max_loa" type="number" step="0.01" value={form.max_loa ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_loa: e.target.value || null }))}
                    placeholder="240.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="max_beam">Boca Máxima (m)</Label>
                  <Input id="max_beam" type="number" step="0.01" value={form.max_beam ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_beam: e.target.value || null }))}
                    placeholder="32.0" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="max_air_draft">Calado Aéreo Máx (m)</Label>
                  <Input id="max_air_draft" type="number" step="0.01" value={form.max_air_draft ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_air_draft: e.target.value || null }))}
                    placeholder="55.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="max_dwt">DWT Máximo (t)</Label>
                  <Input id="max_dwt" type="number" step="1" value={form.max_dwt ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_dwt: e.target.value || null }))}
                    placeholder="80000" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as BerthStatus }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                      <SelectItem value="OCIOSO">Ocioso</SelectItem>
                      <SelectItem value="MANUTENCAO">Em Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Tem certeza que deseja excluir o berço{" "}
              <span className="font-medium text-foreground">
                {(deletingBerth as any)?.name || deletingBerth?.number}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
