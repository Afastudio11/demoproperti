import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PHASES = ["LAND", "PLAN", "LEGAL", "SELL", "BUILD", "AKAD", "HANDOVER"];
const STATUSES = [
  { value: "belum_mulai", label: "Belum Mulai", color: "text-muted-foreground" },
  { value: "on_track", label: "On Track", color: "text-emerald-600" },
  { value: "terlambat", label: "Terlambat", color: "text-red-600" },
  { value: "selesai", label: "Selesai", color: "text-blue-600" },
];

type Milestone = {
  id?: number;
  phase: string;
  taskName: string;
  targetDate: string;
  actualDate: string;
  status: string;
  progressPct: number;
  unitsDone: number;
  notes: string;
};

const newMs = (): Milestone => ({ phase: "PLAN", taskName: "", targetDate: "", actualDate: "", status: "belum_mulai", progressPct: 0, unitsDone: 0, notes: "" });

function daysDiff(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TimelinePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

  useEffect(() => {
    if (!projectId && Array.isArray(projects) && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [projectId, projects]);

  const selectProject = async (id: number) => {
    setProjectId(id);
    const rows = await fetch(`/api/planning/milestones?projectId=${id}`).then(r => r.json());
    setMilestones(rows.length > 0 ? rows : [newMs()]);
  };

  const setMs = (i: number, k: keyof Milestone, v: string | number) => {
    setMilestones(prev => {
      const next = [...prev];
      (next[i] as Record<string, unknown>)[k] = v;
      return next;
    });
  };

  const addMs = () => setMilestones(prev => [...prev, newMs()]);

  const generateFromStages = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const stages = await fetch(`/api/planning/stages?projectId=${projectId}`).then(r => r.json());
    if (!Array.isArray(stages) || stages.length === 0) {
      toast({ title: "Rencana tahapan belum tersedia", description: "Tarik dan simpan Rencana Tahapan dulu.", variant: "destructive" });
      return;
    }
    const generated = stages.map((stage: any): Milestone => ({
      phase: "BUILD",
      taskName: `${stage.stageCode} - ${stage.stageName}`,
      targetDate: stage.targetEnd ?? "",
      actualDate: "",
      status: "belum_mulai",
      progressPct: 0,
      unitsDone: 0,
      notes: `${Number(stage.totalUnits ?? 0)} unit dari baseline siteplan`,
    }));
    setMilestones(generated.length ? generated : [newMs()]);
    toast({ title: "Milestone dibuat dari Rencana Tahapan", description: `${generated.length} tahap masuk timeline.` });
  };

  const removeMs = async (i: number) => {
    const ms = milestones[i];
    if (ms.id) await fetch(`/api/planning/milestones/${ms.id}`, { method: "DELETE" });
    setMilestones(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const resp = await fetch("/api/planning/milestones/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, milestones }),
    });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    const rows = await resp.json();
    setMilestones(rows);
    await qc.invalidateQueries({ queryKey: ["planning-milestones"] });
    toast({ title: "Timeline tersimpan" });
  };

  const projectList = Array.isArray(projects) ? projects : [];

  const onTrack = milestones.filter(m => m.status === "on_track").length;
  const terlambat = milestones.filter(m => m.status === "terlambat").length;
  const selesai = milestones.filter(m => m.status === "selesai").length;
  const avgProgress = milestones.length > 0 ? milestones.reduce((s, m) => s + m.progressPct, 0) / milestones.length : 0;

  const phaseChartData = PHASES.map(phase => ({
    phase,
    count: milestones.filter(m => m.phase === phase).length,
    done: milestones.filter(m => m.phase === phase && m.status === "selesai").length,
  }));

  // Early Warning computation
  const delayWarnings = milestones
    .filter(m => m.status === "terlambat" && m.taskName)
    .map(m => ({
      type: "DELAY",
      task: m.taskName,
      phase: m.phase,
      delay: daysDiff(m.targetDate),
      target: m.targetDate,
      actual: m.actualDate,
      progress: m.progressPct,
      severity: daysDiff(m.targetDate) > 30 ? "red" : "amber",
    }));

  const upcomingWarnings = milestones
    .filter(m => m.status !== "selesai" && m.targetDate && daysUntil(m.targetDate) >= 0 && daysUntil(m.targetDate) <= 14 && m.taskName)
    .map(m => ({
      type: "DEADLINE",
      task: m.taskName,
      phase: m.phase,
      daysLeft: daysUntil(m.targetDate),
      target: m.targetDate,
      progress: m.progressPct,
      severity: daysUntil(m.targetDate) <= 3 ? "red" : "amber" as "red" | "amber",
    }));

  const noProgressWarnings = milestones
    .filter(m => m.status === "on_track" && m.progressPct === 0 && m.targetDate && m.taskName)
    .map(m => ({
      type: "STAGNANT",
      task: m.taskName,
      phase: m.phase,
      target: m.targetDate,
      severity: "amber" as "red" | "amber",
    }));

  const totalWarnings = delayWarnings.length + upcomingWarnings.length + noProgressWarnings.length;

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Timeline SPTIS</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Project Timeline Intelligence System — master schedule & milestone tracking</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generateFromStages} disabled={!projectId} className="gap-1.5"><RefreshCw className="size-3.5" />Generate dari Tahapan</Button>
          <Button size="sm" variant="outline" onClick={addMs} className="gap-1.5"><Plus className="size-3.5" />Tambah Milestone</Button>
          <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "On Track", val: onTrack, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Terlambat", val: terlambat, icon: AlertTriangle, color: "text-red-500" },
          { label: "Selesai", val: selesai, icon: CheckCircle2, color: "text-blue-500" },
          { label: "Avg Progress", val: `${avgProgress.toFixed(0)}%`, icon: null, color: "text-foreground" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabel Milestone</TabsTrigger>
          <TabsTrigger value="progress">Progress per Fase</TabsTrigger>
          <TabsTrigger value="warning" className="gap-1.5">
            Early Warning
            {totalWarnings > 0 && <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4">{totalWarnings}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Fase", "Nama Task", "Target Selesai", "Aktual", "Progress", "Status", "Ket", ""].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((ms, i) => {
                      return (
                        <tr key={i} className={`border-t ${ms.status === "terlambat" ? "bg-red-50/10" : ""}`}>
                          <td className="px-2 py-1.5">
                            <Select value={ms.phase} onValueChange={v => setMs(i, "phase", v)}>
                              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5 min-w-40">
                            <Input className="h-7 text-xs" value={ms.taskName} onChange={e => setMs(i, "taskName", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input className="h-7 w-28 text-xs" type="date" value={ms.targetDate} onChange={e => setMs(i, "targetDate", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input className="h-7 w-28 text-xs" type="date" value={ms.actualDate} onChange={e => setMs(i, "actualDate", e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <NumericInput className="h-7 w-14 text-xs" value={ms.progressPct} onChange={v => setMs(i, "progressPct", Math.min(100, Math.max(0, v)))} />
                              <span className="text-muted-foreground">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Select value={ms.status} onValueChange={v => setMs(i, "status", v)}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5 min-w-32">
                            <Input className="h-7 text-xs" value={ms.notes} onChange={e => setMs(i, "notes", e.target.value)} placeholder="Catatan..." />
                          </td>
                          <td className="px-2 py-1.5">
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => removeMs(i)}>
                              <Trash2 className="size-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Milestone per Fase</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={phaseChartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <XAxis dataKey="phase" fontSize={10} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="done" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Status Detail</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {milestones.filter(m => m.taskName).map((ms, i) => {
                  const statusDef = STATUSES.find(s => s.value === ms.status);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-12 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1">{ms.phase}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{ms.taskName}</div>
                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ms.status === "selesai" ? "bg-blue-500" : ms.status === "terlambat" ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${ms.progressPct}%` }}
                          />
                        </div>
                      </div>
                      <div className={`text-xs shrink-0 ${statusDef?.color ?? ""}`}>{ms.progressPct}%</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warning" className="mt-3 space-y-4">
          {totalWarnings === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" />
                <div className="font-semibold text-emerald-600">Semua milestone on track</div>
                <p className="text-sm text-muted-foreground mt-1">Tidak ada peringatan aktif untuk proyek ini</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Delays */}
              {delayWarnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="size-3.5 text-red-500" />DELAY ({delayWarnings.length})
                  </h3>
                  {delayWarnings.map((w, i) => (
                    <Card key={i} className="border-l-4 border-l-red-500">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] px-1">{w.phase}</Badge>
                              <span className="text-sm font-medium">{w.task}</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>Target: {fmt(w.target)}{w.actual ? ` · Aktual: ${fmt(w.actual)}` : ""}</div>
                              <div>Progress saat ini: {w.progress}%</div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-lg font-bold text-red-600">{w.delay > 0 ? `+${w.delay}` : w.delay}</div>
                            <div className="text-[10px] text-muted-foreground">hari terlambat</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Upcoming deadlines */}
              {upcomingWarnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-500" />DEADLINE DEKAT ({upcomingWarnings.length})
                  </h3>
                  {upcomingWarnings.map((w, i) => (
                    <Card key={i} className={`border-l-4 ${w.severity === "red" ? "border-l-red-500" : "border-l-amber-500"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] px-1">{w.phase}</Badge>
                              <span className="text-sm font-medium">{w.task}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Target: {fmt(w.target)} · Progress: {w.progress}%
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`text-lg font-bold ${w.severity === "red" ? "text-red-600" : "text-amber-600"}`}>{w.daysLeft}</div>
                            <div className="text-[10px] text-muted-foreground">hari lagi</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Stagnant */}
              {noProgressWarnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-500" />BELUM MULAI ({noProgressWarnings.length})
                  </h3>
                  {noProgressWarnings.map((w, i) => (
                    <Card key={i} className="border-l-4 border-l-amber-400">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1">{w.phase}</Badge>
                          <span className="text-sm font-medium">{w.task}</span>
                          <span className="text-xs text-muted-foreground ml-auto">Target: {fmt(w.target)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">Status On Track tapi progress 0% — segera mulai atau update status</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Summary */}
          {milestones.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="text-xs font-semibold mb-2">Ringkasan Proyek</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: "Total", val: milestones.filter(m => m.taskName).length, color: "text-foreground" },
                    { label: "Selesai", val: selesai, color: "text-blue-600" },
                    { label: "On Track", val: onTrack, color: "text-emerald-600" },
                    { label: "Terlambat", val: terlambat, color: "text-red-600" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
