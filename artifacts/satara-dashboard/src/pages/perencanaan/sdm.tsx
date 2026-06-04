import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function SDMPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    siteManagers: 1,
    supervisors: 2,
    workers: 10,
    workersPerUnit: 3,
    unitsPerManager: 20,
  });

  useQuery({
    queryKey: ["planning-sdm"],
    queryFn: () => fetch("/api/planning/sdm").then(r => r.json()),
    onSuccess: (d: Record<string, number> | null) => {
      if (d) setForm({
        siteManagers: d.siteManagers ?? 1,
        supervisors: d.supervisors ?? 2,
        workers: d.workers ?? 10,
        workersPerUnit: d.workersPerUnit ?? 3,
        unitsPerManager: d.unitsPerManager ?? 20,
      });
    },
  });

  const setF = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: parseFloat(v) || 0 }));

  const maxCapacityUnits = Math.floor(form.siteManagers * form.unitsPerManager);
  const maxParallelWorkers = form.workers;
  const workerCapacityUnits = form.workersPerUnit > 0 ? Math.floor(form.workers / form.workersPerUnit) : 0;
  const effectiveCapacity = Math.min(maxCapacityUnits, workerCapacityUnits);
  const supervisorRatio = form.supervisors > 0 ? Math.floor(form.workers / form.supervisors) : 0;

  const save = async () => {
    const resp = await fetch("/api/planning/sdm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!resp.ok) { toast({ title: "Gagal simpan", variant: "destructive" }); return; }
    await qc.invalidateQueries({ queryKey: ["planning-sdm"] });
    toast({ title: "Data SDM tersimpan" });
  };

  const chartData = [
    { name: "Site Manager", count: form.siteManagers, fill: "#3b82f6" },
    { name: "Supervisor", count: form.supervisors, fill: "#8b5cf6" },
    { name: "Pekerja", count: form.workers, fill: "#10b981" },
  ];

  const capacityChartData = [
    { name: "Kapasitas Manajerial", units: maxCapacityUnits, fill: "#3b82f6" },
    { name: "Kapasitas Pekerja", units: workerCapacityUnits, fill: "#10b981" },
    { name: "Kapasitas Efektif", units: effectiveCapacity, fill: "#f59e0b" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Sumber Daya Manusia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kapasitas tim & perencanaan alokasi SDM proyek</p>
        </div>
        <Button size="sm" onClick={save} className="gap-1.5"><Save className="size-3.5" />Simpan</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Jumlah SDM Tersedia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["siteManagers", "Site Manager", "orang"],
              ["supervisors", "Supervisor / Mandor", "orang"],
              ["workers", "Total Pekerja Lapangan", "orang"],
            ].map(([k, label, unit]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center gap-2">
                  <Input className="h-8 text-sm w-24" type="number" value={(form as Record<string, number>)[k]} onChange={e => setF(k, e.target.value)} />
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Standar Produktivitas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["workersPerUnit", "Pekerja per Unit (paralel)", "orang/unit"],
              ["unitsPerManager", "Kapasitas 1 Site Manager", "unit"],
            ].map(([k, label, unit]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center gap-2">
                  <Input className="h-8 text-sm w-24" type="number" value={(form as Record<string, number>)[k]} onChange={e => setF(k, e.target.value)} />
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Rasio Supervisor:Pekerja = 1:{supervisorRatio}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribusi SDM</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Kapasitas Produksi Paralel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={capacityChartData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 10 }}>
                <XAxis type="number" fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={10} width={130} />
                <Tooltip formatter={(v: number) => [`${v} unit`, ""]} />
                <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                  {capacityChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Kapasitas Efektif", val: `${effectiveCapacity} unit`, color: "text-amber-500" },
                { label: "Pembatas", val: maxCapacityUnits <= workerCapacityUnits ? "Manajerial" : "Pekerja", color: "text-red-500" },
              ].map(item => (
                <div key={item.label} className="p-2 rounded bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className={`font-semibold text-sm ${item.color}`}>{item.val}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ringkasan Kapasitas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Total SDM", val: `${form.siteManagers + form.supervisors + form.workers} orang` },
              { label: "Max Unit (Manajerial)", val: `${maxCapacityUnits} unit` },
              { label: "Max Unit (Pekerja)", val: `${workerCapacityUnits} unit` },
              { label: "Kapasitas Efektif", val: `${effectiveCapacity} unit` },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.val}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
