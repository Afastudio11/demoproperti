import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, RefreshCw, Plus, Check, X, Loader2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/hooks/use-toast";
import { useCategoryOptions } from "@/components/category-select";

type FasumRow = { id: number; projectId: number; stageCode: string | null; fasumType: string; progressPercent: number; notes: string | null; updatedBy: string | null };
type Project = { id: number; nama: string };

const DEFAULT_FASUM_TYPES = ["Jalan", "Drainase", "Taman", "IPAL", "Masjid", "Gorong-gorong", "Gerbang", "Selokan", "Gazebo", "Paving Block"];

export default function FasumPage() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [edits, setEdits] = useState<Record<string, { progress: number; notes: string }>>({});
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const { all: fasumTypes, addMut: addFasumType } = useCategoryOptions("fasum_tipe", DEFAULT_FASUM_TYPES);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Project[]>;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fasum", selectedProject],
    queryFn: async () => {
      const url = selectedProject ? `/api/produksi/fasum?projectId=${selectedProject}` : "/api/produksi/fasum";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ rows: FasumRow[]; fasumTypes: string[] }>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (type: string) => {
      const edit = edits[type];
      if (!edit || !selectedProject) return;
      const res = await fetch("/api/produksi/fasum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(selectedProject),
          fasumType: type,
          progressPercent: edit.progress,
          notes: edit.notes || null,
          updatedBy: updatedBy || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fasum"] });
      toast({ title: "Progress fasum disimpan" });
    },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const rows = data?.rows ?? [];
  const getRow = (type: string) => rows.find(r => r.fasumType === type);
  const getProgress = (type: string) => edits[type]?.progress ?? getRow(type)?.progressPercent ?? 0;

  const avgProgress = fasumTypes.length > 0
    ? Math.round(fasumTypes.reduce((s, t) => s + getProgress(t), 0) / fasumTypes.length)
    : 0;

  async function handleAddFasumType() {
    const name = newTypeName.trim();
    if (!name) return;
    await addFasumType.mutateAsync(name);
    setNewTypeName("");
    setAddingType(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Fasum Progress</h1>
          <p className="text-sm text-muted-foreground">Monitor kemajuan fasilitas umum per proyek</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8"><RefreshCw className="size-3.5" /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Pilih Proyek</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
            <SelectContent>
              {(projects ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Diupdate Oleh</Label>
          <Input value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} placeholder="Nama PIC..." className="h-8 text-sm" />
        </div>
      </div>

      {selectedProject && (
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
          <Building2 className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Rata-rata Progress Fasum</p>
            <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden w-64">
              <div className={`h-full rounded-full ${avgProgress >= 80 ? "bg-emerald-500" : avgProgress >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
          <span className="text-2xl font-bold">{avgProgress}%</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fasumTypes.map(type => {
          const row = getRow(type);
          const progress = getProgress(type);
          const hasEdit = type in edits;

          return (
            <Card key={type} className={hasEdit ? "border-primary/30" : ""}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{type}</span>
                  {row?.updatedBy && <span className="text-[10px] text-muted-foreground">oleh: {row.updatedBy}</span>}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress >= 90 ? "bg-emerald-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right tabular-nums">{progress}%</span>
                </div>
                {selectedProject && (
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={edits[type]?.progress ?? row?.progressPercent ?? 0}
                      onChange={v => setEdits(prev => ({ ...prev, [type]: { progress: Math.min(100, Math.max(0, v)), notes: prev[type]?.notes ?? row?.notes ?? "" } }))}
                      className="h-7 text-xs w-20"
                    />
                    <Input
                      value={edits[type]?.notes ?? row?.notes ?? ""}
                      onChange={e => setEdits(prev => ({ ...prev, [type]: { progress: prev[type]?.progress ?? row?.progressPercent ?? 0, notes: e.target.value } }))}
                      placeholder="Catatan..."
                      className="h-7 text-xs flex-1"
                    />
                    <Button size="sm" className="h-7 px-2" onClick={() => saveMutation.mutate(type)} disabled={saveMutation.isPending}>
                      <Save className="size-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-dashed border-2 flex items-center justify-center min-h-[80px]">
          <CardContent className="p-3 w-full">
            {addingType ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddFasumType(); if (e.key === "Escape") { setAddingType(false); setNewTypeName(""); } }}
                  placeholder="Nama tipe fasum baru..."
                  className="flex-1 border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
                <button onClick={handleAddFasumType} disabled={!newTypeName.trim() || addFasumType.isPending} className="p-1.5 rounded-md bg-foreground text-background disabled:opacity-50">
                  {addFasumType.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                </button>
                <button onClick={() => { setAddingType(false); setNewTypeName(""); }} className="p-1.5 rounded-md border hover:bg-muted">
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingType(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-center transition-colors">
                <Plus className="size-4" /> Tambah tipe fasum baru...
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
