import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, Users, Eye, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram","Facebook","TikTok","YouTube","Twitter/X"];

const CURRENT_MONTH = new Date().toISOString().slice(0,7);

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
  return String(n);
}

export default function BrandingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bulan: CURRENT_MONTH, platform: "Instagram",
    followers: "", targetFollowers: "", reach: "", targetReach: "",
    impresi: "", engagement: "", targetEngagement: "", postCount: "",
  });

  const { data: kpis = [], isLoading } = useQuery<any[]>({
    queryKey: ["branding-kpi"],
    queryFn: () => fetch("/api/marketing/branding-kpi").then(r => r.json()),
  });

  const mut = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, isNaN(Number(v)) || v === "" ? v : Number(v)]));
      const r = await fetch("/api/marketing/branding-kpi", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Gagal menyimpan");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branding-kpi"] }); toast({ title: "KPI Branding disimpan" }); setShowForm(false); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const latestByPlatform = PLATFORMS.map(p => {
    const rows = (kpis as any[]).filter(k => k.platform === p).sort((a:any,b:any) => b.bulan.localeCompare(a.bulan));
    return rows[0] ? { platform: p, ...rows[0] } : { platform: p, followers:0, reach:0, engagement:0, brandingScore:0 };
  }).filter(r => r.followers > 0 || r.brandingScore > 0);

  const avgScore = latestByPlatform.length > 0
    ? Math.round(latestByPlatform.reduce((s,r) => s + (r.brandingScore ?? 0), 0) / latestByPlatform.length)
    : 0;

  const trendData = [...new Set((kpis as any[]).map(k => k.bulan))].sort().slice(-6).map(bulan => {
    const row: any = { bulan };
    PLATFORMS.forEach(p => {
      const r = (kpis as any[]).find(k => k.bulan === bulan && k.platform === p);
      if (r) row[p] = r.brandingScore ?? 0;
    });
    return row;
  });

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Branding & Konten</h1>
          <p className="text-xs text-muted-foreground">KPI media sosial dan branding score per platform</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3.5 mr-1" />{showForm ? "Tutup" : "Input KPI"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Input KPI Bulanan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bulan</Label>
                <Input type="month" className="h-8 text-xs" value={form.bulan} onChange={e => set("bulan", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Platform</Label>
                <Select value={form.platform} onValueChange={v => set("platform", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {[
                { k:"followers", label:"Followers", tk:"targetFollowers", tlabel:"Target Followers" },
                { k:"reach", label:"Reach", tk:"targetReach", tlabel:"Target Reach" },
                { k:"engagement", label:"Engagement (interaksi)", tk:"targetEngagement", tlabel:"Target Engagement" },
              ].map(({ k, label, tk, tlabel }) => (
                <>
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" className="h-8 text-xs" value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder="0" />
                  </div>
                  <div key={tk} className="space-y-1">
                    <Label className="text-xs">{tlabel}</Label>
                    <Input type="number" className="h-8 text-xs" value={(form as any)[tk]} onChange={e => set(tk, e.target.value)} placeholder="0" />
                  </div>
                </>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Impresi</Label>
                <Input type="number" className="h-8 text-xs" value={form.impresi} onChange={e => set("impresi", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jumlah Post</Label>
                <Input type="number" className="h-8 text-xs" value={form.postCount} onChange={e => set("postCount", e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
              <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
                {mut.isPending ? "Menyimpan..." : "Simpan KPI"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Branding Score Rata-rata", value: `${avgScore}`, icon: TrendingUp, note: avgScore >= 80 ? "Sangat Baik" : avgScore >= 60 ? "Baik" : "Perlu Ditingkatkan" },
          { label: "Total Followers", value: fmtNum(latestByPlatform.reduce((s,r) => s+(r.followers??0),0)), icon: Users, note: `${latestByPlatform.length} platform aktif` },
          { label: "Total Engagement", value: fmtNum(latestByPlatform.reduce((s,r) => s+(r.engagement??0),0)), icon: Heart, note: "bulan ini" },
        ].map(({ label, value, icon: Icon, note }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-semibold">{value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {latestByPlatform.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Performa per Platform (Terkini)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {["Platform","Followers","Reach","Engagement","Eng. Rate","Posts","Branding Score"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestByPlatform.map(r => {
                    const engRate = r.impresi > 0 ? ((r.engagement / r.impresi) * 100).toFixed(1) : "0";
                    const score = r.brandingScore ?? 0;
                    return (
                      <tr key={r.platform} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{r.platform}</td>
                        <td className="px-3 py-2">{fmtNum(r.followers ?? 0)}</td>
                        <td className="px-3 py-2">{fmtNum(r.reach ?? 0)}</td>
                        <td className="px-3 py-2">{fmtNum(r.engagement ?? 0)}</td>
                        <td className="px-3 py-2">{engRate}%</td>
                        <td className="px-3 py-2">{r.postCount ?? 0}</td>
                        <td className="px-3 py-2">
                          <span className={cn("font-semibold", scoreColor(score))}>{score}</span>
                          <div className="mt-1 h-1.5 bg-muted rounded-full w-16">
                            <div className={cn("h-full rounded-full", score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${score}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Tren Branding Score (6 Bulan)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {PLATFORMS.filter(p => trendData.some(d => d[p])).map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} strokeWidth={1.5} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="py-8 text-center text-muted-foreground text-sm">Memuat data branding...</div>}
      {!isLoading && kpis.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Belum ada data KPI branding. Klik "Input KPI" untuk mulai.
        </div>
      )}
    </div>
  );
}
