import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, RefreshCw, Search, TrendingDown } from "lucide-react";
import { Link } from "wouter";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type StokRow = {
  id: number; name: string; category: string; satuan: string;
  minimumStock: number; unitPrice: number | null;
  totalMasuk: number; totalKeluar: number; stokAktual: number;
  nilaiStok: number; isBelowMinimum: boolean;
};
type Project = { id: number; nama: string };
const STAGE_OPTIONS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

export default function MaterialStok() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAlert, setFilterAlert] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [stageCode, setStageCode] = useState("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Project[]>;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["material-stok", projectId, stageCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId !== "all") params.set("projectId", projectId);
      if (stageCode !== "all") params.set("stageCode", stageCode);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/produksi/material/stok${suffix}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<StokRow[]>;
    },
    refetchInterval: 60000,
  });

  const categories = [...new Set((data ?? []).map(r => r.category))].sort();

  const filtered = (data ?? []).filter(r => {
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterAlert === "kritis" && !r.isBelowMinimum) return false;
    if (filterAlert === "aman" && r.isBelowMinimum) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalNilai = filtered.reduce((s, r) => s + r.nilaiStok, 0);
  const kritisCount = (data ?? []).filter(r => r.isBelowMinimum).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Stok Gudang Material</h1>
          <p className="text-sm text-muted-foreground">Stok aktual = total masuk – total keluar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8"><RefreshCw className="size-3.5" /></Button>
          <Link href="/produksi/material/masuk"><Button size="sm" className="h-8 text-xs gap-1.5"><Package className="size-3.5" /> Catat Material Masuk</Button></Link>
          <Link href="/produksi/material/keluar"><Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><TrendingDown className="size-3.5" /> Catat Material Keluar</Button></Link>
        </div>
      </div>

      <div className="rounded-md border border-muted bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-3">
        <span>Untuk menambah stok: klik <strong className="text-foreground">Catat Material Masuk</strong> (penerimaan dari supplier) atau <strong className="text-foreground">Catat Material Keluar</strong> (pemakaian ke lapangan).</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Total Nilai Stok</p>
          <p className="text-lg font-bold">{isLoading ? "—" : fmtRp(totalNilai)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Jenis Material</p>
          <p className="text-lg font-bold">{data?.length ?? 0}</p>
        </CardContent></Card>
        <Card className={kritisCount > 0 ? "border-red-500/30" : ""}><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Stok Kritis</p>
          <p className={`text-lg font-bold ${kritisCount > 0 ? "text-red-500" : "text-emerald-500"}`}>{kritisCount}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari material..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={(value) => { setProjectId(value); setStageCode("all"); }}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Semua proyek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageCode} onValueChange={setStageCode}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue placeholder="Tahap" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahap</SelectItem>
            {STAGE_OPTIONS.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAlert} onValueChange={setFilterAlert}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="kritis">Kritis</SelectItem>
            <SelectItem value="aman">Aman</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat stok gudang...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2.5 px-4">Material</th>
                    <th className="text-left py-2.5 px-2">Kategori</th>
                    <th className="text-right py-2.5 px-2">Masuk</th>
                    <th className="text-right py-2.5 px-2">Keluar</th>
                    <th className="text-right py-2.5 px-2">Stok</th>
                    <th className="text-right py-2.5 px-2">Min.</th>
                    <th className="text-right py-2.5 px-2">Satuan</th>
                    <th className="text-right py-2.5 px-4">Nilai Stok</th>
                    <th className="text-center py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className={`border-b hover:bg-muted/20 transition-colors ${r.isBelowMinimum ? "bg-red-500/5" : ""}`}>
                      <td className="py-2 px-4 font-medium">{r.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{r.category.split(" – ")[1] ?? r.category}</td>
                      <td className="py-2 px-2 text-right text-emerald-600">{r.totalMasuk.toLocaleString("id")}</td>
                      <td className="py-2 px-2 text-right text-red-500">{r.totalKeluar.toLocaleString("id")}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${r.isBelowMinimum ? "text-red-500" : ""}`}>{r.stokAktual.toLocaleString("id")}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.minimumStock.toLocaleString("id")}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.satuan}</td>
                      <td className="py-2 px-4 text-right">{fmtRp(r.nilaiStok)}</td>
                      <td className="py-2 px-2 text-center">
                        {r.isBelowMinimum ? (
                          <span className="flex items-center justify-center gap-1 text-red-500"><AlertTriangle className="size-3" /> Kritis</span>
                        ) : (
                          <span className="text-emerald-500">Aman</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
