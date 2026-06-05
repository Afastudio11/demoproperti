import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Square, Shield, RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Unit = { id: number; blok: string; nomor: string; tipe: string; stageCode: string | null; progress: number };
type QcItem = { id: number; unitId: number; qcItem: string; isPass: boolean; notes: string | null; inspectedBy: string | null };

const QC_ITEMS = [
  "Struktur (kolom, sloof, ring balok)",
  "Dinding (plesteran rata, tidak retak)",
  "Atap (tidak bocor, rangka kuat)",
  "Keramik (terpasang rata, tidak hollow)",
  "Cat (merata, tidak luntur)",
  "Instalasi Listrik (fungsi semua titik)",
  "Instalasi Air (tidak bocor, tekanan cukup)",
  "Kusen & Pintu (buka-tutup lancar)",
  "Plafon (terpasang rapi, tidak turun)",
];

export default function QcChecklist() {
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [inspectedBy, setInspectedBy] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: units } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Unit[]>;
    },
  });

  const { data: qcData, isLoading } = useQuery({
    queryKey: ["qc-checklist", selectedUnit],
    queryFn: async () => {
      if (!selectedUnit) return { items: [], qcScore: 0 };
      const res = await fetch(`/api/produksi/qc/checklist?unitId=${selectedUnit}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ items: QcItem[]; qcScore: number; qcItems: string[] }>;
    },
    enabled: !!selectedUnit,
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/produksi/qc/checklist/init/${selectedUnit}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-checklist", selectedUnit] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isPass }: { id: number; isPass: boolean }) => {
      const res = await fetch(`/api/produksi/qc/checklist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPass, inspectedBy: inspectedBy || null, inspectedAt: new Date().toISOString().split("T")[0] }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["qc-checklist", selectedUnit] });
      toast({ title: `QC Score: ${data.qcScore}%` });
    },
  });

  const items = qcData?.items ?? [];
  const qcScore = qcData?.qcScore ?? 0;
  const passCount = items.filter(i => i.isPass).length;
  const hasItems = items.length > 0;
  const unit = units?.find(u => u.id === parseInt(selectedUnit));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">QC Checklist per Unit</h1>
        <p className="text-sm text-muted-foreground">9 item standar pemeriksaan kualitas per unit. Target skor: &gt;90%</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Pilih Unit</Label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih unit..." /></SelectTrigger>
            <SelectContent>
              {(units ?? []).map(u => (
                <SelectItem key={u.id} value={String(u.id)}>Blok {u.blok}-{u.nomor} ({u.tipe}) {u.stageCode ? `[${u.stageCode}]` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nama Inspector</Label>
          <Input value={inspectedBy} onChange={e => setInspectedBy(e.target.value)} placeholder="Nama QC Inspector..." className="h-8 text-sm" />
        </div>
      </div>

      {selectedUnit && (
        <>
          {unit && (
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
              <div className="flex-1">
                <p className="text-sm font-medium">Blok {unit.blok}-{unit.nomor}</p>
                <p className="text-xs text-muted-foreground">Tipe: {unit.tipe} | Progress Konstruksi: {unit.progress}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: qcScore >= 90 ? "#10b981" : qcScore >= 70 ? "#f59e0b" : "#ef4444" }}>{qcScore}%</p>
                <p className="text-[10px] text-muted-foreground">QC Score</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{passCount}/{items.length}</p>
                <p className="text-[10px] text-muted-foreground">Item Lulus</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat checklist...</div>
          ) : !hasItems ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Shield className="size-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Checklist QC belum diinisialisasi untuk unit ini</p>
                <Button size="sm" onClick={() => initMutation.mutate()} disabled={initMutation.isPending} className="gap-1.5">
                  <Plus className="size-3.5" /> Inisialisasi 9-Item QC
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">9 Item Pemeriksaan QC</CardTitle>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${qcScore >= 90 ? "bg-emerald-500/15 text-emerald-600" : qcScore >= 70 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}`}>
                    {qcScore >= 90 ? "Lulus" : qcScore >= 70 ? "Perlu Perbaikan" : "Tidak Lulus"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleMutation.mutate({ id: item.id, isPass: !item.isPass })}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${item.isPass ? "bg-emerald-500/5" : "bg-muted/20"}`}
                    >
                      {item.isPass ? (
                        <CheckSquare className="size-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="size-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${item.isPass ? "text-foreground" : "text-muted-foreground"}`}>{item.qcItem}</p>
                        {item.inspectedBy && <p className="text-[10px] text-muted-foreground">Diperiksa: {item.inspectedBy}</p>}
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${item.isPass ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {item.isPass ? "LULUS" : "BELUM"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${qcScore}%`, backgroundColor: qcScore >= 90 ? "#10b981" : qcScore >= 70 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {passCount} dari {items.length} item lulus ({qcScore}%) — Target: &gt;90%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
