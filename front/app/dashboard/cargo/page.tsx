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
import { api } from "@/lib/api"
import type { CargoType } from "@/lib/types"
import { PlusIcon, PencilSimpleIcon, TrashIcon, PackageIcon } from "@phosphor-icons/react"

const CATEGORY_LABELS: Record<string, string> = {
  solid_bulk: "Granel Sólido",
  liquid_bulk: "Granel Líquido",
  general_cargo: "Carga Geral",
}

const CATEGORIES = Object.entries(CATEGORY_LABELS)

const emptyForm = {
  name: "",
  category: "",
}

export default function CargoPage() {
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCargo, setEditingCargo] = useState<CargoType | null>(null)
  const [deletingCargo, setDeletingCargo] = useState<CargoType | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const data = await api("/cargo/cargo-types/")
      setCargoTypes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openCreate() {
    setEditingCargo(null)
    setForm(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(cargo: CargoType) {
    setEditingCargo(cargo)
    setForm({
      name: cargo.name,
      category: cargo.category,
    })
    setError(null)
    setDialogOpen(true)
  }

  function openDelete(cargo: CargoType) {
    setDeletingCargo(cargo)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.category) {
      setError("Nome e Categoria são obrigatórios.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name,
        category: form.category,
      }
      if (editingCargo) {
        await api(`/cargo/cargo-types/${editingCargo.id}/`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
      } else {
        await api("/cargo/cargo-types/", {
          method: "POST",
          body: JSON.stringify(body),
        })
      }
      setDialogOpen(false)
      await loadData()
    } catch (e) {
      setError("Erro ao salvar. Verifique os dados e tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingCargo) return
    setSaving(true)
    try {
      await api(`/cargo/cargo-types/${deletingCargo.id}/`, { method: "DELETE" })
      setDeleteDialogOpen(false)
      setDeletingCargo(null)
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
                  <BreadcrumbPage>Cargas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageIcon className="size-5 text-muted-foreground" />
              <h1 className="text-base font-semibold">Tipos de Carga</h1>
            </div>
            <Button onClick={openCreate} size="sm">
              <PlusIcon />
              Nova Carga
            </Button>
          </div>

          <div className="rounded-none border bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Carregando...
              </div>
            ) : cargoTypes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Nenhum tipo de carga cadastrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargoTypes.map((cargo) => (
                    <TableRow key={cargo.id}>
                      <TableCell className="font-medium">{cargo.name}</TableCell>
                      <TableCell>
                        {CATEGORY_LABELS[cargo.category] ?? cargo.category}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(cargo)}
                            title="Editar"
                          >
                            <PencilSimpleIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDelete(cargo)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
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
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {editingCargo ? "Editar Tipo de Carga" : "Nova Carga"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Minério de Ferro"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              Tem certeza que deseja excluir o tipo de carga{" "}
              <span className="font-medium text-foreground">
                {deletingCargo?.name}
              </span>
              ? Esta ação não pode ser desfeita.
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
                {saving ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
