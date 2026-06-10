import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, CheckCircle2, XCircle, Clock, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtRp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)} Jt`;

type Unit = {
  id: number; blok: string; nomor: string; tipe: string; harga: number;
  progress: number; readyAkad: boolean; status: string;
  adminStatus: string; htValue: number | null; stageCode: string | null;
  projectId: number;
};

const ADMIN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  stock: { label: "Stock", color: "text-muted-foreground" },
  booking: { label: "Booking", color: "text-blue-500" },
  SP3K: { label: "SP3K", color: "text-amber-500" },
  proses_bank: { label: "Proses Bank", color: "text-violet-500" },
};

export default function ReadyAkad() {
  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterReady, setFilterReady] = useState("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["units-for-akad"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Unit[]>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, adminStatus, htValue }: { id: number; adminStatus?: string; htValue?: number }) => {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminStatus, htValue }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["units-for-akad"] });
      toast({ title: "Status unit diperbarui" });
    },
  });

  const filtered = (data ?? []).filter(u => {
    if (filterAdmin !== "all" && u.adminStatus !== filterAdmin) return false;
    if (filterReady === "ready" && !u.readyAkad) return false;
    if (filterReady === "not_ready" && u.readyAkad) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.blok}${u.nomor}${u.tipe}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const readyCount = (data ?? []).filter(u => u.readyAkad).length;
  const sp3kCount = (data ?? []).filter(u => u.adminStatus === "SP3K").length;
  const htTertahan = (data ?? []).filter(u => u.adminStatus === "SP3K" && !u.readyAkad).reduce((s, u) => s + (u.htValue ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Ready Akad Tracker</h1>
          <p className="text-sm text-muted-foreground">Monitor status kelengkapan syarat akad KPR per unit</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8"><RefreshCw className="size-3.5" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Total Unit</p>
          <p className="text-xl font-bold">{data?.length ?? 0}</p>
        </CardContent></Card>
        <Card className="border-emerald-500/20"><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Ready Akad</p>
          <p className="text-xl font-bold text-emerald-500">{readyCount}</p>
        </CardContent></Card>
        <Card className="border-amber-500/20"><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">SP3K Aktif</p>
          <p className="text-xl font-bold text-amber-500">{sp3kCount}</p>
        </CardContent></Card>
        <Card className="border-red-500/20"><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">HT Tertahan</p>
          <p className="text-xl font-bold text-red-500">{fmtRp(htTertahan)}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari unit..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterAdmin} onValueChange={setFilterAdmin}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Status Admin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="SP3K">SP3K</SelectItem>
            <SelectItem value="proses_bank">Proses Bank</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterReady} onValueChange={setFilterReady}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Kesiapan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="ready">Ready Akad</SelectItem>
            <SelectItem value="not_ready">Belum Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data unit...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2.5 px-4">Unit</th>
                    <th className="text-left py-2.5 px-2">Tipe</th>
                    <th className="text-right py-2.5 px-2">Progress</th>
                    <th className="text-right py-2.5 px-2">Harga Jual</th>
                    <th className="text-right py-2.5 px-2">Nilai HT</th>
                    <th className="text-center py-2.5 px-2">Status Admin</th>
                    <th className="text-center py-2.5 px-2">Ready Akad</th>
                    <th className="text-center py-2.5 px-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const as = ADMIN_STATUS_LABELS[u.adminStatus] ?? ADMIN_STATUS_LABELS.stock;
                    const constructionOk = u.progress >= 100;
                    return (
                      <tr key={u.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-4 font-medium">Blok {u.blok}-{u.nomor} {u.stageCode ? `[${u.stageCode}]` : ""}</td>
                        <td className="py-2 px-2 text-muted-foreground">{u.tipe}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={u.progress >= 100 ? "text-emerald-600 font-medium" : u.progress >= 80 ? "text-amber-600" : "text-muted-foreground"}>
                            {u.progress}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">{fmtRp(u.harga)}</td>
                        <td className="py-2 px-2 text-right">{u.htValue ? fmtRp(u.htValue) : "—"}</td>
                        <td className="py-2 px-2 text-center">
                          <Select value={u.adminStatus} onValueChange={v => updateMutation.mutate({ id: u.id, adminStatus: v })}>
                            <SelectTrigger className={`h-6 text-[10px] w-28 ${as.color}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stock">Stock</SelectItem>
                              <SelectItem value="booking">Booking</SelectItem>
                              <SelectItem value="SP3K">SP3K</SelectItem>
                              <SelectItem value="proses_bank">Proses Bank</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {u.readyAkad ? (
                            <span className="flex items-center justify-center gap-1 text-emerald-500"><CheckCircle2 className="size-3.5" /> Ready</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-muted-foreground"><XCircle className="size-3.5" /> Belum</span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {!constructionOk && <span className="text-[10px] text-amber-500">Konstruksi {u.progress}%</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada unit ditemukan</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
