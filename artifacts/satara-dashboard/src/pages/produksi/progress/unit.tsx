import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASELINE: Record<number, number> = { 1: 10, 2: 25, 3: 40, 4: 55, 5: 70, 6: 85, 7: 95, 8: 100 };

const fmtPct = (n: number) => `${Math.round(n)}%`;

function getStatus(progress: number, weekStarted: number | null): { label: string; color: string } {
  if (!weekStarted) return { label: "Belum Mulai", color: "text-muted-foreground" };
  const week = Math.min(8, weekStarted);
  const target = BASELINE[week] ?? 100;
  const dev = progress - target;
  if (dev >= 5) return { label: "Ahead", color: "text-emerald-600" };
  if (dev >= -5) return { label: "On Track", color: "text-blue-600" };
  if (dev >= -15) return { label: "Warning", color: "text-amber-600" };
  return { label: "Critical", color: "text-red-600" };
}

type Task = { id: number; item: string; bobot: number; status: string; tanggalSelesai: string | null; verifiedBy: string | null };
type UnitRow = { id: number; blok: string; nomor: string; tipe: string; stageCode: string | null; progress: number; weekStarted: number | null; subkonName: string | null; tasks: Task[] };
type ProjectRow = { projectId: number; projectName: string; totalUnits: number; avgProgress: number; units: UnitRow[] };

export default function ProgressUnit() {
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/progress/summary");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ProjectRow[]>;
    },
  });

  const seedMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const res = await fetch(`/api/produksi/units/seed-tasks/${unitId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["progress-summary"] }); },
  });

  const taskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/construction/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, tanggalSelesai: status === "selesai" ? new Date().toISOString().split("T")[0] : null }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-summary"] });
      toast({ title: "Item diperbarui" });
    },
  });

  const allUnits: UnitRow[] = (data ?? []).flatMap(p => p.units.map(u => ({ ...u, projectName: p.projectName })));

  const filtered = allUnits.filter(u => {
    if (filterProject !== "all" && !u.blok.toLowerCase().includes(filterProject.toLowerCase())) return false;
    const st = getStatus(u.progress, u.weekStarted);
    if (filterStatus !== "all" && st.label.toLowerCase() !== filterStatus.toLowerCase()) return false;
    const q = search.toLowerCase();
    if (q && !`${u.blok}${u.nomor}${u.tipe}${u.subkonName ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const projects = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Progress Unit — Checklist 26 Item</h1>
          <p className="text-sm text-muted-foreground">Klik unit untuk lihat dan update progress pekerjaan</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari unit..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Semua proyek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projects.map(p => <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="ahead">Ahead</SelectItem>
            <SelectItem value="on track">On Track</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data unit...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {allUnits.length === 0 ? "Belum ada unit. Tambahkan unit di menu Daftar Proyek." : "Unit tidak ditemukan."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((unit) => {
            const st = getStatus(unit.progress, unit.weekStarted);
            const isExpanded = expandedUnit === unit.id;
            const completedTasks = unit.tasks.filter(t => t.status === "selesai").length;
            const hasNoTasks = unit.tasks.length === 0;

            return (
              <Card key={unit.id} className={`transition-all ${isExpanded ? "ring-1 ring-primary/30" : ""}`}>
                <div
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    setExpandedUnit(isExpanded ? null : unit.id);
                    if (!isExpanded && hasNoTasks) seedMutation.mutate(unit.id);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Blok {unit.blok}-{unit.nomor}</span>
                      {unit.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{unit.stageCode}</span>}
                      <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${unit.progress >= 100 ? "bg-emerald-500" : unit.progress >= 70 ? "bg-blue-500" : unit.progress >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${unit.progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-10 shrink-0">{fmtPct(unit.progress)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{unit.tipe}</div>
                    {!hasNoTasks && <div className="text-[10px] text-muted-foreground">{completedTasks}/{unit.tasks.length} item</div>}
                  </div>
                  {isExpanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-3 pt-2">
                    {(seedMutation.isPending && hasNoTasks) ? (
                      <div className="text-xs text-muted-foreground py-2 text-center">Menginisialisasi checklist...</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Checklist Pekerjaan Standar (26 Item)</span>
                          {unit.subkonName && <span className="text-[10px] text-muted-foreground">Subkon: {unit.subkonName}</span>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                          {unit.tasks.map(task => (
                            <div
                              key={task.id}
                              onClick={() => taskMutation.mutate({ id: task.id, status: task.status === "selesai" ? "belum_mulai" : "selesai" })}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-muted/50 ${task.status === "selesai" ? "opacity-60" : ""}`}
                            >
                              {task.status === "selesai" ? (
                                <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="size-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={`text-xs flex-1 ${task.status === "selesai" ? "line-through text-muted-foreground" : ""}`}>{task.item}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{task.bobot}%</span>
                            </div>
                          ))}
                        </div>
                        {unit.tasks.length === 0 && (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            <Button size="sm" variant="outline" onClick={() => seedMutation.mutate(unit.id)} className="h-7 text-xs">
                              Inisialisasi 26-Item Checklist
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
