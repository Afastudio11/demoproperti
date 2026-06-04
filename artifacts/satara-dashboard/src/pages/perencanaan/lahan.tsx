import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { calcLandAnalysis, calcMaxUnits, fmtCurrency } from "@/lib/planning-calc";
import { Save } from "lucide-react";
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

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()) });

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

  const setF = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: typeof v === "string" ? (parseFloat(v) || v) : v }));

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Analisis Lahan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kavling split 18/12/70, luas efektif, dan estimasi unit</p>
        </div>
        <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Proyek</Label>
        <Select onValueChange={v => selectProject(parseInt(v))}>
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
              <Select onValueChange={v => setF("landShape", v)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Pilih..." defaultValue={form.landShape} />
                </SelectTrigger>
                <SelectContent>
                  {["Reguler", "Tidak Reguler", "L-Shape", "T-Shape"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kontur</Label>
              <Select onValueChange={v => setF("contour", v)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Pilih..." defaultValue={form.contour} />
                </SelectTrigger>
                <SelectContent>
                  {["Datar", "Bergelombang", "Miring", "Curam"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status Legal</Label>
              <Select onValueChange={v => setF("legalStatus", v)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Pilih..." defaultValue={form.legalStatus} />
                </SelectTrigger>
                <SelectContent>
                  {["SHM", "HGB", "Girik", "SHSRS", "Lainnya"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
