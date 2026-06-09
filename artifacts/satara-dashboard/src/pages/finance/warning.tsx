import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle, Plus, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LEVEL_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  kritis: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-300 dark:border-red-700", label: "Kritis" },
  warning: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-300 dark:border-amber-700", label: "Warning" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-300 dark:border-blue-700", label: "Info" },
};

const EMPTY_FORM = { alertType: "hutang_jatuh_tempo", level: "warning", message: "", amount: "", relatedModule: "hutang" };

export default function EarlyWarningSystem() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [actionNotes, setActionNotes] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["finance-warning"],
    queryFn: () => fetch("/api/finance/warning").then(r => r.json()),
    refetchInterval: 30000,
  });

  const alerts: any[] = data?.alerts ?? [];
  const unread = data?.unread ?? 0;

  const markRead = useMutation({
    mutationFn: ({ id, actionNotes }: any) =>
      fetch(`/api/finance/warning/${id}/read`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionNotes }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-warning"] }),
  });

  const addAlert = useMutation({
    mutationFn: (body: any) => fetch("/api/finance/warning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-warning"] }); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const unreadAlerts = alerts.filter(a => !a.isRead);
  const readAlerts = alerts.filter(a => a.isRead);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Early Warning System
            {unread > 0 && <span className="ml-2 text-sm font-medium text-red-500 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded-full">{unread} aktif</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Notifikasi otomatis kondisi keuangan yang memerlukan perhatian segera</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
          <Plus className="size-3.5" />
          Tambah Alert
        </button>
      </div>

      {/* Threshold info */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Kondisi yang Dipantau</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { cond: "Hutang jatuh tempo <30 hari", level: "warning" },
            { cond: "Realisasi melebihi RAB >5%", level: "warning" },
            { cond: "Forecast cashflow negatif", level: "kritis" },
            { cond: "HT turun >30% vs rata-rata", level: "warning" },
            { cond: "Piutang macet bertambah", level: "warning" },
            { cond: "Saldo kas <Rp 200 Jt", level: "kritis" },
            { cond: "Outstanding KPP >80% plafon", level: "warning" },
            { cond: "Selisih rekening koran", level: "kritis" },
          ].map(item => {
            const cfg = LEVEL_CONFIG[item.level];
            return (
              <div key={item.cond} className={cn("rounded-lg border p-2.5 text-xs", cfg.bg, cfg.border)}>
                <span className={cn("font-semibold text-[10px] uppercase block mb-1", cfg.color)}>{cfg.label}</span>
                {item.cond}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active alerts */}
      {unreadAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Alert Aktif ({unreadAlerts.length})</h2>
          {unreadAlerts.map((a: any) => {
            const cfg = LEVEL_CONFIG[a.level] ?? LEVEL_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={cn("rounded-xl border p-4", cfg.bg, cfg.border)}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("size-4 shrink-0 mt-0.5", cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-semibold uppercase", cfg.color)}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">{a.relatedModule}</span>
                    </div>
                    <p className="text-sm font-medium">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString("id-ID")}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <input placeholder="Catatan tindak lanjut..." value={actionNotes[a.id] ?? ""} onChange={e => setActionNotes(p => ({ ...p, [a.id]: e.target.value }))}
                        className="flex-1 text-xs border rounded px-2 py-1 bg-background/70" />
                      <button onClick={() => markRead.mutate({ id: a.id, actionNotes: actionNotes[a.id] })}
                        className="text-xs px-2.5 py-1 rounded border hover:bg-white/50 transition-colors whitespace-nowrap">
                        Tandai Dibaca
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unreadAlerts.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <CheckCircle className="size-8 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium">Tidak ada alert aktif</p>
          <p className="text-xs text-muted-foreground mt-1">Semua kondisi keuangan dalam batas normal</p>
        </div>
      )}

      {/* History */}
      {readAlerts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b"><h2 className="text-sm font-semibold text-muted-foreground">Riwayat Alert Sudah Dibaca ({readAlerts.length})</h2></div>
          <div className="divide-y">
            {readAlerts.slice(0, 20).map((a: any) => {
              const cfg = LEVEL_CONFIG[a.level] ?? LEVEL_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3 opacity-60">
                  <Icon className={cn("size-3.5 shrink-0 mt-0.5", cfg.color)} />
                  <div>
                    <p className="text-sm">{a.message}</p>
                    {a.actionNotes && <p className="text-xs text-muted-foreground mt-0.5">Catatan: {a.actionNotes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl border bg-background w-full max-w-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold">Tambah Alert Manual</h2>
            <div><label className="text-xs text-muted-foreground">Level</label>
              <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
                <option value="kritis">Kritis</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Pesan Alert</label>
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background resize-none" />
            </div>
            <div><label className="text-xs text-muted-foreground">Nilai Terkait (Rp)</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background" />
            </div>
            <div><label className="text-xs text-muted-foreground">Modul Terkait</label>
              <select value={form.relatedModule} onChange={e => setForm(p => ({ ...p, relatedModule: e.target.value }))} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
                {["cashflow","kpp","hutang","piutang","rab","accounting","audit"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => addAlert.mutate(form)} disabled={addAlert.isPending} className="flex-1 bg-foreground text-background text-sm py-2 rounded-md hover:opacity-90 disabled:opacity-50">Simpan</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border text-sm py-2 rounded-md hover:bg-muted">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
