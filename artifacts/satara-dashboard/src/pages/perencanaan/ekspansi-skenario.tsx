import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

function fmtRp(n: number) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", notation:"compact", maximumFractionDigits:1 }).format(n); }

const SCENARIOS = [
  { id: "konservatif", label: "Konservatif", color: "bg-blue-100 border-blue-300", textColor: "text-blue-700", adjUnit: 0.7, adjHarga: 0.9, adjOpex: 1.1 },
  { id: "moderat", label: "Moderat", color: "bg-amber-50 border-amber-200", textColor: "text-amber-700", adjUnit: 1.0, adjHarga: 1.0, adjOpex: 1.0 },
  { id: "optimis", label: "Optimis", color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700", adjUnit: 1.3, adjHarga: 1.1, adjOpex: 0.9 },
];

export default function EkspansiSkenarioPage() {
  const [base, setBase] = useState({
    totalUnit: "100", hargaRata: "175000000", hppPerUnit: "120000000",
    biayaLahan: "5000000000", biayaOps: "500000000", tenor: "36",
  });

  const set = (k: string, v: string) => setBase(f => ({ ...f, [k]: v }));

  const totalUnit = parseFloat(base.totalUnit) || 0;
  const hargaRata = parseFloat(base.hargaRata) || 0;
  const hppPerUnit = parseFloat(base.hppPerUnit) || 0;
  const biayaLahan = parseFloat(base.biayaLahan) || 0;
  const biayaOps = parseFloat(base.biayaOps) || 0;
  const tenor = parseFloat(base.tenor) || 36;

  function calcScenario(adj: { adjUnit: number; adjHarga: number; adjOpex: number }) {
    const unit = Math.round(totalUnit * adj.adjUnit);
    const harga = hargaRata * adj.adjHarga;
    const hpp = hppPerUnit * adj.adjOpex;
    const revenue = unit * harga;
    const cogs = unit * hpp + biayaLahan;
    const opex = biayaOps * adj.adjOpex;
    const laba = revenue - cogs - opex;
    const roi = (revenue > 0) ? Math.round(laba / (cogs + opex) * 100) : 0;
    const margin = (revenue > 0) ? Math.round(laba / revenue * 100) : 0;
    const irr = Math.round(roi / (tenor / 12) * 0.7);
    return { unit, harga, hpp, revenue, cogs, opex, laba, roi, margin, irr, payback: Math.round(tenor * 0.6) };
  }

  const results = SCENARIOS.map(s => ({ ...s, ...calcScenario(s) }));

  const chartData = [
    { name: "Revenue", ...Object.fromEntries(results.map(r => [r.label, r.revenue])) },
    { name: "Laba", ...Object.fromEntries(results.map(r => [r.label, r.laba])) },
    { name: "Biaya Total", ...Object.fromEntries(results.map(r => [r.cogs + r.opex])) },
  ];

  const roiChart = results.map(r => ({ skenario: r.label, ROI: r.roi, Margin: r.margin, IRR: r.irr }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/perencanaan/ekspansi/kesiapan"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Simulasi Skenario Ekspansi</h1>
          <p className="text-xs text-muted-foreground">Bandingkan 3 skenario strategis ekspansi proyek baru</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Parameter Dasar Proyek Ekspansi</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k:"totalUnit", label:"Total Unit Rencana" },
              { k:"hargaRata", label:"Harga Rata-rata / Unit (Rp)" },
              { k:"hppPerUnit", label:"HPP / Unit (Rp)" },
              { k:"biayaLahan", label:"Biaya Lahan (Rp)" },
              { k:"biayaOps", label:"Biaya Operasional (Rp)" },
              { k:"tenor", label:"Tenor Proyek (Bulan)" },
            ].map(({ k, label }) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type="number" className="h-8 text-xs" value={(base as any)[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {results.map(r => (
          <Card key={r.id} className={cn("border-2", r.color)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("text-sm", r.textColor)}>{r.label}</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {r.id === "konservatif" ? "Unit ×0.7, Harga ×0.9, Opex ×1.1" :
                 r.id === "moderat" ? "Parameter base tanpa penyesuaian" :
                 "Unit ×1.3, Harga ×1.1, Opex ×0.9"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Total Unit", value: String(r.unit) },
                { label: "Revenue", value: fmtRp(r.revenue) },
                { label: "Total Biaya", value: fmtRp(r.cogs + r.opex) },
                { label: "Laba Bersih", value: fmtRp(r.laba), highlight: true },
                { label: "ROI", value: `${r.roi}%` },
                { label: "Margin", value: `${r.margin}%` },
                { label: "IRR (est.)", value: `${r.irr}%` },
                { label: "Payback", value: `${r.payback} bulan` },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between items-center border-b border-border/30 pb-1 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={cn("text-xs font-semibold", highlight ? r.textColor : "")}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Perbandingan ROI, Margin & IRR</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roiChart}>
              <XAxis dataKey="skenario" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="ROI" fill="#3b82f6" radius={[2,2,0,0]} />
              <Bar dataKey="Margin" fill="#10b981" radius={[2,2,0,0]} />
              <Bar dataKey="IRR" fill="#f59e0b" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="bg-muted/40 rounded-lg border p-4">
        <p className="text-xs font-semibold mb-2">Rekomendasi:</p>
        {results[2].roi >= 35 ? (
          <p className="text-xs text-muted-foreground">Skenario <strong>Optimis</strong> menunjukkan ROI {results[2].roi}% yang memenuhi threshold go (≥35%). Dengan kondisi pasar yang mendukung, ekspansi dapat dipertimbangkan untuk dieksekusi dalam 6 bulan ke depan.</p>
        ) : results[1].roi >= 25 ? (
          <p className="text-xs text-muted-foreground">Skenario <strong>Moderat</strong> menunjukkan ROI {results[1].roi}%. Lakukan pengkajian lebih lanjut pada optimasi biaya lahan dan HPP sebelum mengambil keputusan ekspansi.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Semua skenario menunjukkan ROI di bawah threshold. Tinjau kembali struktur biaya atau cari lokasi dengan harga lahan yang lebih kompetitif.</p>
        )}
      </div>
    </div>
  );
}
