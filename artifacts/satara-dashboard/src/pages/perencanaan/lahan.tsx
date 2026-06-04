import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { calcLandAnalysis, calcMaxUnits, fmtCurrency } from "@/lib/planning-calc";
import { Save, Download, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function num(v: string) { return parseFloat(v) || 0; }

const defaultForm = {
  projectId: 0,
  landArea: 0,
  landPriceTotal: 0,
  landShape: "",
  contour: "",
  roadWidth: 0,
  legalStatus: "",
  notes: "",
  kavlingArea: 0,
};

export default function LahanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [autoImported, setAutoImported] = useState(false);

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const urlProjectId = searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : null;
  const urlProspectId = searchParams.get("prospectId") ? parseInt(searchParams.get("prospectId")!) : null;

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });
  const { data: prospects } = useQuery({
    queryKey: ["land-prospects"],
    queryFn: () => fetch("/api/land-prospects").then(r => r.json()),
    enabled: showImport || !!urlProspectId,
  });

  const selectProject = async (id: number) => {
    setForm(prev => ({ ...prev, projectId: id }));
    const rows = await fetch("/api/planning/land?projectId=" + id).then(r => r.json());
    if (rows.length > 0) {
      setForm({ ...defaultForm, ...rows[0] });
      setSavedId(rows[0].id);
    } else {
      setSavedId(null);
    }
  };

  useEffect(() => {
    if (!urlProjectId || autoImported) return;
    setAutoImported(true);
    selectProject(urlProjectId).then(async () => {
      if (urlProspectId) {
        const resp = await fetch(`/api/land-prospects/${urlProspectId}`).then(r => r.json());
        if (!resp) return;
        const surveyData = resp.surveyData || {};
        const ai = resp.fullAiResult || {};
        const alloc = ai.landAllocation || {};
        setForm(prev => ({
          ...prev,
          projectId: urlProjectId,
          landArea: resp.luas || prev.landArea,
          landPriceTotal: (resp.hargaM2 || 0) * (resp.luas || 0) || prev.landPriceTotal,
          roadWidth: resp.aksesJalan || prev.roadWidth,
          legalStatus: resp.statusKepemilikan || surveyData.statusLegal || prev.legalStatus,
          landShape: surveyData.bentukLahan || prev.landShape,
          contour: surveyData.kontur || prev.contour,
          notes: [resp.lokasi || "", resp.kelurahan ? `Kel. ${resp.kelurahan}` : "", resp.kecamatan ? `Kec. ${resp.kecamatan}` : "", resp.kabupaten || ""].filter(Boolean).join(", ") || prev.notes,
          kavlingArea: (alloc as Record<string, number>).kavlingArea || prev.kavlingArea,
        }));
        toast({ title: "Data lahan diimpor dari Akuisisi Lahan" });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectId, urlProspectId]);

  const setF = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: typeof v === "string" ? (parseFloat(v) || v) : v }));

  const importFromProspect = async (prospectId: number) => {
    const resp = await fetch(`/api/land-prospects/${prospectId}`).then(r => r.json());
    if (!resp) return;
    const surveyData = resp.surveyData || {};
    const ai = resp.fullAiResult || {};
    const alloc = ai.landAllocation || {};

    setForm(prev => ({
      ...prev,
      landArea: resp.luas || prev.landArea,
      landPriceTotal: (resp.hargaM2 || 0) * (resp.luas || 0) || prev.landPriceTotal,
      roadWidth: resp.aksesJalan || prev.roadWidth,
      legalStatus: resp.statusKepemilikan || surveyData.statusLegal || prev.legalStatus,
      landShape: surveyData.bentukLahan || prev.landShape,
      contour: surveyData.kontur || prev.contour,
      notes: [
        resp.lokasi || "",
        resp.kelurahan ? `Kel. ${resp.kelurahan}` : "",
        resp.kecamatan ? `Kec. ${resp.kecamatan}` : "",
        resp.kabupaten || "",
      ].filter(Boolean).join(", ") || prev.notes,
    }));
    setShowImport(false);
    toast({ title: "Data lahan diimpor dari Akuisisi Lahan" });
  };

  const { roadArea, fasumArea, effectiveArea } = calcLandAnalysis(form.landArea);
  const maxUnits = calcMaxUnits(effectiveArea, form.kavlingArea);
  const landPricePerUnit = maxUnits > 0 ? form.landPriceTotal / maxUnits : 0;
  const landPricePerM2 = form.landArea > 0 ? form.landPriceTotal / form.landArea : 0;

  const chartData = [
    { name: "Jalan (18%)", area: roadArea, fill: "#f59e0b" },
    { name: "Fasum (12%)", area: fasumArea, fill: "#3b82f6" },
    { name: "Efektif (70%)", area: effectiveArea, fill: "#10b981" },
  ];

  const save = async () => {
    if (!form.projectId) { toast({ title: "Pilih proyek dulu", variant: "destructive" }); return; }
    const payload = {
      ...form,
      roadArea, fasumArea, effectiveArea, maxUnits,
      landPricePerUnit: Math.round(landPricePerUnit),
    };
    const url = savedId ? `/api/planning/land/${savedId}` : "/api/planning/land";
    const method = savedId ? "PATCH" : "POST";
    const resp = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    const d = await resp.json();
    setSavedId(d.id);
    await qc.invalidateQueries({ queryKey: ["planning-land"] });
    toast({ title: "Analisis lahan tersimpan" });
  };

  const projectList = Array.isArray(projects) ? projects : [];
  const prospectList = Array.isArray(prospects) ? prospects : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Analisis Lahan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kavling split 18/12/70, luas efektif, dan estimasi unit</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(!showImport)} className="gap-1.5">
            <Download className="size-3.5" />Import dari Akuisisi
          </Button>
          <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
        </div>
      </div>

      {/* Import from Akuisisi */}
      {showImport && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="size-3.5 text-primary" />
              Import Data dari Akuisisi Lahan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {prospectList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada data prospek di menu Akuisisi Lahan.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">Pilih prospek untuk mengisi otomatis data lahan (luas, harga, akses jalan, status legal, bentuk, kontur):</p>
                {prospectList.slice(0, 10).map((p: Record<string, unknown>) => (
                  <div key={p.id as number} className="flex items-center justify-between p-2.5 rounded-md border bg-background hover:border-primary/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.lokasi as string || `Prospek #${p.id}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.kelurahan, p.kecamatan, p.kabupaten].filter(Boolean).join(", ")}
                        {p.luas ? ` · ${(p.luas as number).toLocaleString("id-ID")} m²` : ""}
                        {p.hargaM2 ? ` · Rp ${(p.hargaM2 as number).toLocaleString("id-ID")}/m²` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{p.status as string}</Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => importFromProspect(p.id as number)}>
                        Import
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {urlProjectId && autoImported && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <MapPin className="size-3.5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Proyek:</span>
          <span className="text-xs font-semibold text-primary">
            {(projectList.find((p: Record<string, unknown>) => p.id === urlProjectId) as Record<string, string> | undefined)?.nama ?? `Proyek #${urlProjectId}`}
          </span>
          {urlProspectId && <span className="text-[10px] text-emerald-600 ml-auto">Data lahan diimpor dari Akuisisi</span>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select value={form.projectId ? String(form.projectId) : ""} onValueChange={v => selectProject(parseInt(v))}>
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

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Data Lahan</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {[
              ["landArea", "Total Luas Lahan (m²)", "number"],
              ["landPriceTotal", "Total Harga Lahan (Rp)", "number"],
              ["roadWidth", "Lebar Jalan Utama (m)", "number"],
              ["kavlingArea", "Luas Kavling/Unit (m²)", "number"],
            ].map(([k, label, type]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input className="h-8 text-sm" type={type} value={(form as Record<string, unknown>)[k] as number ?? 0} onChange={e => setF(k, e.target.value)} />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Bentuk Lahan</Label>
              <Select value={form.landShape} onValueChange={v => setF("landShape", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["Reguler", "Tidak Reguler", "L-Shape", "T-Shape"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kontur</Label>
              <Select value={form.contour} onValueChange={v => setF("contour", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["Datar", "Bergelombang", "Miring", "Curam"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status Legal</Label>
              <Select value={form.legalStatus} onValueChange={v => setF("legalStatus", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {["SHM", "HGB", "Girik", "AJB", "SHSRS", "Lainnya"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Catatan</Label>
              <Textarea className="text-sm resize-none" rows={2} value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Hasil Perhitungan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Area Jalan (18%)", val: `${roadArea.toLocaleString("id-ID")} m²`, color: "text-amber-500" },
                  { label: "Fasum/RTH (12%)", val: `${fasumArea.toLocaleString("id-ID")} m²`, color: "text-blue-500" },
                  { label: "Area Efektif (70%)", val: `${effectiveArea.toLocaleString("id-ID")} m²`, color: "text-emerald-500" },
                  { label: "Harga/m²", val: fmtCurrency(landPricePerM2), color: "text-foreground" },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded-md bg-muted/30 space-y-0.5">
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    <div className={`font-semibold text-sm ${item.color}`}>{item.val}</div>
                  </div>
                ))}
              </div>

              {form.kavlingArea > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Estimasi Maksimum Unit</span>
                    <Badge className="text-base px-3">{maxUnits.toLocaleString("id-ID")} unit</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Porsi lahan per unit</span>
                    <span className="font-medium">{fmtCurrency(landPricePerUnit)}/unit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Efisiensi lahan</span>
                    <span className="font-medium">70% (standar Satara)</span>
                  </div>
                </div>
              )}

              {form.landArea > 0 && form.landPriceTotal > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium mb-2">Auto-fill ke Feasibility Engine</div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div>• Total Unit: <span className="font-medium text-foreground">{maxUnits} unit</span></div>
                    <div>• Biaya Lahan: <span className="font-medium text-foreground">{fmtCurrency(form.landPriceTotal)}</span></div>
                    <div>• HPP Lahan/Unit: <span className="font-medium text-foreground">{fmtCurrency(landPricePerUnit)}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {form.landArea > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribusi Lahan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <XAxis type="number" fontSize={10} tickFormatter={v => `${v.toLocaleString("id-ID")}`} />
                    <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString("id-ID")} m²`, "Luas"]} />
                    <Bar dataKey="area" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
