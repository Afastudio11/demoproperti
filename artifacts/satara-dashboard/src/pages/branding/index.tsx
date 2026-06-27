import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, Users, Eye, MessageCircle, Star, BarChart3, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreGauge({ score, label, hasData = true }: { score: number; label: string; hasData?: boolean }) {
  const color = !hasData ? "text-slate-400" : score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
  const bgColor = !hasData ? "bg-slate-50 border-slate-200" : score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const badge = !hasData ? "BELUM ADA DATA" : score >= 80 ? "SEHAT" : score >= 60 ? "WASPADA" : "KRITIS";
  const badgeColor = !hasData ? "bg-slate-100 text-slate-600" : score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <div className={cn("rounded-xl border-2 p-6 flex flex-col items-center gap-2", bgColor)}>
      <div className={cn("text-6xl font-black", color)}>{hasData ? score : "N/A"}</div>
      <div className="text-sm text-slate-500 font-medium">/ 100</div>
      <span className={cn("px-3 py-1 rounded-full text-xs font-bold tracking-wide", badgeColor)}>{badge}</span>
      <div className="text-sm text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color = "blue" }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-lg", colors[color])}><Icon size={16} /></div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

const PIPELINE_STAGES = ["idea","script","shooting","editing","review","approved","posted"] as const;
const STAGE_LABELS: Record<string, string> = { idea: "Idea", script: "Script", shooting: "Shooting", editing: "Editing", review: "Review", approved: "Approved", posted: "Posted" };
const STAGE_COLORS: Record<string, string> = { idea: "bg-slate-100 text-slate-600", script: "bg-sky-100 text-sky-700", shooting: "bg-blue-100 text-blue-700", editing: "bg-yellow-100 text-yellow-700", review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", posted: "bg-emerald-100 text-emerald-700" };

function projectStatusColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export default function BrandingDashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["branding-dashboard"],
    queryFn: () => fetch("/api/branding/dashboard").then(r => r.json()),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-400">Memuat data...</div>;

  const d = data ?? {};
  const pipeline = d.pipeline ?? {};
  const projects = d.projectScores ?? [];
  const health = d.healthComponents ?? {};

  const healthComponents = [
    { label: "Reach", score: Math.round(health.reachScore ?? 0), target: "100.000/bln", bobot: "20%" },
    { label: "Engagement", score: Math.round(health.engScore ?? 0), target: "5%", bobot: "20%" },
    { label: "Content Consistency", score: Math.round(health.contentCompletion ?? 0), target: "30 konten", bobot: "20%" },
    { label: "Sentiment", score: Math.round(health.sentimentComp ?? 0), target: "80% positif", bobot: "20%" },
    { label: "Organic Lead", score: Math.round(health.organicLeadContrib ?? 0), target: "30%", bobot: "20%" },
  ];

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Branding — Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Satara Development Brand Intelligence Platform</p>
        </div>
        <Link href="/branding/health">
          <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition">Lihat Health Report →</button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ScoreGauge score={d.brandHealthScore ?? 0} label="Brand Health Score" hasData={d.hasData} />
          <div className="mt-4 space-y-2">
            {healthComponents.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <div className="text-xs text-slate-500 w-32 shrink-0">{c.label}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div className={cn("h-1.5 rounded-full", !d.hasData ? "bg-slate-300" : c.score >= 80 ? "bg-emerald-500" : c.score >= 60 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${d.hasData ? c.score : 0}%` }} />
                </div>
                <div className="text-xs font-medium text-slate-700 w-8 text-right">{d.hasData ? c.score : "-"}</div>
                <div className="text-xs text-slate-400 w-6">{c.bobot}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Reach Bulanan" value={(d.totalReach ?? 0).toLocaleString("id")} icon={Eye} color="blue" />
            <MetricCard label="Engagement Rate" value={`${d.engagementRate ?? 0}%`} sub="Target: 5%" icon={TrendingUp} color="green" />
            <MetricCard label="Sentiment Score" value={`${d.sentimentScore ?? 0}%`} sub="Komentar positif" icon={MessageCircle} color="purple" />
            <MetricCard label="Trust Score" value={`${d.trustScore ?? 0}/100`} icon={Star} color="amber" />
            <MetricCard label="Content Pipeline" value={d.totalPipeline ?? 0} sub="Konten dalam produksi" icon={Zap} color="blue" />
            <MetricCard label="Founder Influence" value={`${d.founderInfluenceScore ?? 0}/100`} icon={Users} color="rose" />
            <MetricCard label="Konten Posted" value={pipeline.posted ?? 0} sub="Bulan ini" icon={BarChart3} color="green" />
            <MetricCard label="Brand Health" value={`${d.brandHealthScore ?? 0}/100`} icon={Heart} color="purple" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Project Branding Score</h2>
            <Link href="/branding/proyek"><span className="text-xs text-blue-600 hover:underline cursor-pointer">Lihat Detail →</span></Link>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Belum ada data project score. <Link href="/branding/proyek"><span className="text-blue-500 hover:underline cursor-pointer">Input data</span></Link></div>
          ) : (
            <div className="space-y-3">
              {projects.map((p: any) => (
                <div key={p.id} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border", projectStatusColor(p.totalScore ?? 0))}>
                  <span className="text-sm font-medium">{p.projectName}</span>
                  <span className="text-sm font-bold">{p.totalScore ?? 0}/100</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Content Pipeline</h2>
            <Link href="/branding/konten/produksi"><span className="text-xs text-blue-600 hover:underline cursor-pointer">Kanban Board →</span></Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PIPELINE_STAGES.filter(s => s !== "posted").map(stage => (
              <div key={stage} className={cn("flex-1 min-w-[80px] rounded-lg px-3 py-3 text-center", STAGE_COLORS[stage])}>
                <div className="text-2xl font-bold">{pipeline[stage] ?? 0}</div>
                <div className="text-xs mt-0.5 font-medium">{STAGE_LABELS[stage]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Posted Bulan Ini</span>
            <span className="text-sm font-bold text-emerald-600">{pipeline.posted ?? 0} / 30 konten</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Content Management", desc: "Kalender, produksi, tambah konten", path: "/branding/konten", color: "border-blue-200 hover:bg-blue-50" },
          { label: "Social Media Performance", desc: "KPI semua platform per bulan", path: "/branding/sosmed", color: "border-purple-200 hover:bg-purple-50" },
          { label: "Content Performance", desc: "Ranking konten, Top & Viral", path: "/branding/performa-konten", color: "border-emerald-200 hover:bg-emerald-50" },
          { label: "Personal Branding Founder", desc: "KPI & influence score Arya", path: "/branding/founder", color: "border-amber-200 hover:bg-amber-50" },
          { label: "Corporate Branding", desc: "Skor per brand Satara Group", path: "/branding/korporat", color: "border-rose-200 hover:bg-rose-50" },
          { label: "Public Relations", desc: "Kegiatan PR & media exposure", path: "/branding/pr", color: "border-indigo-200 hover:bg-indigo-50" },
        ].map(item => (
          <Link key={item.path} href={item.path}>
            <div className={cn("bg-white rounded-xl border-2 p-4 cursor-pointer transition", item.color)}>
              <div className="font-semibold text-slate-800 text-sm">{item.label}</div>
              <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
