import { apiJson } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const now = new Date();
const quarter = Math.ceil((now.getMonth() + 1) / 3);
const EMPTY = { employeeId: 0, periodYear: now.getFullYear(), periodQuarter: quarter, monthsWithoutPromotion: 0, salaryMarketGapPct: 0, jobSatisfactionScore: 7, hasExternalOffer: "tidak", notes: "" };

export default function FlightRisk() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["hr-employees"], queryFn: () => fetch("/api/hr/employees").then(apiJson) });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["hr-flight-risk"], queryFn: () => fetch("/api/hr/flight-risk").then(apiJson) });

  const save = useMutation({
    mutationFn: (body: any) => editId
      ? fetch(`/api/hr/flight-risk/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson)
      : fetch("/api/hr/flight-risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-flight-risk"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); resetForm(); },
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/hr/flight-risk/${id}`, { method: "DELETE" }).then(apiJson),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-flight-risk"] }); qc.invalidateQueries({ queryKey: ["hr-dashboard"] }); },
  });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }
  function startEdit(r: any) { setForm({ ...r }); setEditId(r.id); setShowForm(true); }
  function getEmpName(id: number) { return employees.find((e: any) => e.id === id)?.name ?? `#${id}`; }
  function getEmpDiv(id: number) { return employees.find((e: any) => e.id === id)?.division ?? ""; }

  const filtered = records.filter((r: any) => r.periodYear === filterYear);
  const highRisk = filtered.filter((r: any) => r.riskLevel === "high");
  const medRisk = filtered.filter((r: any) => r.riskLevel === "medium");
  const lowRisk = filtered.filter((r: any) => r.riskLevel === "low");

  const riskColor = (level: string) => level === "high" ? "bg-red-100 text-red-700 border-red-200" : level === "medium" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
  const riskLabel = (level: string) => level === "high" ? "High Risk" : level === "medium" ? "Medium Risk" : "Low Risk";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Flight Risk Score</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Identifikasi karyawan berpotensi resign untuk intervensi proaktif</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90"><Plus className="size-3.5" /> Input Assessment</button>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "🔴 High Risk", val: highRisk.length, desc: "Risiko resign sangat tinggi", color: "text-red-600 border-red-200" },
          { label: "🟡 Medium Risk", val: medRisk.length, desc: "Perlu perhatian khusus", color: "text-amber-600 border-amber-200" },
          { label: "🟢 Low Risk", val: lowRisk.length, desc: "Aman", color: "text-emerald-600 border-emerald-200" },
        ].map(({ label, val, desc, color }) => (
          <div key={label} className={cn("bg-card border rounded-xl p-4", color.split(" ")[1])}>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-bold", color.split(" ")[0])}>{val}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{desc}</div>
          </div>
        ))}
      </div>

      {highRisk.length > 0 && (
        <div className="space-y-2">
          {highRisk.map((r: any) => (
            <div key={r.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-700">{getEmpName(r.employeeId)}</span>
                <span className="text-red-600 ml-2">({getEmpDiv(r.employeeId)})</span>
                <span className="text-red-600 ml-2">— Flight Risk Score: {Number(r.flightRiskScore).toFixed(1)}/100</span>
                <div className="text-xs text-red-500 mt-0.5">
                  {r.hasExternalOffer === "ya" && "• Ada tawaran eksternal "}
                  {Number(r.monthsWithoutPromotion) > 24 && `• ${r.monthsWithoutPromotion} bulan tanpa promosi `}
                  {Number(r.jobSatisfactionScore) < 5 && `• Kepuasan kerja rendah (${r.jobSatisfactionScore}/10)`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-3 py-3 font-medium">Divisi</th>
                <th className="text-center px-3 py-3 font-medium">Q</th>
                <th className="text-center px-3 py-3 font-medium">Bulan Tanpa Promosi</th>
                <th className="text-center px-3 py-3 font-medium">Gap Salary (%)</th>
                <th className="text-center px-3 py-3 font-medium">Kepuasan (1-10)</th>
                <th className="text-center px-3 py-3 font-medium">Tawaran Luar</th>
                <th className="text-center px-3 py-3 font-medium">Risk Score</th>
                <th className="text-center px-3 py-3 font-medium">Level</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a: any, b: any) => Number(b.flightRiskScore) - Number(a.flightRiskScore)).map((r: any) => (
                <tr key={r.id} className={cn("border-b last:border-0 hover:bg-muted/20", r.riskLevel === "high" ? "bg-red-50/50" : "")}>
                  <td className="px-4 py-2.5 font-medium">{getEmpName(r.employeeId)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{getEmpDiv(r.employeeId)}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground">Q{r.periodQuarter}</td>
                  <td className="text-center px-3 py-2.5">{r.monthsWithoutPromotion} bln</td>
                  <td className="text-center px-3 py-2.5"><span className={cn(Number(r.salaryMarketGapPct) < -10 ? "text-red-500 font-semibold" : "")}>{Number(r.salaryMarketGapPct) > 0 ? `+${r.salaryMarketGapPct}` : r.salaryMarketGapPct}%</span></td>
                  <td className="text-center px-3 py-2.5"><span className={cn(Number(r.jobSatisfactionScore) < 5 ? "text-red-500 font-semibold" : "")}>{r.jobSatisfactionScore}/10</span></td>
                  <td className="text-center px-3 py-2.5"><span className={cn("px-1.5 py-0.5 rounded text-[11px] font-medium", r.hasExternalOffer === "ya" ? "bg-red-100 text-red-700" : r.hasExternalOffer === "mungkin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>{r.hasExternalOffer}</span></td>
                  <td className="text-center px-3 py-2.5 font-bold">{Number(r.flightRiskScore).toFixed(1)}</td>
                  <td className="text-center px-3 py-2.5"><span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", riskColor(r.riskLevel))}>{riskLabel(r.riskLevel)}</span></td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="p-1 hover:bg-muted rounded"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }} className="p-1 hover:bg-muted rounded"><Trash2 className="size-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">Belum ada data flight risk assessment.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3">Cara Penghitungan Flight Risk Score</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
          {[{ factor: "Bulan Tanpa Promosi", weight: "25%", note: "≥60 bln = 100 poin" }, { factor: "Gap Gaji vs Market", weight: "35%", note: "Makin bawah market = makin tinggi risiko" }, { factor: "Kepuasan Kerja", weight: "25%", note: "Skor 1 = risiko 100" }, { factor: "Tawaran Eksternal", weight: "15%", note: "Ya=100, Mungkin=50, Tidak=0" }].map(f => (
            <div key={f.factor} className="border rounded-lg p-2">
              <div className="font-medium text-foreground text-[11px]">{f.factor}</div>
              <div className="text-blue-600 font-semibold text-xs mt-0.5">Bobot: {f.weight}</div>
              <div className="mt-0.5">{f.note}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Score &gt;70 = High Risk, 40-70 = Medium Risk, &lt;40 = Low Risk</p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{editId ? "Edit" : "Input"} Flight Risk Assessment</h3><button onClick={resetForm}><X className="size-4" /></button></div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Karyawan *</label><select value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value={0}>— Pilih karyawan —</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.division})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label><select value={form.periodYear} onChange={e => setForm((f: any) => ({ ...f, periodYear: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kuartal</label><select value={form.periodQuarter} onChange={e => setForm((f: any) => ({ ...f, periodQuarter: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Bulan Tanpa Promosi</label><input type="number" value={form.monthsWithoutPromotion ?? 0} onChange={e => setForm((f: any) => ({ ...f, monthsWithoutPromotion: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={0} /></div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gap Gaji vs Market (%) — Negatif jika di bawah market</label>
                <input type="number" value={form.salaryMarketGapPct ?? 0} onChange={e => setForm((f: any) => ({ ...f, salaryMarketGapPct: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Contoh: -15 jika gaji 15% di bawah market" />
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Skor Kepuasan Kerja (1-10)</label><input type="number" value={form.jobSatisfactionScore ?? 7} onChange={e => setForm((f: any) => ({ ...f, jobSatisfactionScore: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" min={1} max={10} /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Memiliki Tawaran Eksternal?</label><select value={form.hasExternalOffer} onChange={e => setForm((f: any) => ({ ...f, hasExternalOffer: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="tidak">Tidak</option><option value="mungkin">Mungkin</option><option value="ya">Ya</option></select></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan / Rekomendasi Intervensi</label><textarea value={form.notes ?? ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" rows={2} /></div>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => save.mutate(form)} disabled={!form.employeeId || save.isPending} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="size-3.5" /> {save.isPending ? "Menghitung..." : "Simpan & Hitung"}</button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
