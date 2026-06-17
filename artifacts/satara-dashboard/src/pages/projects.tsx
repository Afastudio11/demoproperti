import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListProjects,
  useCreateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey } from "@workspace/api-client-react";
import { Search, Plus, MapPin, Layers, HardHat, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { ProyekBerjalanDialog } from "@/components/proyek-berjalan-dialog";

const FASE_COLORS: Record<string, string> = {
  LAND: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  PLAN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  LEGAL: "bg-muted text-muted-foreground border-border",
  SELL: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BUILD: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  AKAD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  HANDOVER: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  SCALE: "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

const FASE_OPTIONS = [
  { value: "LAND", label: "LAND — Akuisisi Lahan" },
  { value: "PLAN", label: "PLAN — Perencanaan" },
  { value: "LEGAL", label: "LEGAL — Perizinan" },
  { value: "SELL", label: "SELL — Penjualan" },
  { value: "BUILD", label: "BUILD — Konstruksi" },
  { value: "AKAD", label: "AKAD — Akad Kredit" },
  { value: "HANDOVER", label: "HANDOVER — Serah Terima" },
  { value: "SCALE", label: "SCALE — Ekspansi" },
];

const defaultForm = {
  nama: "",
  lokasi: "",
  kabupaten: "",
  kecamatan: "",
  totalUnit: "",
  fase: "PLAN" as string,
  status: "active" as string,
  targetStart: "",
  targetEnd: "",
};

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [openWizard, setOpenWizard] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = projects?.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nama.trim()) e.nama = "Nama proyek wajib diisi";
    if (!form.lokasi.trim()) e.lokasi = "Lokasi wajib diisi";
    const unit = parseInt(form.totalUnit);
    if (!form.totalUnit || isNaN(unit) || unit < 1) e.totalUnit = "Total unit harus angka ≥ 1";
    return e;
  }

  function handleOpen() {
    setForm(defaultForm);
    setErrors({});
    setOpen(true);
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    try {
      await createProject.mutateAsync({
        data: {
          nama: form.nama.trim(),
          lokasi: form.lokasi.trim(),
          kabupaten: form.kabupaten.trim() || undefined,
          kecamatan: form.kecamatan.trim() || undefined,
          totalUnit: parseInt(form.totalUnit),
          fase: form.fase as any,
          status: form.status as any,
          targetStart: form.targetStart || undefined,
          targetEnd: form.targetEnd || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setOpen(false);
      setForm(defaultForm);
    } catch {
      setErrors({ submit: "Gagal menyimpan proyek. Coba lagi." });
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Daftar Proyek</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola seluruh proyek Satara Development</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenWizard(true)}
            className="h-9 gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          >
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">Input Proyek Berjalan</span>
          </Button>
          <Button
            onClick={handleOpen}
            className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Proyek Baru</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card p-2.5 rounded-lg border">
        <Search className="size-4 text-muted-foreground ml-1 shrink-0" />
        <Input
          placeholder="Cari proyek..."
          className="border-0 bg-transparent ring-offset-0 focus-visible:ring-0 h-7 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat data...</div>
      ) : filtered?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="text-4xl">🏗️</div>
          <div className="font-medium">Belum ada proyek</div>
          <div className="text-sm text-muted-foreground max-w-xs">
            Tambahkan proyek pertama Satara Development. Proyek ini akan tersambung ke semua modul — Perencanaan, Legal, Marketing, Produksi, dan Serah Terima.
          </div>
          <Button onClick={handleOpen} className="mt-2 gap-1.5 bg-foreground hover:bg-foreground/90 text-background">
            <Plus className="size-4" />
            Tambah Proyek Baru
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((project) => (
            <div
              key={project.id}
              className="bg-card text-card-foreground rounded-xl border p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-sm leading-tight hover:underline line-clamp-1"
                  >
                    {project.nama}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground line-clamp-1">{project.lokasi}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                    FASE_COLORS[project.fase] ?? "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {project.fase}
                </span>
              </div>

              <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Total Unit</div>
                    <div className="font-medium flex items-center gap-1">
                      <Layers className="size-3" />
                      {project.totalUnit}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Status</div>
                    <div className="font-medium capitalize">{project.status}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-muted/50 border-border/50"
                >
                  <Link href={`/projects/${project.id}`}>Detail Proyek</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-muted/50 border-border/50"
                  title="Lihat di Produksi"
                >
                  <Link href={`/produksi?projectId=${project.id}`}>
                    <HardHat className="size-3" />
                    Produksi
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProyekBerjalanDialog
        open={openWizard}
        onOpenChange={setOpenWizard}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Proyek Baru</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nama">Nama Proyek <span className="text-destructive">*</span></Label>
              <Input id="nama" placeholder="cth: Perumahan Griya Sejahtera" {...field("nama")} />
              {errors.nama && <p className="text-xs text-destructive">{errors.nama}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="lokasi">Lokasi / Alamat <span className="text-destructive">*</span></Label>
              <Input id="lokasi" placeholder="cth: Jl. Poros Bantaeng KM 12" {...field("lokasi")} />
              {errors.lokasi && <p className="text-xs text-destructive">{errors.lokasi}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="kabupaten">Kabupaten</Label>
                <Input id="kabupaten" placeholder="cth: Bantaeng" {...field("kabupaten")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="kecamatan">Kecamatan</Label>
                <Input id="kecamatan" placeholder="cth: Bantaeng" {...field("kecamatan")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="totalUnit">Total Unit <span className="text-destructive">*</span></Label>
                <Input id="totalUnit" type="number" min={1} placeholder="cth: 100" {...field("totalUnit")} />
                {errors.totalUnit && <p className="text-xs text-destructive">{errors.totalUnit}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Fase</Label>
                <Select value={form.fase} onValueChange={(v) => setForm((f) => ({ ...f, fase: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FASE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="targetStart">Target Mulai</Label>
                <Input id="targetStart" type="date" {...field("targetStart")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="targetEnd">Target Selesai</Label>
                <Input id="targetEnd" type="date" {...field("targetEnd")} />
              </div>
            </div>

            {errors.submit && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{errors.submit}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={createProject.isPending}
              className="bg-foreground hover:bg-foreground/90 text-background"
            >
              {createProject.isPending ? "Menyimpan..." : "Simpan Proyek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
