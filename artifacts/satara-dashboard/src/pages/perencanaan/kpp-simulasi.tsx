import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function fmtRp(n: number) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n); }

function buildAmortization(pokok: number, bungaPerTahun: number, bulanTotal: number) {
  const bungaPerBulan = bungaPerTahun / 100 / 12;
  const angsuran = pokok * bungaPerBulan * Math.pow(1 + bungaPerBulan, bulanTotal) / (Math.pow(1 + bungaPerBulan, bulanTotal) - 1);
  const rows = [];
  let sisaPokok = pokok;
  for (let i = 1; i <= Math.min(bulanTotal, 120); i++) {
    const bunga = sisaPokok * bungaPerBulan;
    const pokokBayar = angsuran - bunga;
    sisaPokok -= pokokBayar;
    rows.push({
      bulan: i,
      angsuran: Math.round(angsuran),
      bungaBayar: Math.round(bunga),
      pokokBayar: Math.round(pokokBayar),
      sisaPokok: Math.max(0, Math.round(sisaPokok)),
    });
  }
  return { angsuran: Math.round(angsuran), rows };
}

export default function KppSimulasiPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState({
    nilaiKredit: "5000000000",
    bungaTahunan: "10.5",
    tenorTahun: "24",
    tanggalPencairan: new Date().toISOString().slice(0, 7),
    graceMonths: "3",
  });

  const { data: kppData } = useQuery<any[]>({
    queryKey: ["planning-kpp"],
    queryFn: () => fetch("/api/planning/kpp").then(r => r.json()),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pokok = parseFloat(form.nilaiKredit) || 0;
  const bunga = parseFloat(form.bungaTahunan) || 0;
  const tenor = parseInt(form.tenorTahun) * 12 || 0;
  const grace = parseInt(form.graceMonths) || 0;

  const { angsuran, rows } = buildAmortization(pokok, bunga, tenor - grace);

  const interestOnly = pokok * (bunga / 100 / 12);
  const totalBunga = rows.reduce((s, r) => s + r.bungaBayar, 0) + interestOnly * grace;
  const totalBayar = pokok + totalBunga;

  const chartData = rows.filter((_, i) => i % 3 === 0).map(r => ({
    bulan: `B${r.bulan + grace}`,
    Angsuran: r.angsuran,
    Bunga: r.bungaBayar,
    Pokok: r.pokokBayar,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/perencanaan/cashflow"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Simulasi Pelunasan KPP</h1>
          <p className="text-xs text-muted-foreground">Tabel amortisasi kredit konstruksi / KPP</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Parameter KPP</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k:"nilaiKredit", label:"Nilai Kredit (Rp)", type:"number", placeholder:"5000000000" },
              { k:"bungaTahunan", label:"Suku Bunga / Tahun (%)", type:"number", placeholder:"10.5" },
              { k:"tenorTahun", label:"Tenor (Tahun)", type:"number", placeholder:"24" },
              { k:"graceMonths", label:"Grace Period (Bulan)", type:"number", placeholder:"3" },
              { k:"tanggalPencairan", label:"Tanggal Pencairan", type:"month", placeholder:"" },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type={type} className="h-8 text-xs" value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Nilai KPP", value: fmtRp(pokok) },
          { label: "Angsuran / Bulan", value: fmtRp(angsuran) },
          { label: "Total Bunga", value: fmtRp(totalBunga) },
          { label: "Total Bayar", value: fmtRp(totalBayar) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Grafik Amortisasi (setiap 3 bulan)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(v: number) => fmtRp(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Bunga" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Pokok" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {grace > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Grace Period ({grace} Bulan Pertama)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Bulan","Bayar Bunga Saja","Sisa Pokok"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: grace }, (_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{fmtRp(interestOnly)}</td>
                    <td className="px-3 py-2">{fmtRp(pokok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Tabel Amortisasi (setelah grace period)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b bg-muted/40">
                  {["Bulan","Angsuran","Bunga","Pokok","Sisa Pokok"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.bulan} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-1.5">{r.bulan + grace}</td>
                    <td className="px-3 py-1.5">{fmtRp(r.angsuran)}</td>
                    <td className="px-3 py-1.5 text-red-600">{fmtRp(r.bungaBayar)}</td>
                    <td className="px-3 py-1.5 text-emerald-600">{fmtRp(r.pokokBayar)}</td>
                    <td className="px-3 py-1.5">{fmtRp(r.sisaPokok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
