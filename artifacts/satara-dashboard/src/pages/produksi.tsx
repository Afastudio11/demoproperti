import { Link } from "wouter";
import {
  HardHat, TrendingUp, Package, DollarSign, Activity,
  CheckSquare, Building2, BarChart3, Shield, Key
} from "lucide-react";

const quickLinks = [
  { name: "Progress Unit",  path: "/produksi/progress/unit",    icon: CheckSquare },
  { name: "Progress Tahap", path: "/produksi/progress/tahap",   icon: TrendingUp },
  { name: "Progress Proyek",path: "/produksi/progress/proyek",  icon: HardHat },
  { name: "Termin Bayar",   path: "/produksi/subkon/termin",    icon: DollarSign },
  { name: "Stok Material",  path: "/produksi/material/stok",    icon: Package },
  { name: "QC Checklist",   path: "/produksi/qc/checklist",     icon: Shield },
  { name: "Ready Akad",     path: "/produksi/ready-akad",       icon: Key },
  { name: "Fasum",          path: "/produksi/fasum",            icon: Building2 },
  { name: "Analitik",       path: "/produksi/analitik/velocity",icon: BarChart3 },
  { name: "Health Score",   path: "/produksi/health",           icon: Activity },
];

const subModules = [
  {
    group: "Progress Konstruksi",
    items: [
      { name: "Per Unit",    path: "/produksi/progress/unit",    desc: "Checklist 24 item per unit" },
      { name: "Per Tahap",   path: "/produksi/progress/tahap",   desc: "Progress per tahap pekerjaan" },
      { name: "Per Proyek",  path: "/produksi/progress/proyek",  desc: "Summary progress per proyek" },
    ],
  },
  {
    group: "Subkontraktor",
    items: [
      { name: "Kontrak",    path: "/produksi/subkon/kontrak",   desc: "Daftar & nilai kontrak subkon" },
      { name: "Termin",     path: "/produksi/subkon/termin",    desc: "Pembayaran termin & approval" },
      { name: "Approval",   path: "/produksi/subkon/approval",  desc: "Antrian approval termin" },
      { name: "Performa",   path: "/produksi/subkon/performa",  desc: "Skor & efisiensi material subkon" },
    ],
  },
  {
    group: "Material",
    items: [
      { name: "Master",     path: "/produksi/material/master",   desc: "Daftar & harga satuan material" },
      { name: "Stok",       path: "/produksi/material/stok",     desc: "Stok aktual & alert minimum" },
      { name: "Masuk",      path: "/produksi/material/masuk",    desc: "Penerimaan material" },
      { name: "Keluar",     path: "/produksi/material/keluar",   desc: "Pengeluaran material ke lapangan" },
      { name: "Konsumsi",   path: "/produksi/material/konsumsi", desc: "Konsumsi aktual vs standar" },
      { name: "Variance",   path: "/produksi/material/variance", desc: "Variance & penyimpangan material" },
      { name: "Forecast Material", path: "/produksi/material/forecast", desc: "Prediksi kebutuhan material" },
    ],
  },
  {
    group: "Quality Control",
    items: [
      { name: "Checklist QC", path: "/produksi/qc/checklist", desc: "Penilaian kualitas per unit" },
      { name: "Defect",       path: "/produksi/qc/defect",    desc: "Daftar & tracking defect" },
      { name: "Rework",       path: "/produksi/qc/rework",    desc: "Pekerjaan ulang per subkon" },
    ],
  },
  {
    group: "Fasilitas & Lainnya",
    items: [
      { name: "Fasum",        path: "/produksi/fasum",       desc: "Progress fasilitas umum" },
      { name: "Ready Akad",   path: "/produksi/ready-akad",  desc: "Unit siap akad kredit" },
      { name: "Health Score", path: "/produksi/health",      desc: "Skor kesehatan proyek" },
    ],
  },
  {
    group: "Analitik",
    items: [
      { name: "Velocity",           path: "/produksi/analitik/velocity",       desc: "Kecepatan produksi per unit" },
      { name: "Produktivitas",      path: "/produksi/analitik/produktivitas",   desc: "Output subkon vs target" },
      { name: "Forecast Penyelesaian", path: "/produksi/analitik/forecast", desc: "Prediksi selesai per unit" },
      { name: "Cost to Complete",   path: "/produksi/analitik/cost-to-complete",desc: "Sisa biaya konstruksi" },
      { name: "Dampak Termin ke Cashflow", path: "/produksi/analitik/cashflow-impact", desc: "Dampak pembayaran termin subkon ke arus kas" },
      { name: "Baseline",           path: "/produksi/analitik/baseline",        desc: "Realisasi vs baseline plan" },
      { name: "Eligibilitas",       path: "/produksi/analitik/eligibilitas",    desc: "Unit eligible KPR" },
    ],
  },
];

export default function Produksi() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Produksi</h1>
        <p className="text-sm text-muted-foreground">Monitoring konstruksi, subkon, material, dan QC secara real-time</p>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {quickLinks.map(ql => (
          <Link key={ql.path} href={ql.path}>
            <div className="rounded-md border p-2.5 flex flex-col items-center gap-1.5 hover:bg-muted/50 transition-colors cursor-pointer text-center">
              <ql.icon className="size-4 text-primary" />
              <span className="text-[10px] leading-tight text-muted-foreground">{ql.name}</span>
            </div>
          </Link>
        ))}
      </div>

      {subModules.map(group => (
        <div key={group.group}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.group}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map(mod => (
              <Link key={mod.path} href={mod.path}>
                <div className="bg-card border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <div className="font-medium text-sm">{mod.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
