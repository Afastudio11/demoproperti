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
import { calcDemandScore } from "@/lib/planning-calc";
import { Save, Plus, Trash2 } from "lucide-react";

const SATARA_STANDARDS = { minDemand: 60 };

function num(v: string) { return parseFloat(v) || 0; }

const defaultForm = {
  projectId: 0,
  kelurahan: "",
  kecamatan: "",
  kabupaten: "",
  populationGrowth: 0,
  backlogHousing: 0,
  marriageRate: 0,
  flppEligible: 0,
  purchasePower: 0,
  roadAccess: 0,
  nearTolPlaza: 0,
  nearSchool: 0,
  nearMarket: 0,
  sampleSize: 0,
  flppPreference: 0,
  cashPreference: 0,
  notes: "",
};

type Competitor = { name: string; type: string; price: number; units: number; absorption: number; distance: number };
const defaultComp: Competitor = { name: "", type: "tapak", price: 0, units: 0, absorption: 0, distance: 0 };

export default function PasarPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [savedId, setSavedId] = useState<number | null>(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });
  const { data: existing } = useQuery({
    queryKey: ["planning-market", form.projectId],
    enabled: form.projectId > 0,
    queryFn: async () => {
      const rows = await fetch("/api/planning/market").then(r => r.json());
      return (rows as Record<string, unknown>[]).find((r) => r.projectId === form.projectId) ?? null;
    },
  });

  useEffect(() => {
    if (existing) {
      setForm(prev => ({ ...prev, ...(existing as object) }));
      setSavedId((existing as Record<string, number>).id);
      if (Array.isArray((existing as Record<string, unknown>).competitors)) {
        setCompetitors((existing as Record<string, unknown>).competitors as Competitor[]);
      }
    }
  }, [existing]);

  const setF = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: typeof v === "string" ? num(v) || v : v }));

  const demandScore = calcDemandScore({
    populationGrowth: form.populationGrowth,
    backlogHousing: form.backlogHousing,
    marriageRate: form.marriageRate,
    flppEligible: form.flppEligible,
    purchasePower: form.purchasePower,
    roadAccess: form.roadAccess,
    nearTolPlaza: form.nearTolPlaza,
    nearSchool: form.nearSchool,
    nearMarket: form.nearMarket,
  });

  const save = async () => {
    if (!form.projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const payload = { ...form, competitors };
    const url = savedId ? `/api/planning/market/${savedId}` : "/api/planning/market";
    const method = savedId ? "PATCH" : "POST";
    const resp = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    const d = await resp.json();
    setSavedId(d.id);
    await qc.invalidateQueries({ queryKey: ["planning-market"] });
    toast({ title: "Analisis pasar tersimpan" });
  };

  const scoreColor = demandScore >= 70 ? "text-emerald-500" : demandScore >= 50 ? "text-amber-500" : "text-red-500";
  const projectList = Array.isArray(projects) ? projects : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Analisis Pasar & Permintaan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Demografi, ekonomi, lokasi, kompetitor & demand score</p>
        </div>
        <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select onValueChange={v => setF("projectId", parseInt(v))}>
          <SelectTrigger className="h-8 w-64">
            <SelectValue placeholder="Pilih proyek..." />
          </SelectTrigger>
          <SelectContent>
            {projectList.map((p: Record<string, unknown>) => (
              <SelectItem key={p.id as number} value={String(p.id)}>{p.nama as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="demografi">
        <TabsList>
          <TabsTrigger value="demografi">Demografi</TabsTrigger>
          <TabsTrigger value="ekonomi">Ekonomi</TabsTrigger>
          <TabsTrigger value="lokasi">Lokasi</TabsTrigger>
          <TabsTrigger value="kompetitor">Kompetitor</TabsTrigger>
          <TabsTrigger value="hasil">Hasil</TabsTrigger>
        </TabsList>

        <TabsContent value="demografi" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Data Demografis Wilayah</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[
                ["kelurahan", "Kelurahan/Desa", "text", ""],
                ["kecamatan", "Kecamatan", "text", ""],
                ["kabupaten", "Kabupaten/Kota", "text", ""],
              ].map(([k, label, type]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input className="h-8 text-sm" type={type} value={(form as Record<string, unknown>)[k] as string ?? ""} onChange={e => setF(k, e.target.value)} />
                </div>
              ))}
              {[
                ["populationGrowth", "Pertumbuhan Penduduk (%/thn)", "%"],
                ["backlogHousing", "Backlog Perumahan (unit)", "unit"],
                ["marriageRate", "Angka Pernikahan/Thn", "pasangan"],
              ].map(([k, label, unit]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-1.5">
                    <Input className="h-8 text-sm" type="number" value={(form as Record<string, unknown>)[k] as number ?? 0} onChange={e => setF(k, e.target.value)} />
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ekonomi" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daya Beli & FLPP</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[
                ["flppEligible", "Penduduk Eligible FLPP (%)", "%"],
                ["purchasePower", "Indeks Daya Beli (0-100)", ""],
                ["sampleSize", "Jumlah Responden Survei", "org"],
                ["flppPreference", "Preferensi FLPP (%)", "%"],
                ["cashPreference", "Preferensi Cash/Keras (%)", "%"],
              ].map(([k, label, unit]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-1.5">
                    <Input className="h-8 text-sm" type="number" value={(form as Record<string, unknown>)[k] as number ?? 0} onChange={e => setF(k, e.target.value)} />
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lokasi" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Aksesibilitas & Fasilitas</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[
                ["roadAccess", "Nilai Akses Jalan (0-100)", ""],
                ["nearTolPlaza", "Jarak ke Pintu Tol (km)", "km"],
                ["nearSchool", "Jarak ke Sekolah (km)", "km"],
                ["nearMarket", "Jarak ke Pasar/Mall (km)", "km"],
              ].map(([k, label, unit]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-1.5">
                    <Input className="h-8 text-sm" type="number" value={(form as Record<string, unknown>)[k] as number ?? 0} onChange={e => setF(k, e.target.value)} />
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kompetitor" className="mt-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Data Kompetitor</CardTitle>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setCompetitors(prev => [...prev, { ...defaultComp }])}>
                <Plus className="size-3" />Tambah
              </Button>
            </CardHeader>
            <CardContent>
              {competitors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada data kompetitor</p>
              ) : (
                <div className="space-y-3">
                  {competitors.map((c, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 items-end p-3 border rounded-md">
                      {[
                        ["name", "Nama Proyek", "text"],
                        ["type", "Tipe", "text"],
                        ["price", "Harga (jt)", "number"],
                        ["units", "Total Unit", "number"],
                        ["absorption", "Absorpsi/Bln", "number"],
                        ["distance", "Jarak (km)", "number"],
                      ].map(([k, label, type]) => (
                        <div key={k} className="space-y-1">
                          <Label className="text-[10px]">{label}</Label>
                          <Input className="h-7 text-xs" type={type} value={(c as Record<string, unknown>)[k] as string ?? ""} onChange={e => {
                            const updated = [...competitors];
                            (updated[i] as Record<string, unknown>)[k] = type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
                            setCompetitors(updated);
                          }} />
                        </div>
                      ))}
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setCompetitors(prev => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hasil" className="mt-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Demand Score</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${scoreColor}`}>{demandScore}</div>
                  <div className="text-sm text-muted-foreground mt-1">dari 100 poin</div>
                  <Badge variant="outline" className={`mt-2 ${demandScore >= 70 ? "text-emerald-600 border-emerald-200" : demandScore >= 50 ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200"}`}>
                    {demandScore >= 70 ? "TINGGI — Layak Dikembangkan" : demandScore >= 50 ? "SEDANG — Perlu Kajian Lebih" : "RENDAH — Risiko Tinggi"}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${demandScore >= 70 ? "bg-emerald-500" : demandScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${demandScore}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">Target minimum Satara: {SATARA_STANDARDS.minDemand} poin</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Breakdown Komponen</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Pertumbuhan Penduduk (20%)", val: Math.min(form.populationGrowth / 5, 1) * 100 * 0.20 },
                  { label: "Backlog Perumahan (20%)", val: Math.min(form.backlogHousing / 10000, 1) * 100 * 0.20 },
                  { label: "Eligible FLPP (15%)", val: Math.min(form.flppEligible / 80, 1) * 100 * 0.15 },
                  { label: "Angka Pernikahan (10%)", val: Math.min(form.marriageRate / 10000, 1) * 100 * 0.10 },
                  { label: "Daya Beli (10%)", val: Math.min(form.purchasePower / 100, 1) * 100 * 0.10 },
                  { label: "Akses Jalan (10%)", val: form.roadAccess * 0.10 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-48 shrink-0">{item.label}</div>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(item.val / 20 * 100, 100)}%` }} />
                    </div>
                    <div className="text-xs font-medium w-8 text-right">{item.val.toFixed(1)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {competitors.length > 0 && (
              <Card className="sm:col-span-2">
                <CardHeader><CardTitle className="text-sm">Ringkasan Kompetitor</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50"><tr>
                        {["Nama", "Tipe", "Harga (jt)", "Unit", "Absorpsi/bln", "Jarak"].map(h => (
                          <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {competitors.map((c, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1.5">{c.name || "-"}</td>
                            <td className="px-2 py-1.5">{c.type}</td>
                            <td className="px-2 py-1.5">{c.price ? `Rp ${c.price.toLocaleString("id-ID")} jt` : "-"}</td>
                            <td className="px-2 py-1.5">{c.units || "-"}</td>
                            <td className="px-2 py-1.5">{c.absorption || "-"}</td>
                            <td className="px-2 py-1.5">{c.distance ? `${c.distance} km` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
