import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Clock, FileText, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const FILE_TYPES = [
  { key: "cashflow", label: "Cashflow", desc: "Laporan arus kas masuk dan keluar", accept: ".xlsx,.xls" },
  { key: "general_ledger", label: "General Ledger", desc: "Buku besar / jurnal transaksi", accept: ".xlsx,.xls" },
  { key: "hutang", label: "Hutang", desc: "Daftar hutang beserta jatuh tempo", accept: ".xlsx,.xls" },
  { key: "piutang", label: "Piutang", desc: "Daftar piutang beserta jatuh tempo", accept: ".xlsx,.xls" },
  { key: "bank", label: "Rekening Koran / Bank", desc: "Mutasi rekening bank", accept: ".xlsx,.xls" },
  { key: "rab", label: "RAB Proyek", desc: "Rencana Anggaran Biaya per proyek", accept: ".xlsx,.xls" },
];

function fmtDate(s: string) {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function UploadCenter() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState("cashflow");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"select" | "preview" | "done">("select");
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: uploads = [] } = useQuery({
    queryKey: ["finance-uploads"],
    queryFn: () => fetch("/api/finance/uploads").then(r => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/finance/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-uploads"] }); },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length === 0) return;
      const hdrs = (rows[0] as any[]).map(String);
      setHeaders(hdrs);
      const dataRows = rows.slice(1, 11).map((row: any[]) => {
        const obj: any = {};
        hdrs.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      });
      setPreview(dataRows);
      setStep("preview");
    };
    reader.readAsBinaryString(file);
  }

  async function confirmImport() {
    const now = new Date();
    const res = await uploadMutation.mutateAsync({
      fileType: selected,
      fileName,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      rowCount: preview?.length ?? 0,
      status: "berhasil",
    });
    setMsg(`Berhasil: ${preview?.length ?? 0} baris data ${FILE_TYPES.find(f => f.key === selected)?.label} berhasil diimport.`);
    setStep("done");
    setPreview(null);
  }

  const lastByType: Record<string, any> = {};
  for (const u of uploads) {
    if (!lastByType[u.fileType] || new Date(u.uploadedAt) > new Date(lastByType[u.fileType].uploadedAt)) {
      lastByType[u.fileType] = u;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Upload Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pusat upload semua file Excel sebagai sumber data SFAIS</p>
      </div>

      {/* Status per jenis data */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FILE_TYPES.map(ft => {
          const last = lastByType[ft.key];
          return (
            <div key={ft.key} className="rounded-xl border bg-card p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                {last ? <CheckCircle className="size-3.5 text-emerald-500" /> : <Clock className="size-3.5 text-muted-foreground" />}
                <span className="text-sm font-medium">{ft.label}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {last ? `Terakhir: ${fmtDate(last.uploadedAt)} · ${last.rowCount} baris` : "Belum pernah diupload"}
              </div>
              {!last && <div className="mt-1.5 text-[10px] text-amber-500 font-medium">Belum ada data</div>}
            </div>
          );
        })}
      </div>

      {/* Upload form */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Upload File Baru</h2>

        {step === "done" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="size-4" />
              <span>{msg}</span>
            </div>
            <button onClick={() => { setStep("select"); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              <Upload className="size-3.5" />
              Upload File Lain
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Pilih jenis */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">1. Pilih Jenis File</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILE_TYPES.map(ft => (
                  <button key={ft.key} onClick={() => setSelected(ft.key)}
                    className={cn("rounded-lg border p-3 text-left transition-colors",
                      selected === ft.key ? "border-foreground bg-foreground/5" : "hover:bg-muted/50")}>
                    <div className="text-xs font-medium">{ft.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{ft.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Upload file */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">2. Upload File Excel</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-foreground/30 transition-colors">
                <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-sm font-medium">Klik untuk pilih file</div>
                  <div className="text-xs text-muted-foreground mt-1">Format: .xlsx, .xls</div>
                  {fileName && <div className="text-xs text-emerald-600 mt-2 font-medium">{fileName}</div>}
                </label>
              </div>
            </div>

            {/* Step 3: Preview */}
            {step === "preview" && preview && (
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-2 block">3. Preview Data (10 baris pertama)</label>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {headers.map(h => <td key={h} className="px-3 py-2">{String(row[h] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={confirmImport} disabled={uploadMutation.isPending}
                    className="flex items-center gap-2 bg-foreground text-background text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                    <CheckCircle className="size-3.5" />
                    {uploadMutation.isPending ? "Mengimport..." : "Konfirmasi Import"}
                  </button>
                  <button onClick={() => { setStep("select"); setPreview(null); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }}
                    className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Riwayat upload */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Riwayat Upload</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Jenis File</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nama File</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Baris</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Belum ada riwayat upload</td></tr>
              ) : uploads.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs font-medium">{FILE_TYPES.find(f => f.key === u.fileType)?.label ?? u.fileType}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.fileName}</td>
                  <td className="px-4 py-2.5 text-xs">{fmtDate(u.uploadedAt)}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">{u.rowCount ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      u.status === "berhasil" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
