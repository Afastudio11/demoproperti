import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import SubkonSelect from "@/components/subkon-select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fmtCurrency } from "@/lib/planning-calc";
import { CheckCircle2, GitBranch, Lock, Plus, RefreshCw, Save, Send, Trash2, Unlock, XCircle } from "lucide-react";
import { Link, useSearch } from "wouter";

type Project = { id: number; nama: string; lokasi?: string };

type BlockRow = {
  id?: number;
  blockCode: string;
  unitCount: number;
  unitType: string;
  pricePerUnit: number;
  subkonId: number | null;
  subkonName: string;
  subkonValuePerUnit: number;
  targetStart: string;
  targetEnd: string;
  siteplanUnitCount?: number;
  validationStatus?: string;
  contractId?: number | null;
};

type StageRow = {
  id?: number;
  stageCode: string;
  stageName: string;
  targetStart: string;
  targetEnd: string;
  status?: string;
  lockedAt?: string | null;
  blocks: BlockRow[];
};

type BaselineSummary = {
  totalUnitShapes: number;
  duplicateLabels: string[];
  invalidLabels: string[];
  unallocatedUnitLabels: string[];
  stages?: Array<{ stageCode: string; stageName: string; totalUnits: number; blocks: Array<Record<string, any>> }>;
  blocks?: Array<Record<string, any>>;
};

const newBlock = (index = 0): BlockRow => ({
  blockCode: String.fromCharCode(65 + index),
  unitCount: 0,
  unitType: "Tipe 36",
  pricePerUnit: 0,
  subkonId: null,
  subkonName: "",
  subkonValuePerUnit: 0,
  targetStart: "",
  targetEnd: "",
});

const newStage = (index = 0): StageRow => ({
  stageCode: `T${index + 1}`,
  stageName: `Tahap ${index + 1}`,
  targetStart: "",
  targetEnd: "",
  status: "draft",
  blocks: [newBlock(0)],
});

function statusLabel(status?: string) {
  if (status === "sesuai") return { label: "Sesuai siteplan", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (status === "kurang_shape") return { label: "Unit gambar kurang", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  if (status === "lebih_shape") return { label: "Unit gambar lebih", tone: "text-blue-700 bg-blue-50 border-blue-200" };
  return { label: "Belum digambar", tone: "text-zinc-600 bg-zinc-50 border-zinc-200" };
}

export default function TahapanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const search = useSearch();
  const [projectId, setProjectId] = useState(0);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isImportingSiteplan, setIsImportingSiteplan] = useState(false);
  const [baselineSummary, setBaselineSummary] = useState<BaselineSummary | null>(null);
  const masterFillDoneRef = useRef(false);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const { data: subkonMasterRows = [] } = useQuery<Array<{ id: number; defaultValuePerUnit: number }>>({
    queryKey: ["subkon-master", "all"],
    queryFn: () => fetch("/api/produksi/subkon/master").then(r => r.json()),
  });

  async function selectProject(id: number) {
    setProjectId(id);
    const [rows, summary] = await Promise.all([
      fetch(`/api/planning/stages?projectId=${id}`).then(r => r.json()),
      fetch(`/api/planning/stages/siteplan-summary?projectId=${id}`).then(r => r.json()).catch(() => null),
    ]);
    const cleanSummary = summary && !summary.error ? summary : null;
    const savedStages = Array.isArray(rows) && rows.length ? rows.map(normalizeStage) : [];
    const savedTotal = savedStages.reduce((sum, stage) => sum + stage.blocks.reduce((s, block) => s + block.unitCount, 0), 0);
    const siteplanStages = cleanSummary?.totalUnitShapes > 0 ? buildStagesFromSiteplan(cleanSummary, savedStages) : [];
    setBaselineSummary(cleanSummary);
    if (
      cleanSummary?.totalUnitShapes > 0
      && (savedTotal !== cleanSummary.totalUnitShapes || stageShapeSignature(savedStages) !== stageShapeSignature(siteplanStages))
    ) {
      setStages(siteplanStages);
    } else {
      setStages(savedStages.length ? savedStages : [newStage(0)]);
    }
  }

  function normalizeStage(stage: Record<string, any>): StageRow {
    return {
      id: stage.id,
      stageCode: normalizeStageCode(stage.stageCode, ""),
      stageName: stage.stageName ?? "",
      targetStart: stage.targetStart ?? "",
      targetEnd: stage.targetEnd ?? "",
      status: stage.status,
      lockedAt: stage.lockedAt ?? null,
      blocks: Array.isArray(stage.blocks) && stage.blocks.length ? stage.blocks.map((block: Record<string, any>) => ({
        id: block.id,
        blockCode: block.blockCode ?? "",
        unitCount: Number(block.unitCount ?? 0),
        unitType: block.unitType ?? "Tipe 36",
        pricePerUnit: Number(block.pricePerUnit ?? 0),
        subkonId: block.subkonId ?? null,
        subkonName: block.subkonName ?? "",
        subkonValuePerUnit: Number(block.subkonValuePerUnit ?? 0),
        targetStart: block.targetStart ?? "",
        targetEnd: block.targetEnd ?? "",
        siteplanUnitCount: Number(block.siteplanUnitCount ?? 0),
        validationStatus: block.validationStatus,
        contractId: block.contractId ?? null,
      })) : [newBlock(0)],
    };
  }

  function buildStagesFromSiteplan(summary: BaselineSummary, existingStages = stages): StageRow[] {
    const existingBlocks = new Map<string, BlockRow>();
    for (const stage of existingStages) {
      for (const block of stage.blocks) existingBlocks.set(`${stage.stageCode.toUpperCase()}::${block.blockCode.toUpperCase()}`, block);
    }
    const incomingStages = Array.isArray(summary.stages) && summary.stages.length
      ? summary.stages
      : [{ stageCode: "T1", stageName: "Tahap 1", blocks: Array.isArray(summary.blocks) ? summary.blocks : [] }];
    if (!incomingStages.length) return [newStage(0)];
    return incomingStages.map((stage: Record<string, any>, stageIdx: number) => {
      const stageCode = normalizeStageCode(stage.stageCode, `T${stageIdx + 1}`);
      const existingStage = existingStages.find(row => row.stageCode.toUpperCase() === stageCode) ?? newStage(stageIdx);
      const incomingBlocks = Array.isArray(stage.blocks) ? stage.blocks : [];
      return {
        ...existingStage,
        stageCode,
        stageName: String(stage.stageName ?? existingStage.stageName ?? `Tahap ${stageIdx + 1}`),
        blocks: incomingBlocks.length ? incomingBlocks.map((block: Record<string, any>, idx: number) => {
          const code = String(block.blockCode ?? String.fromCharCode(65 + idx)).toUpperCase();
          const existing = existingBlocks.get(`${stageCode}::${code}`);
          return {
            ...(existing ?? newBlock(idx)),
            blockCode: code,
            unitCount: Number(block.unitCount ?? 0),
            unitType: String(block.unitType ?? existing?.unitType ?? "Tipe 36"),
            subkonId: Number(block.subkonId ?? existing?.subkonId ?? 0) || null,
            subkonName: String(block.subkonName ?? existing?.subkonName ?? ""),
            siteplanUnitCount: Number(block.unitCount ?? 0),
            validationStatus: "sesuai",
          };
        }) : [newBlock(0)],
      };
    });
  }

  function stageShapeSignature(rows: StageRow[]) {
    return rows
      .flatMap(stage => stage.blocks.map(block => `${stage.stageCode.toUpperCase()}::${block.blockCode.toUpperCase()}::${block.unitCount}`))
      .sort()
      .join("|");
  }

  function normalizeStageCode(value: unknown, fallback: string) {
    const code = String(value || fallback).trim().toUpperCase();
    return /^\d+$/.test(code) ? `T${code}` : code;
  }

  const hasLockedStages = stages.some(stage => !!stage.lockedAt);
  const hasDraftStages = stages.some(stage => !stage.lockedAt);
  const allStagesLocked = stages.length > 0 && stages.every(stage => !!stage.lockedAt);
  const totalUnits = stages.reduce((sum, stage) => sum + stage.blocks.reduce((s, block) => s + block.unitCount, 0), 0);
  const totalSales = stages.reduce((sum, stage) => sum + stage.blocks.reduce((s, block) => s + block.unitCount * block.pricePerUnit, 0), 0);
  const totalSubkon = stages.reduce((sum, stage) => sum + stage.blocks.reduce((s, block) => s + block.unitCount * block.subkonValuePerUnit, 0), 0);

  useEffect(() => {
    masterFillDoneRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!subkonMasterRows.length) return;
    setStages(prev => {
      let changed = false;
      const next = prev.map(stage => ({
        ...stage,
        blocks: stage.blocks.map(block => {
          if (block.subkonId && block.subkonValuePerUnit === 0) {
            const master = subkonMasterRows.find(m => m.id === block.subkonId);
            if (master && master.defaultValuePerUnit > 0) {
              changed = true;
              return { ...block, subkonValuePerUnit: master.defaultValuePerUnit };
            }
          }
          return block;
        }),
      }));
      return changed ? next : prev;
    });
  }, [subkonMasterRows]);

  useEffect(() => {
    const id = Number(new URLSearchParams(search).get("projectId"));
    if (Number.isFinite(id) && id > 0 && id !== projectId) {
      selectProject(id);
    }
  }, [search, projectId]);

  function setStageField(stageIdx: number, key: keyof StageRow, value: string) {
    setStages(prev => prev.map((stage, i) => i === stageIdx ? { ...stage, [key]: value } : stage));
  }

  function setBlockField(stageIdx: number, blockIdx: number, key: keyof BlockRow, value: string | number | null) {
    setStages(prev => prev.map((stage, i) => {
      if (i !== stageIdx) return stage;
      return {
        ...stage,
        blocks: stage.blocks.map((block, j) => j === blockIdx ? { ...block, [key]: value } : block),
      };
    }));
  }

  function addStage() {
    setStages(prev => [...prev, newStage(prev.length)]);
  }

  function removeStage(index: number) {
    setStages(prev => prev.filter((_, i) => i !== index));
  }

  function addBlock(stageIdx: number) {
    setStages(prev => prev.map((stage, i) => i === stageIdx ? { ...stage, blocks: [...stage.blocks, newBlock(stage.blocks.length)] } : stage));
  }

  function removeBlock(stageIdx: number, blockIdx: number) {
    setStages(prev => prev.map((stage, i) => i === stageIdx ? { ...stage, blocks: stage.blocks.filter((_, j) => j !== blockIdx) } : stage));
  }

  async function saveDraft() {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return false; }
    setIsSaving(true);
    try {
      const resp = await fetch("/api/planning/stages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stages }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setStages(data.map(normalizeStage));
      const summary = await fetch(`/api/planning/stages/siteplan-summary?projectId=${projectId}`).then(r => r.json()).catch(() => null);
      if (summary && !summary.error) setBaselineSummary(summary);
      await qc.invalidateQueries({ queryKey: ["planning-stages", projectId] });
      toast({ title: "Rencana tahapan tersimpan" });
      return true;
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function publish(stageCodes?: string[]) {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    setIsPublishing(true);
    try {
      const saved = await saveDraft();
      if (!saved) return;
      const resp = await fetch("/api/planning/stages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stageCodes }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Gagal publish");
      setStages(data.stages.map(normalizeStage));
      const summary = await fetch(`/api/planning/stages/siteplan-summary?projectId=${projectId}`).then(r => r.json()).catch(() => null);
      if (summary && !summary.error) setBaselineSummary(summary);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["units-list"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["subkon-contracts"] }),
      ]);
      toast({ title: stageCodes?.length ? "Tahap dipublish ke Produksi" : "Rencana dipublish ke Produksi", description: `${data.syncedUnits} unit tersinkron.` });
    } catch (err) {
      toast({ title: "Gagal publish", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  }

  async function createRevision() {
    if (!projectId) return;
    const resp = await fetch("/api/planning/stages/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setStages(data.map(normalizeStage));
      toast({ title: "Revisi draft dibuka" });
    } else {
      toast({ title: "Gagal membuat revisi", description: data.error, variant: "destructive" });
    }
  }

  async function importFromSiteplan() {
    if (!projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    setIsImportingSiteplan(true);
    try {
      const resp = await fetch(`/api/planning/stages/siteplan-summary?projectId=${projectId}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Gagal membaca Analisis Lahan");
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];
      if (!blocks.length) {
        toast({ title: "Belum ada unit di Analisis Lahan", description: "Gambar atau simpan shape Unit Rumah dulu di Analisis Lahan.", variant: "destructive" });
        return;
      }
      setBaselineSummary(data);
      setStages(prev => buildStagesFromSiteplan(data, prev));
      toast({ title: "Struktur ditarik dari Analisis Lahan", description: `${data.totalUnitShapes} unit siteplan masuk ke draft tahap pertama.` });
    } catch (err) {
      toast({ title: "Gagal sinkron Analisis Lahan", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsImportingSiteplan(false);
    }
  }

  const projectList = Array.isArray(projects) ? projects as Project[] : [];
  const baselineTotal = baselineSummary?.totalUnitShapes ?? 0;
  const unallocatedTotal = baselineSummary?.unallocatedUnitLabels?.length ?? 0;
  const invalidTotal = (baselineSummary?.duplicateLabels?.length ?? 0) + (baselineSummary?.invalidLabels?.length ?? 0);
  const syncStatus = !projectId
    ? "Pilih proyek"
    : baselineTotal <= 0
    ? "Belum ada unit siteplan"
    : invalidTotal > 0
    ? "Label perlu dibenahi"
    : unallocatedTotal > 0
    ? "Unit belum masuk tahap"
    : totalUnits === baselineTotal
    ? "Sinkron"
    : "Perlu sinkron ulang";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rencana Tahapan Proyek</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Baseline tahap, blok, unit, harga, dan subkon dari Analisis Lahan sebelum masuk Produksi.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={importFromSiteplan} disabled={allStagesLocked || !projectId || isImportingSiteplan} className="gap-1.5">
            <RefreshCw className="size-3.5" />{isImportingSiteplan ? "Sinkron..." : "Tarik dari Analisis Lahan"}
          </Button>
          {hasLockedStages && (
            <Button size="sm" variant="outline" onClick={createRevision} className="gap-1.5"><Unlock className="size-3.5" />Buat Revisi</Button>
          )}
          <Button size="sm" variant="outline" onClick={addStage} disabled={allStagesLocked} className="gap-1.5"><Plus className="size-3.5" />Tambah Tahap</Button>
          <Button size="sm" variant="outline" onClick={saveDraft} disabled={!hasDraftStages || isSaving} className="gap-1.5">
            <Save className="size-3.5" />{isSaving ? "Menyimpan..." : "Simpan Draft"}
          </Button>
          <Button size="sm" onClick={() => publish()} disabled={!hasDraftStages || isPublishing} className="gap-1.5">
            <Send className="size-3.5" />{isPublishing ? "Publish..." : "Publish ke Produksi"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select value={projectId ? String(projectId) : ""} onValueChange={v => selectProject(parseInt(v))}>
          <SelectTrigger className="h-8 w-72"><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
          <SelectContent>
            {projectList.map(project => <SelectItem key={project.id} value={String(project.id)}>{project.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        {projectId > 0 && (
          <Link href={`/perencanaan/lahan?projectId=${projectId}`}>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1.5"><GitBranch className="size-3.5" />Buka Analisis Lahan</Button>
          </Link>
        )}
        {hasLockedStages && <span className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-1 text-emerald-700 bg-emerald-50"><Lock className="size-3" />Sebagian tahap locked</span>}
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { label: "Total Unit", value: `${totalUnits.toLocaleString("id-ID")} unit` },
          { label: "Total Nilai Unit", value: fmtCurrency(totalSales) },
          { label: "Total Kontrak Subkon", value: fmtCurrency(totalSubkon) },
          { label: "Estimasi Margin Kotor", value: fmtCurrency(totalSales - totalSubkon) },
        ].map(item => (
          <Card key={item.label}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{item.label}</div><div className="text-lg font-semibold mt-1">{item.value}</div></CardContent></Card>
        ))}
      </div>

      {projectId > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Status Baseline Siteplan</div>
                <div className={cn("text-sm font-semibold mt-0.5", syncStatus === "Sinkron" ? "text-emerald-600" : "text-amber-600")}>{syncStatus}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Unit siteplan</span><div className="font-semibold">{baselineTotal}</div></div>
                <div><span className="text-muted-foreground">Masuk tahap</span><div className="font-semibold">{totalUnits}</div></div>
                <div><span className="text-muted-foreground">Belum tahap</span><div className="font-semibold">{unallocatedTotal}</div></div>
                <div><span className="text-muted-foreground">Masalah label</span><div className="font-semibold">{invalidTotal}</div></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!projectId ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Pilih proyek untuk mulai menyusun tahapan.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, stageIdx) => {
            const stageUnits = stage.blocks.reduce((sum, block) => sum + block.unitCount, 0);
            const stageValue = stage.blocks.reduce((sum, block) => sum + block.unitCount * block.pricePerUnit, 0);
            const stageLocked = !!stage.lockedAt;
            return (
              <Card key={stageIdx}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="size-4" />{stage.stageCode || `T${stageIdx + 1}`} · {stage.stageName || "Tahap"}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{stageUnits} unit · {fmtCurrency(stageValue)}</span>
                      {!stageLocked && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={isPublishing} onClick={() => publish([stage.stageCode])}>
                          <Send className="size-3" /> Publish Tahap
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="size-7" disabled={stageLocked || stages.length <= 1} onClick={() => removeStage(stageIdx)}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-4 gap-2">
                    <div><Label className="text-xs">Kode Tahap</Label><Input disabled={stageLocked} className="h-8 text-sm" value={stage.stageCode} onChange={e => setStageField(stageIdx, "stageCode", normalizeStageCode(e.target.value, `T${stageIdx + 1}`))} /></div>
                    <div><Label className="text-xs">Nama Tahap</Label><Input disabled={stageLocked} className="h-8 text-sm" value={stage.stageName} onChange={e => setStageField(stageIdx, "stageName", e.target.value)} /></div>
                    <div><Label className="text-xs">Target Mulai</Label><Input disabled={stageLocked} type="date" className="h-8 text-sm" value={stage.targetStart} onChange={e => setStageField(stageIdx, "targetStart", e.target.value)} /></div>
                    <div><Label className="text-xs">Target Selesai</Label><Input disabled={stageLocked} type="date" className="h-8 text-sm" value={stage.targetEnd} onChange={e => setStageField(stageIdx, "targetEnd", e.target.value)} /></div>
                  </div>

                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 border-b">
                        <tr>
                          {["Blok", "Unit", "Tipe", "Harga/Unit", "Total Unit", "Subkon", "Nilai Subkon/Unit", "Kontrak Subkon", "Siteplan", ""].map(h => (
                            <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stage.blocks.map((block, blockIdx) => {
                          const salesValue = block.unitCount * block.pricePerUnit;
                          const subkonValue = block.unitCount * block.subkonValuePerUnit;
                          const stat = statusLabel(block.validationStatus);
                          return (
                            <tr key={blockIdx} className="border-b last:border-0">
                              <td className="px-2 py-1.5"><Input disabled={stageLocked} className="h-7 w-16 text-xs" value={block.blockCode} onChange={e => setBlockField(stageIdx, blockIdx, "blockCode", e.target.value.toUpperCase())} /></td>
                              <td className="px-2 py-1.5"><NumericInput disabled className="h-7 w-20 text-xs bg-muted/40" value={block.unitCount} onChange={() => {}} /></td>
                              <td className="px-2 py-1.5"><Input disabled={stageLocked} className="h-7 w-24 text-xs" value={block.unitType} onChange={e => setBlockField(stageIdx, blockIdx, "unitType", e.target.value)} /></td>
                              <td className="px-2 py-1.5"><CurrencyInput disabled={stageLocked} className="h-7 w-32 text-xs" value={block.pricePerUnit} onChange={raw => setBlockField(stageIdx, blockIdx, "pricePerUnit", raw ? Number(raw) : 0)} /></td>
                              <td className="px-2 py-1.5 font-medium tabular-nums">{fmtCurrency(salesValue)}</td>
                              <td className="px-2 py-1.5 min-w-48">
                                <SubkonSelect
                                  disabled={stageLocked}
                                  allowCreate
                                  valueMode="id"
                                  projectId={projectId}
                                  value={block.subkonId ? String(block.subkonId) : ""}
                                  triggerClassName="h-7 text-xs"
                                  onValueChange={v => setBlockField(stageIdx, blockIdx, "subkonId", Number(v) || null)}
                                  onOptionChange={option => {
                                    setBlockField(stageIdx, blockIdx, "subkonName", option?.name ?? "");
                                    if (option?.defaultValuePerUnit && option.defaultValuePerUnit > 0) {
                                      setBlockField(stageIdx, blockIdx, "subkonValuePerUnit", option.defaultValuePerUnit);
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-2 py-1.5"><CurrencyInput disabled={stageLocked} className="h-7 w-32 text-xs" value={block.subkonValuePerUnit} onChange={raw => setBlockField(stageIdx, blockIdx, "subkonValuePerUnit", raw ? Number(raw) : 0)} /></td>
                              <td className="px-2 py-1.5 font-medium tabular-nums">{fmtCurrency(subkonValue)}</td>
                              <td className="px-2 py-1.5">
                                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap", stat.tone)}>
                                  {block.validationStatus === "sesuai" ? <CheckCircle2 className="size-3" /> : block.validationStatus ? <XCircle className="size-3" /> : <RefreshCw className="size-3" />}
                                  {stat.label} · {block.siteplanUnitCount ?? 0}/{block.unitCount}
                                </span>
                              </td>
                              <td className="px-2 py-1.5"><Button disabled={stageLocked || stage.blocks.length <= 1} variant="ghost" size="icon" className="size-7" onClick={() => removeBlock(stageIdx, blockIdx)}><Trash2 className="size-3.5 text-destructive" /></Button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Button disabled={stageLocked} size="sm" variant="outline" onClick={() => addBlock(stageIdx)} className="gap-1.5"><Plus className="size-3.5" />Tambah Blok</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
