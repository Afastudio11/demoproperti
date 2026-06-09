import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Clock, Sparkles, Loader2, FileText } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const FILE_TYPES = [
  { key: "cashflow", label: "Cashflow", desc: "Laporan arus kas masuk dan keluar" },
  { key: "general_ledger", label: "General Ledger", desc: "Buku besar / jurnal transaksi" },
  { key: "hutang", label: "Hutang", desc: "Daftar hutang beserta jatuh tempo" },
  { key: "piutang", label: "Piutang", desc: "Daftar piutang beserta jatuh tempo" },
  { key: "bank", label: "Rekening Koran / Bank", desc: "Mutasi rekening bank" },
  { key: "rab", label: "RAB Proyek", desc: "Rencana Anggaran Biaya per proyek" },
];

function fmtDate(s: string) {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type Step = "select" | "preview" | "processing" | "done" | "error";

export default function UploadCenter() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState("cashflow");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [resultMsg, setResultMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: uploads = [] } = useQuery({
    queryKey: ["finance-uploads"],
    queryFn: () => fetch("/api/finance/uploads").then(r => r.json()),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rawRows.length < 2) {
          setErrorMsg("File kosong atau tidak memiliki baris data.");
          return;
        }
        const hdrs = (rawRows[0] as any[]).map(v => String(v ?? "").trim()).filter(Boolean);
        setHeaders(hdrs);
        const dataRows = rawRows.slice(1).filter(row =>
          (row as any[]).some(cell => cell !== null && cell !== undefined && cell !== "")
        ).map((row: any[]) => {
          const obj: any = {};
          hdrs.forEach((h, i) => { obj[h] = row[i] ?? ""; });
          return obj;
        });
        setAllRows(dataRows);
        setPreview(dataRows.slice(0, 5));
        setStep("preview");
      } catch {
        setErrorMsg("Gagal membaca file. Pastikan format .xlsx atau .xls.");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function confirmImport() {
    setStep("processing");
    setProcessingMsg(`AI sedang membaca dan memetakan ${allRows.length} baris data...`);

    try {
      const res = await fetch("/api/finance/uploads/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: selected,
          fileName,
          headers,
          rows: allRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import gagal");
      const label = FILE_TYPES.find(f => f.key === selected)?.label ?? selected;
      setResultMsg(`${data.inserted} baris data ${label} berhasil diimport oleh AI.`);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["finance-uploads"] });
      qc.invalidateQueries({ queryKey: ["finance-hutang"] });
      qc.invalidateQueries({ queryKey: ["finance-piutang"] });
      qc.invalidateQueries({ queryKey: ["finance-cashflow"] });
      qc.invalidateQueries({ queryKey: ["finance-rab"] });
    } catch (err: any) {
      setErrorMsg(err.message ?? "Terjadi kesalahan saat import");
      setStep("error");
    }
  }

  function reset() {
    setStep("select");
    setFileName("");
    setPreview(null);
    setAllRows([]);
    setHeaders([]);
    setErrorMsg("");
    setResultMsg("");
    if (inputRef.current) inputRef.current.value = "";
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
        <p className="text-sm text-muted-foreground mt-0.5">AI membaca dokumen Excel format apapun dan memetakan data secara otomatis</p>
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
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Upload File Baru — Dibaca oleh AI</h2>
        </div>

        {step === "done" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="size-4 shrink-0" />
              <span>{resultMsg}</span>
            </div>
            <button onClick={reset}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              <Upload className="size-3.5" />
              Upload File Lain
            </button>
          </div>
        ) : step === "processing" ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <div className="text-center">
              <p className="text-sm font-medium">{processingMsg}</p>
              <p className="text-xs text-muted-foreground mt-1">AI memetakan kolom ke skema database secara otomatis</p>
            </div>
          </div>
        ) : step === "error" ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-red-600 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={reset}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Pilih jenis */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">1. Pilih Jenis Data</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILE_TYPES.map(ft => (
                  <button key={ft.key} onClick={() => { setSelected(ft.key); reset(); }}
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
                  <div className="text-xs text-muted-foreground mt-1">Format: .xlsx, .xls — kolom bebas, AI akan memetakan otomatis</div>
                  {fileName && <div className="text-xs text-emerald-600 mt-2 font-medium flex items-center justify-center gap-1"><FileText className="size-3" />{fileName}</div>}
                </label>
              </div>
              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
                  <AlertCircle className="size-3" />{errorMsg}
                </div>
              )}
            </div>

            {/* Step 3: Preview */}
            {step === "preview" && preview && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground font-medium">3. Preview Data (5 baris pertama dari {allRows.length} total)</label>
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                    <Sparkles className="size-3" />
                    AI akan memetakan semua {allRows.length} baris
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {headers.map(h => <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[150px] truncate">{String(row[h] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <Sparkles className="size-3.5 shrink-0 mt-0.5" />
                    <span>AI akan membaca nama kolom di file kamu dan memetakannya ke database secara otomatis, tanpa perlu format khusus.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={confirmImport}
                    className="flex items-center gap-2 bg-foreground text-background text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
                    <Sparkles className="size-3.5" />
                    Proses dengan AI
                  </button>
                  <button onClick={reset}
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
                {["Jenis File","Nama File","Tanggal","Baris","Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Belum ada riwayat upload</td></tr>
              ) : uploads.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs font-medium">{FILE_TYPES.find(f => f.key === u.fileType)?.label ?? u.fileType}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{u.fileName}</td>
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
