"use client"

import { useState, useEffect } from "react"
import { use } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import type { Berth, CargoType, BerthCargo, Port } from "@/lib/types"
import {
  PlusIcon,
  TrashIcon,
  AnchorIcon,
  PackageIcon,
} from "@phosphor-icons/react"

const CATEGORY_LABELS: Record<string, string> = {
  solid_bulk: "Granel Sólido",
  liquid_bulk: "Granel Líquido",
  general_cargo: "Carga Geral",
}

const emptyForm = {
  cargo_type: "",
  max_prancha: null as string | null,
  priority: 1,
}

export default function BerthCargoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [berth, setBerth] = useState<Berth | null>(null)
  const [portName, setPortName] = useState<string>("")
  const [berthCargos, setBerthCargos] = useState<BerthCargo[]>([])
  const [allCargos, setAllCargos] = useState<CargoType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<BerthCargo | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [berthData, berthCargoData, allCargoData] = await Promise.all([
        api(`/berths/${id}/`),
        api(`/berths/berth-cargo/?berth=${id}`),
        api("/cargo/cargo-types/"),
      ])
      setBerth(berthData)
      setBerthCargos(berthCargoData)
      setAllCargos(allCargoData)

      // Fetch port name
      try {
        const portData: Port = await api(`/ports/${berthData.port}/`)
        setPortName(portData.name)
      } catch {
        setPortName(berthData.port)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // Cargo types not yet linked to this berth
  const linkedCargoIds = new Set(berthCargos.map((bc) => bc.cargo_type))
  const availableCargos = allCargos.filter((c) => !linkedCargoIds.has(c.id))

  function openAdd() {
    setForm(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  function openDelete(entry: BerthCargo) {
    setDeletingEntry(entry)
    setDeleteDialogOpen(true)
  }

  async function handleAdd() {
    if (!form.cargo_type) {
      setError("Selecione um tipo de carga.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api("/berths/berth-cargo/", {
        method: "POST",
        body: JSON.stringify({
          berth: id,
          cargo_type: form.cargo_type,
          max_prancha: form.max_prancha || null,
          priority: form.priority,
        }),
      })
      setDialogOpen(false)
      await loadData()
    } catch (e) {
      setError("Erro ao adicionar carga. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingEntry) return
    setSaving(true)
    try {
      await api(`/berths/berth-cargo/${deletingEntry.id}/`, { method: "DELETE" })
      setDeleteDialogOpen(false)
      setDeletingEntry(null)
      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function getCargoName(cargoId: string) {
    return allCargos.find((c) => c.id === cargoId)?.name ?? cargoId
  }

  function getCargoCategory(cargoId: string) {
    const cat = allCargos.find((c) => c.id === cargoId)?.category ?? ""
    return CATEGORY_LABELS[cat] ?? cat
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                  <BreadcrumbLink href="/dashboard/berths">Berços</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>
                    Berço {berth?.number ?? id}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Cargas Permitidas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Berth Info Card */}
          {berth && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AnchorIcon className="size-4 text-muted-foreground" />
                  Berço {berth.number}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Porto</dt>
                    <dd className="font-medium">{portName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Comprimento</dt>
                    <dd className="font-medium">
                      {berth.length ? `${berth.length} m` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Calado</dt>
                    <dd className="font-medium">
                      {berth.depth ? `${berth.depth} m` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Max LOA</dt>
                    <dd className="font-medium">
                      {berth.max_loa ? `${berth.max_loa} m` : "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageIcon className="size-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">Cargas Permitidas</h2>
            </div>
            <Button
              onClick={openAdd}
              size="sm"
              disabled={availableCargos.length === 0}
            >
              <PlusIcon />
              Adicionar Carga
            </Button>
          </div>

          <div className="rounded-none border bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Carregando...
              </div>
            ) : berthCargos.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Nenhuma carga configurada para este berço.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carga</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prancha Máx (t/dia)</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berthCargos.map((bc) => (
                    <TableRow key={bc.id}>
                      <TableCell className="font-medium">
                        {getCargoName(bc.cargo_type)}
                      </TableCell>
                      <TableCell>{getCargoCategory(bc.cargo_type)}</TableCell>
                      <TableCell>{bc.max_prancha ?? "—"}</TableCell>
                      <TableCell>{bc.priority}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(bc)}
                          title="Remover"
                          className="text-destructive hover:text-destructive"
                        >
                          <TrashIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Add Cargo Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar Carga ao Berço</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="cargo_type">Tipo de Carga *</Label>
                <Select
                  value={form.cargo_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, cargo_type: v }))}
                >
                  <SelectTrigger id="cargo_type">
                    <SelectValue placeholder="Selecione o tipo de carga" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCargos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="max_prancha">Prancha Máxima (t/dia)</Label>
                <Input
                  id="max_prancha"
                  value={form.max_prancha ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_prancha: e.target.value || null,
                    }))
                  }
                  placeholder="Ex: 8000.00"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: parseInt(e.target.value) || 1,
                    }))
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar remoção</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Tem certeza que deseja remover{" "}
              <span className="font-medium text-foreground">
                {deletingEntry ? getCargoName(deletingEntry.cargo_type) : ""}
              </span>{" "}
              das cargas permitidas deste berço?
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
