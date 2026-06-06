import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Clock, CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  "MINAT", "PROSES_BERKAS", "BERKAS_LENGKAP", "SETOR_BANK", "OTS", "SP3K", "AKAD", "HT_CAIR"
];
const STATUS_LABELS: Record<string, string> = {
  MINAT: "Minat", PROSES_BERKAS: "Proses Berkas", BERKAS_LENGKAP: "Berkas Lengkap",
  SETOR_BANK: "Setor Bank", OTS: "OTS", REVISI: "Revisi", SP3K: "SP3K",
  AKAD: "Akad", HT_CAIR: "HT Cair", CASH: "Cash", DTBO: "DTBO",
  BATAL: "Batal", BELUM_LAKU: "Belum Laku", FOR_SALE: "For Sale",
};
const DOC_STATUS_LABELS: Record<string, string> = {
  belum_ada: "Belum Ada", ada: "Ada", disetor_bank: "Disetor Bank"
};
const DOC_CATEGORIES: Record<string, string> = {
  data_pribadi: "A. Data Pribadi", data_pekerjaan: "B. Data Pekerjaan",
  data_keuangan: "C. Data Keuangan", pendukung: "D. Dokumen Pendukung"
};

function fmtRp(n: number | null | undefined) {
  if (!n) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"info" | "dokumen" | "riwayat" | "catatan" | "komplain">("info");
  const qc = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["administrasi-customer", id],
    queryFn: () => fetch(`/api/administrasi/customers/${id}`).then(r => r.json()),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["customer-documents", id],
    queryFn: () => fetch(`/api/administrasi/customers/${id}/documents`).then(r => r.json()),
    enabled: tab === "dokumen",
  });

  const { data: history = [] } = useQuery({
    queryKey: ["customer-history", id],
    queryFn: () => fetch(`/api/administrasi/customers/${id}/history`).then(r => r.json()),
    enabled: tab === "riwayat",
  });

  const updateDoc = useMutation({
    mutationFn: ({ docId, status }: { docId: number; status: string }) =>
      fetch(`/api/administrasi/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-documents", id] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-8 text-center">Memuat...</div>;
  if (!customer || customer.error) return <div className="text-sm text-muted-foreground p-8 text-center">Customer tidak ditemukan.</div>;

  const currentStageIdx = PIPELINE_STAGES.indexOf(customer.pipelineStatus ?? "");
  const agingDays = customer.aging ?? 0;
  const agingCls = agingDays > 30 ? "text-red-600" : agingDays > 14 ? "text-amber-600" : "text-muted-foreground";

  const docsRequired = documents.filter((d: any) => d.isRequired);
  const docsHave = docsRequired.filter((d: any) => d.status !== "belum_ada");
  const docPct = docsRequired.length > 0 ? Math.round((docsHave.length / docsRequired.length) * 100) : 0;

  const docsByCategory = Object.groupBy ? Object.groupBy(documents, (d: any) => d.category) : documents.reduce((acc: any, d: any) => {
    (acc[d.category] = acc[d.category] || []).push(d); return acc;
  }, {});

  const TABS = [
    { key: "info", label: "Info" },
    { key: "dokumen", label: `Dokumen (${docPct}%)` },
    { key: "riwayat", label: "Riwayat Status" },
    { key: "catatan", label: "Catatan" },
    { key: "komplain", label: "Komplain" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/administrasi/customer">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Kembali
          </button>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{customer.nama}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              <span>Blok: <strong className="text-foreground">{customer.unitBlock ?? "-"}</strong></span>
              <span>Bank: <strong className="text-foreground">{customer.bank ?? "-"}</strong></span>
              <span>PIC: <strong className="text-foreground">{customer.picAdmin ?? "-"}</strong></span>
              {customer.phone && <span>HP: {customer.phone}</span>}
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-sm font-semibold", agingCls)}>
              {agingDays} hari di status ini
            </span>
            <div className="text-xs text-muted-foreground">{STATUS_LABELS[customer.pipelineStatus ?? ""] ?? customer.pipelineStatus}</div>
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="mt-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map((stage, i) => {
              const done = i < currentStageIdx;
              const active = i === currentStageIdx;
              const terminal = ["DTBO", "BATAL"].includes(customer.pipelineStatus ?? "");
              return (
                <div key={stage} className="flex items-center gap-1 shrink-0">
                  <div className={cn("flex flex-col items-center gap-0.5", active ? "opacity-100" : done ? "opacity-60" : "opacity-30")}>
                    {done ? <CheckCircle2 className="size-4 text-emerald-500" /> :
                      active ? <Clock className={cn("size-4", terminal ? "text-red-500" : "text-blue-500")} /> :
                        <Circle className="size-4 text-muted-foreground" />}
                    <span className="text-[9px] text-center w-12">{STATUS_LABELS[stage]}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && <div className={cn("h-px w-4 shrink-0", done ? "bg-emerald-300" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn("px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "info" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identitas</h3>
            {[
              ["Nama", customer.nama], ["NIK", customer.nik || "-"], ["Telepon", customer.phone || customer.kontak || "-"],
              ["Pekerjaan", customer.pekerjaan || "-"], ["Referensi", customer.referralSource || "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaksi</h3>
            {[
              ["Bank", customer.bank || "-"], ["Jenis", customer.paymentType || "KPR"],
              ["Harga Unit", fmtRp(customer.unitPrice)], ["Nilai DP", fmtRp(customer.dpAmount)],
              ["Nilai Akad KPR", fmtRp(customer.loanAmount)], ["Nilai HT", fmtRp(customer.htAmount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h3>
            {[
              ["Booking", fmtDate(customer.bookingDate)], ["Akad", fmtDate(customer.akadDate)],
              ["HT Cair", fmtDate(customer.htDate)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "dokumen" && (
        <div className="space-y-4">
          <div className="bg-muted/50 border rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium">Kelengkapan Dokumen: {docPct}%</div>
              <div className="h-2 bg-border rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${docPct}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{docsHave.length}/{docsRequired.length} wajib</span>
          </div>
          {Object.entries(DOC_CATEGORIES).map(([catKey, catLabel]) => {
            const catDocs = (docsByCategory[catKey] ?? []) as any[];
            if (catDocs.length === 0) return null;
            return (
              <div key={catKey} className="bg-card border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b bg-muted/30">
                  <span className="text-xs font-semibold">{catLabel}</span>
                </div>
                {catDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {doc.status === "belum_ada" ? <XCircle className="size-4 text-muted-foreground/50" /> :
                        doc.status === "disetor_bank" ? <CheckCircle2 className="size-4 text-emerald-500" /> :
                          <CheckCircle2 className="size-4 text-blue-500" />}
                      <span className="text-sm">{doc.documentName}</span>
                      {doc.isRequired && <span className="text-[10px] text-red-500">*</span>}
                    </div>
                    <select
                      value={doc.status}
                      onChange={e => updateDoc.mutate({ docId: doc.id, status: e.target.value })}
                      className="text-xs border rounded-md px-2 py-0.5 bg-background focus:outline-none"
                    >
                      <option value="belum_ada">Belum Ada</option>
                      <option value="ada">Ada</option>
                      <option value="disetor_bank">Disetor Bank</option>
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "riwayat" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada riwayat status.</div>
          ) : (
            <div className="divide-y">
              {history.map((h: any) => (
                <div key={h.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="size-2 rounded-full bg-foreground mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → ` : ""}{STATUS_LABELS[h.toStatus] ?? h.toStatus}
                    </div>
                    {h.notes && <div className="text-xs text-muted-foreground mt-0.5">{h.notes}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {h.changedBy && `oleh ${h.changedBy} · `}
                      {new Date(h.changedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "catatan" && (
        <div className="space-y-4">
          {[
            { label: "Masalah / Catatan", value: customer.catatan },
            { label: "Alternatif Solusi", value: customer.alternativeSolution },
            { label: "Tindak Lanjut", value: customer.followUp },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border rounded-xl p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
              <p className="text-sm">{value || <span className="text-muted-foreground italic">Belum ada catatan.</span>}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "komplain" && (
        <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
          Lihat semua komplain di{" "}
          <Link href="/administrasi/komplain"><span className="text-blue-600 underline cursor-pointer">halaman Komplain</span></Link>
        </div>
      )}
    </div>
  );
}
