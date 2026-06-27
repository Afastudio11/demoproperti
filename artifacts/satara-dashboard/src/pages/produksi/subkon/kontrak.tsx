import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileCheck } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type Project = { id: number; nama: string };

type Contract = {
  id: number; projectId: number; stageCode: string | null; subkonId: number | null; subkonName: string;
  unitCount: number; valuePerUnit: number; contractValue: number;
  retentionPerUnit: number; totalRetention: number; netPayableValue: number;
  maintenanceMonths: number; startDate: string | null; targetEndDate: string | null;
  retentionStatus: string; status: string;
  progressCurrent?: number; netAlreadyPaid?: number;
};

const RETENTION_STATUS: Record<string, string> = {
  ditahan: "Ditahan", masa_pemeliharaan: "Masa Pemeliharaan", siap_cair: "Siap Cair", sudah_cair: "Sudah Cair",
};

export default function SubkonKontrak() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const r = await fetch("/api/projects"); return r.json() as Promise<Project[]>; },
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["subkon-contracts"],
    queryFn: async () => { const r = await fetch("/api/produksi/subkon/contracts"); return r.json() as Promise<Contract[]>; },
  });

  const updateRetentionStatus = useMutation({
    mutationFn: async ({ id, retentionStatus }: { id: number; retentionStatus: string }) => {
      const res = await fetch(`/api/produksi/subkon/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionStatus }),
      });
      if (!res.ok) throw new Error("Gagal update status retensi");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subkon-contracts"] }); toast({ title: "Status retensi diperbarui" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const projectName = (id: number) => projects?.find(p => p.id === id)?.nama ?? `Proyek #${id}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Kontrak Subkon</h1>
        <p className="text-sm text-muted-foreground">
          Kontrak dibuat otomatis saat tahapan di-publish dari Perencanaan. Pembayaran dihitung berdasarkan progress per unit.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat kontrak...</div>
      ) : (contracts?.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileCheck className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada kontrak subkon</p>
            <p className="text-xs text-muted-foreground mt-1">Kontrak terbuat otomatis saat tahapan di-publish dari Perencanaan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts!.map(c => (
            <Card key={c.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.subkonName}</span>
                      {c.stageCode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.stageCode}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "aktif" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {projectName(c.projectId)} — {c.unitCount} unit
                      {c.startDate && <> · Mulai {c.startDate}</>}
                      {c.targetEndDate && <> · Target {c.targetEndDate}</>}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Nilai per Unit</span>
                        <span className="font-medium text-emerald-600">{fmtRp(c.valuePerUnit)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Nilai Kontrak</span>
                        <span className="font-medium">{fmtRp(c.contractValue)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Retensi/Unit</span>
                        <span className="font-medium text-amber-600">{fmtRp(c.retentionPerUnit)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Total Retensi</span>
                        <span className="font-medium text-amber-600">{fmtRp(c.totalRetention)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Net Terbayar</span>
                        <span className="font-medium text-emerald-600">{fmtRp(c.netPayableValue)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 space-y-1">
                    <p className="text-[10px] text-muted-foreground text-right">Status Retensi</p>
                    <Select
                      value={c.retentionStatus}
                      onValueChange={retentionStatus => updateRetentionStatus.mutate({ id: c.id, retentionStatus })}
                    >
                      <SelectTrigger className="h-7 w-48 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RETENTION_STATUS).map(([value, label]) => {
                          const isEligibleForRelease = (c.progressCurrent ?? 0) >= 100 && (c.netAlreadyPaid ?? 0) >= c.netPayableValue;
                          const isReleaseOption = value === "siap_cair" || value === "sudah_cair";
                          const disabled = isReleaseOption && !isEligibleForRelease;
                          return (
                            <SelectItem key={value} value={value} disabled={disabled}>
                              {label} {!isEligibleForRelease && isReleaseOption && " (Harus 100% & Progres Lunas)"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
