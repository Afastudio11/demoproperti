import { Link } from "wouter";
import {
  Users, Eye, Target, DollarSign, BarChart3, Package,
  Megaphone, Star, TrendingUp, Compass,
} from "lucide-react";

const MODULES = [
  {
    group: "Manajemen Lead",
    items: [
      { name: "Daftar Lead", path: "/marketing/lead", icon: Users, desc: "Pipeline lead & follow-up" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { name: "Branding & Konten", path: "/marketing/branding", icon: Star, desc: "Skor branding & konten" },
      { name: "Campaign Digital", path: "/marketing/campaign", icon: Megaphone, desc: "Tracking campaign & CPL" },
      { name: "Performa Sales", path: "/marketing/sales", icon: TrendingUp, desc: "Leaderboard & produktivitas sales" },
    ],
  },
  {
    group: "Analitik",
    items: [
      { name: "Absorpsi Proyek", path: "/marketing/absorption", icon: BarChart3, desc: "Unit terjual & absorption rate" },
      { name: "Stok & Coverage", path: "/marketing/stock", icon: Package, desc: "Coverage stok per proyek" },
      { name: "Demand Forecast", path: "/marketing/forecast", icon: Eye, desc: "Prediksi booking bulan depan" },
      { name: "Demand Score", path: "/marketing/demand-score", icon: Target, desc: "Skor permintaan pasar" },
      { name: "Kompetitor", path: "/marketing/kompetitor", icon: Compass, desc: "Analisis kompetitor" },
      { name: "Skor Kesehatan", path: "/marketing/health", icon: DollarSign, desc: "Marketing health score" },
    ],
  },
];

export default function Marketing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Marketing</h1>
        <p className="text-sm text-muted-foreground">Manajemen lead, kampanye, dan analitik marketing</p>
      </div>

      {MODULES.map(group => (
        <div key={group.group}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.group}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map(mod => (
              <Link key={mod.path} href={mod.path}>
                <div className="bg-card border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer flex items-start gap-3">
                  <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <mod.icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{mod.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
