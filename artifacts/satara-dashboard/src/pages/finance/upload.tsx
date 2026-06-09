import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Clock, Sparkles, Loader2, FileText, Table, FileType } from "lucide-react";
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

// Forward-fill blank cells (handle Excel merged cells)
function forwardFill(rows: any[][], headers: string[]): Record<string, any>[] {
  const last: Record<number, any> = {};
  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const val = row[i];
      const isBlank = val === null || val === undefined || String(val).trim() === "";
      if (!isBlank) {
        last[i] = val;
        obj[h] = val;
      } else {
        // Only forward-fill first few columns (likely merged project/group headers)
        obj[h] = i < 4 ? (last[i] ?? "") : "";
      }
    });
    return obj;
  });
}

// Convert Excel serial date number to ISO string
function excelDateToISO(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "number" && v > 40000 && v < 60000) {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const cleaned = v.trim();
    // Try DD/MM/YYYY
    const m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

// Sanitize a cell value: convert Date objects, clean numbers
function sanitizeCell(v: any): any {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "number") return v;
  if (typeof v === "string") return v.trim();
  return v ?? "";
}

type ParsedSheet = { name: string; headers: string[]; rows: Record<string, any>[] };
type Step = "select" | "preview" | "processing" | "done" | "error";
type FileKind = "excel" | "pdf" | null;

export default function UploadCenter() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState("cashflow");
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<FileKind>(null);
  const [pdfInfo, setPdfInfo] = useState<{ pages: number } | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [resultMsg, setResultMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);
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

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

    if (isPdf) {
      setFileKind("pdf");
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const arrayBuffer = ev.target?.result as ArrayBuffer;
          // Convert to base64
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          setPdfBase64(b64);
          // Estimate pages by counting %PDF page markers (rough estimate)
          const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          const pageCount = (text.match(/\/Page\b/g) || []).length;
          setPdfInfo({ pages: Math.max(1, Math.floor(pageCount / 2)) });
          setStep("preview");
        } catch {
          setErrorMsg("Gagal membaca file PDF.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileKind("excel");
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, {
            type: "binary",
            cellDates: true,      // Parse dates as Date objects
            cellNF: false,        // Don't keep number format
            cellText: false,      // Don't keep formatted text
          });
          const parsed: ParsedSheet[] = [];

          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];

            // Get all rows including formula results
            const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              defval: "",
              raw: false,      // Use formatted values for dates/numbers
            });

            // Also get raw values to compare dates
            const rawRowsRaw: any[][] = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              defval: "",
              raw: true,       // Raw values (numbers for dates)
            });

            if (rawRows.length < 2) continue;

            // Find header row: first row with >= 2 non-empty cells
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(6, rawRows.length); i++) {
              const nonEmpty = (rawRows[i] as any[]).filter(c =>
                c !== null && c !== undefined && String(c).trim() !== ""
              ).length;
              if (nonEmpty >= 2) { headerRowIdx = i; break; }
            }

            const headers = (rawRows[headerRowIdx] as any[])
              .map(v => String(v ?? "").trim())
              .filter(h => h !== "");

            const dataRawRows = rawRowsRaw.slice(headerRowIdx + 1).filter(row =>
              (row as any[]).some(cell =>
                cell !== null && cell !== undefined && String(cell).trim() !== ""
              )
            );

            const dataFormattedRows = rawRows.slice(headerRowIdx + 1).filter(row =>
              (row as any[]).some(cell =>
                cell !== null && cell !== undefined && String(cell).trim() !== ""
              )
            );

            // Forward-fill merged cells, sanitize values
            const dataRows = forwardFill(dataRawRows, headers).map((row, rowIdx) => {
              const formatted = dataFormattedRows[rowIdx] ?? [];
              const result: Record<string, any> = {};
              headers.forEach((h, i) => {
                const rawVal = row[h];
                const fmtVal = formatted[i];
                // Prefer formatted for dates, raw for numbers
                if (rawVal instanceof Date) {
                  result[h] = rawVal.toISOString().split("T")[0];
                } else if (typeof rawVal === "number" && rawVal > 40000 && rawVal < 60000 &&
                  typeof fmtVal === "string" && fmtVal.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
                  result[h] = excelDateToISO(fmtVal) ?? rawVal;
                } else {
                  result[h] = sanitizeCell(rawVal);
                }
              });
              return result;
            });

            if (dataRows.length > 0) {
              parsed.push({ name: sheetName, headers, rows: dataRows });
            }
          }

          if (parsed.length === 0) {
            setErrorMsg("File tidak memiliki data yang bisa dibaca.");
            return;
          }
          setSheets(parsed);
          setActiveSheet(0);
          setStep("preview");
        } catch (err) {
          console.error(err);
          setErrorMsg("Gagal membaca file Excel. Pastikan format .xlsx atau .xls.");
        }
      };
      reader.readAsBinaryString(file);
    }
  }

  async function confirmImport() {
    if (fileKind === "pdf") {
      const estPages = pdfInfo?.pages ?? 1;
      setStep("processing");
      setProcessingMsg(`AI membaca teks dari ${estPages} halaman PDF dan mengekstrak data...`);
      try {
        const res = await fetch("/api/finance/uploads/pdf-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: selected, fileName, pdfBase64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Import PDF gagal");
        const label = FILE_TYPES.find(f => f.key === selected)?.label ?? selected;
        setResultMsg(`${data.inserted} entri data ${label} berhasil diimport dari PDF (${data.pages} halaman).`);
        setStep("done");
        invalidateAll();
      } catch (err: any) {
        setErrorMsg(err.message ?? "Terjadi kesalahan saat import PDF");
        setStep("error");
      }
    } else {
      const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);
      setStep("processing");
      setProcessingMsg(`AI mendeteksi kolom, lalu memproses ${totalRows.toLocaleString("id-ID")} baris dari ${sheets.length} sheet...`);
      try {
        const res = await fetch("/api/finance/uploads/ai-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: selected, fileName, sheets }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Import gagal");
        const label = FILE_TYPES.find(f => f.key === selected)?.label ?? selected;
        setResultMsg(`${data.inserted} baris data ${label} berhasil diimport dari ${sheets.length} sheet.`);
        setStep("done");
        invalidateAll();
      } catch (err: any) {
        setErrorMsg(err.message ?? "Terjadi kesalahan saat import");
        setStep("error");
      }
    }
  }

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["finance-uploads"] });
    qc.invalidateQueries({ queryKey: ["finance-hutang"] });
    qc.invalidateQueries({ queryKey: ["finance-piutang"] });
    qc.invalidateQueries({ queryKey: ["finance-cashflow"] });
    qc.invalidateQueries({ queryKey: ["finance-rab"] });
  }

  function reset() {
    setStep("select");
    setFileName("");
    setSheets([]);
    setFileKind(null);
    setPdfBase64(null);
    setPdfInfo(null);
    setErrorMsg("");
    setResultMsg("");
    setActiveSheet(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  const lastByType: Record<string, any> = {};
  for (const u of uploads) {
    if (!lastByType[u.fileType] || new Date(u.uploadedAt) > new Date(lastByType[u.fileType].uploadedAt)) {
      lastByType[u.fileType] = u;
    }
  }

  const curSheet = sheets[activeSheet];
  const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Upload Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI membaca Excel (semua sheet) dan PDF — format kolom bebas, data masuk semua</p>
      </div>

      {/* Status grid */}
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
                {last ? `Terakhir: ${fmtDate(last.uploadedAt)} · ${(last.rowCount ?? 0).toLocaleString("id-ID")} baris` : "Belum pernah diupload"}
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
          <h2 className="text-sm font-semibold">Upload File Baru</h2>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Excel</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">PDF</span>
          </div>
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
              <p className="text-xs text-muted-foreground mt-1">
                {fileKind === "pdf"
                  ? "AI mengekstrak tabel dan angka dari teks PDF"
                  : "AI mendeteksi kolom, lalu memetakan data ke database"}
              </p>
            </div>
          </div>

        ) : step === "error" ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-red-600 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={reset} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              Coba Lagi
            </button>
          </div>

        ) : (
          <div className="space-y-4">
            {/* Step 1: Jenis data */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">1. Pilih Jenis Data</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILE_TYPES.map(ft => (
                  <button key={ft.key}
                    onClick={() => { setSelected(ft.key); if (step === "preview") reset(); }}
                    className={cn("rounded-lg border p-3 text-left transition-colors",
                      selected === ft.key ? "border-foreground bg-foreground/5" : "hover:bg-muted/50")}>
                    <div className="text-xs font-medium">{ft.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{ft.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Upload file */}
            {step === "select" && (
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-2 block">2. Upload File</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-foreground/30 transition-colors">
                  <input ref={inputRef} type="file" accept=".xlsx,.xls,.pdf"
                    onChange={handleFile} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm font-medium">Klik untuk pilih file</div>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileText className="size-3" /> Excel (.xlsx, .xls) — semua sheet dibaca
                      </span>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileType className="size-3" /> PDF — AI baca teks
                      </span>
                    </div>
                  </label>
                </div>
                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
                    <AlertCircle className="size-3" />{errorMsg}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preview */}
            {step === "preview" && (
              <div className="space-y-3">
                {/* File info bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {fileKind === "pdf"
                      ? <FileType className="size-4 text-blue-500" />
                      : <FileText className="size-4 text-emerald-500" />}
                    <span className="font-medium">{fileName}</span>
                    <span className="text-muted-foreground text-xs">
                      {fileKind === "pdf"
                        ? `— PDF, estimasi ${pdfInfo?.pages ?? "?"} halaman`
                        : `— ${sheets.length} sheet, ${totalRows.toLocaleString("id-ID")} baris total`}
                    </span>
                  </div>
                  <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Ganti File</button>
                </div>

                {/* PDF preview */}
                {fileKind === "pdf" && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <FileType className="size-4 text-blue-500" />
                      File PDF terdeteksi
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI akan mengekstrak teks dari seluruh halaman PDF, lalu mengidentifikasi dan memetakan
                      semua data keuangan ke database secara otomatis.
                    </p>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Catatan: PDF yang berupa scan/foto tidak bisa dibaca secara otomatis — hanya PDF teks.
                    </div>
                  </div>
                )}

                {/* Excel sheet tabs + preview */}
                {fileKind === "excel" && sheets.length > 0 && (
                  <>
                    {sheets.length > 1 && (
                      <div className="flex gap-1 flex-wrap">
                        {sheets.map((sh, i) => (
                          <button key={sh.name} onClick={() => setActiveSheet(i)}
                            className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                              activeSheet === i ? "bg-foreground text-background" : "hover:bg-muted")}>
                            <Table className="size-3" />
                            {sh.name}
                            <span className="opacity-60">({sh.rows.length.toLocaleString("id-ID")})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {curSheet && (
                      <>
                        <div className="text-xs text-muted-foreground font-medium">
                          Preview sheet "{curSheet.name}" — 5 baris pertama dari {curSheet.rows.length.toLocaleString("id-ID")}
                        </div>
                        <div className="overflow-x-auto rounded-lg border max-h-52">
                          <table className="text-xs w-full">
                            <thead className="sticky top-0">
                              <tr className="border-b bg-muted/80">
                                {curSheet.headers.map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {curSheet.rows.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  {curSheet.headers.map(h => (
                                    <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[160px] truncate">
                                      {String(row[h] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* AI info banner */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <Sparkles className="size-3.5 shrink-0 mt-0.5" />
                    {fileKind === "pdf" ? (
                      <span>AI akan membaca teks PDF, mengenali tabel & angka, lalu menyimpan data ke database. Format dokumen apapun didukung.</span>
                    ) : (
                      <span>
                        AI mendeteksi nama kolom dari setiap sheet dan memetakannya ke database.
                        Sel kosong karena merge cells sudah diisi otomatis.
                        <strong> {totalRows.toLocaleString("id-ID")} baris</strong> dari <strong>{sheets.length} sheet</strong> akan diproses.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={confirmImport}
                    className="flex items-center gap-2 bg-foreground text-background text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
                    <Sparkles className="size-3.5" />
                    {fileKind === "pdf"
                      ? "Proses PDF dengan AI"
                      : `Proses ${totalRows.toLocaleString("id-ID")} Baris dengan AI`}
                  </button>
                  <button onClick={reset} className="text-sm px-4 py-2 rounded-md border hover:bg-muted transition-colors">
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
                {["Jenis File", "Nama File", "Tanggal", "Baris", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Belum ada riwayat upload</td></tr>
              ) : uploads.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      {u.fileName?.toLowerCase().endsWith(".pdf")
                        ? <FileType className="size-3 text-blue-500" />
                        : <FileText className="size-3 text-emerald-500" />}
                      {FILE_TYPES.find(f => f.key === u.fileType)?.label ?? u.fileType}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{u.fileName}</td>
                  <td className="px-4 py-2.5 text-xs">{fmtDate(u.uploadedAt)}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">{(u.rowCount ?? 0).toLocaleString("id-ID")}</td>
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
