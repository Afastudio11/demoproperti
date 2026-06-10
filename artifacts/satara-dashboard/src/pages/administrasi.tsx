import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, TrendingUp, AlertTriangle, Building2, DollarSign, Activity, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  { key: "MINAT", label: "Minat" },
  { key: "PROSES_BERKAS", label: "Proses Berkas" },
  { key: "BERKAS_LENGKAP", label: "Berkas Lengkap" },
  { key: "SETOR_BANK", label: "Setor Bank" },
  { key: "OTS", label: "OTS" },
  { key: "SP3K", label: "SP3K" },
  { key: "AKAD", label: "Akad" },
  { key: "HT_CAIR", label: "HT Cair" },
];

const STAGE_COLORS: Record<string, string> = {
  MINAT: "bg-blue-100 text-blue-700 border-blue-200",
  PROSES_BERKAS: "bg-blue-200 text-blue-800 border-blue-300",
  BERKAS_LENGKAP: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SETOR_BANK: "bg-yellow-100 text-yellow-700 border-yellow-200",
  OTS: "bg-amber-100 text-amber-700 border-amber-200",
  SP3K: "bg-orange-100 text-orange-700 border-orange-200",
  AKAD: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HT_CAIR: "bg-green-100 text-green-800 border-green-200",
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function Administrasi() {
  const { data, isLoading } = useQuery({
    queryKey: ["administrasi-dashboard"],
    queryFn: () => fetch("/api/administrasi/dashboard").then(r => r.json()),
    refetchInterval: 30000,
  });


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Administrasi KPR</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline Booking → Berkas → Setor → OTS → SP3K → Akad → HT Cair</p>
        </div>
        <Link href="/administrasi/customer/new">
          <button className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
            <Users className="size-3.5" />
            Tambah Customer
          </button>
        </Link>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="font-medium text-sm">Perhatian Segera</h3>
          </div>
          <div className="space-y-2 text-sm">
            {(data?.agingKritis ?? 0) > 0 && (
              <Link href="/administrasi/aging?level=kritis">
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                  <XCircle className="size-4 text-red-500 shrink-0" />
                  <span className="text-red-700">{data.agingKritis} customer macet kritis (&gt;30 hari)</span>
                </div>
              </Link>
            )}
            {(data?.agingWarning ?? 0) > 0 && (
              <Link href="/administrasi/aging?level=warning">
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                  <Clock className="size-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700">{data.agingWarning} customer warning (&gt;14 hari)</span>
                </div>
              </Link>
            )}
            {(data?.expiredSoon ?? 0) > 0 && (
              <Link href="/administrasi/sp3k">
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="size-4 text-orange-500 shrink-0" />
                  <span className="text-orange-700">{data.expiredSoon} SP3K akan expired &lt;14 hari</span>
                </div>
              </Link>
            )}
            {(data?.agingKritis ?? 0) === 0 && (data?.agingWarning ?? 0) === 0 && (data?.expiredSoon ?? 0) === 0 && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-700">Semua pipeline berjalan normal</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Menu Cepat</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Daftar Customer", path: "/administrasi/customer", icon: Users },
              { label: "Bank Submission", path: "/administrasi/bank-submission", icon: Building2 },
              { label: "OTS Tracker", path: "/administrasi/ots", icon: Clock },
              { label: "SP3K Tracker", path: "/administrasi/sp3k", icon: CheckCircle2 },
              { label: "Akad Tracker", path: "/administrasi/akad", icon: TrendingUp },
              { label: "HT Tracker", path: "/administrasi/ht", icon: DollarSign },
              { label: "Aging Pipeline", path: "/administrasi/aging", icon: AlertTriangle },
              { label: "Komplain", path: "/administrasi/komplain", icon: XCircle },
            ].map(({ label, path, icon: Icon }) => (
              <Link key={path} href={path}>
                <div className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer text-xs font-medium">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
