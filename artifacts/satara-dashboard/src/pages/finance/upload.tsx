import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileText, FileType,
  Plus, Trash2, ChevronLeft, PlusSquare, Check, X as XIcon, HelpCircle,
} from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ─── Field schema per data type ─────────────────────────────────────────────
type FieldDef = { key: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[]; ac?: boolean; w?: number; };

const TYPE_FIELDS: Record<string, FieldDef[]> = {
  hutang: [
    { key: "projectName", label: "Proyek", type: "text", ac: true, w: 140 },
    { key: "stageInfo", label: "Tahap", type: "text", ac: true, w: 110 },
    { key: "creditorName", label: "Kreditur / Pemilik", type: "text", ac: true, w: 170 },
    { key: "totalAmount", label: "Nilai Awal (Rp)", type: "number", w: 140 },
    { key: "paidAmount", label: "Terbayar (Rp)", type: "number", w: 130 },
    { key: "notes", label: "Keterangan", type: "text", w: 160 },
  ],
  piutang: [
    { key: "debtorName", label: "Nama Debitur", type: "text", ac: true, w: 170 },
    { key: "category", label: "Kategori", type: "select", options: ["customer", "internal", "vendor"], w: 110 },
    { key: "totalAmount", label: "Jumlah (Rp)", type: "number", w: 140 },
    { key: "dueDate", label: "Jatuh Tempo", type: "date", w: 130 },
    { key: "notes", label: "Keterangan", type: "text", w: 160 },
  ],
  cashflow: [
    { key: "transactionDate", label: "Tanggal", type: "date", w: 120 },
    { key: "type", label: "Tipe", type: "select", options: ["cash_in", "cash_out"], w: 100 },
    { key: "category", label: "Kategori", type: "text", ac: true, w: 130 },
    { key: "projectName", label: "Proyek", type: "text", ac: true, w: 130 },
    { key: "amount", label: "Jumlah (Rp)", type: "number", w: 140 },
    { key: "description", label: "Keterangan", type: "text", w: 160 },
  ],
  general_ledger: [
    { key: "transactionDate", label: "Tanggal", type: "date", w: 120 },
    { key: "type", label: "Tipe", type: "select", options: ["cash_in", "cash_out"], w: 100 },
    { key: "category", label: "Kategori", type: "text", ac: true, w: 130 },
    { key: "projectName", label: "Proyek", type: "text", ac: true, w: 130 },
    { key: "amount", label: "Jumlah (Rp)", type: "number", w: 140 },
    { key: "description", label: "Keterangan", type: "text", w: 160 },
    { key: "referenceNumber", label: "No. Ref", type: "text", w: 100 },
  ],
  bank: [
    { key: "transactionDate", label: "Tanggal", type: "date", w: 120 },
    { key: "type", label: "Tipe", type: "select", options: ["cash_in", "cash_out"], w: 100 },
    { key: "amount", label: "Jumlah (Rp)", type: "number", w: 140 },
    { key: "description", label: "Keterangan", type: "text", w: 160 },
    { key: "referenceNumber", label: "No. Ref", type: "text", w: 100 },
  ],
  rab: [
    { key: "projectName", label: "Proyek", type: "text", ac: true, w: 130 },
    { key: "stageCode", label: "Kode Tahap", type: "text", ac: true, w: 110 },
    { key: "itemName", label: "Nama Item", type: "text", ac: true, w: 170 },
    { key: "itemCategory", label: "Kategori", type: "text", ac: true, w: 120 },
    { key: "rabAmount", label: "Anggaran (Rp)", type: "number", w: 140 },
    { key: "realizationAmount", label: "Realisasi (Rp)", type: "number", w: 140 },
  ],
};

const FILE_TYPES = [
  { key: "cashflow", label: "Cashflow", desc: "Laporan arus kas masuk dan keluar" },
  { key: "general_ledger", label: "General Ledger", desc: "Buku besar / jurnal transaksi" },
  { key: "hutang", label: "Hutang", desc: "Daftar hutang beserta jatuh tempo" },
  { key: "piutang", label: "Piutang", desc: "Daftar piutang beserta jatuh tempo" },
  { key: "bank", label: "Rekening Koran / Bank", desc: "Mutasi rekening bank" },
  { key: "rab", label: "RAB Proyek", desc: "Rencana Anggaran Biaya per proyek" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function forwardFill(rows: any[][], headers: string[]): Record<string, any>[] {
  const last: Record<number, any> = {};
  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const val = row[i];
      const isBlank = val === null || val === undefined || String(val).trim() === "";
      if (!isBlank) { last[i] = val; obj[h] = val; }
      else { obj[h] = i < 4 ? (last[i] ?? "") : ""; }
    });
    return obj;
  });
}

function excelDateToISO(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "number" && v > 40000 && v < 60000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const cleaned = v.trim();
    const m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

function sanitizeCell(v: any): any {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "number") return v;
  if (typeof v === "string") return v.trim();
  return v ?? "";
}

function emptyRow(fields: FieldDef[], extraCols: string[]): Record<string, any> {
  const row: Record<string, any> = {};
  for (const f of fields) row[f.key] = f.type === "select" ? (f.options?.[0] ?? "") : "";
  for (const col of extraCols) row[col] = "";
  return row;
}

function fmtRp(n: number) {
  if (!n || isNaN(n)) return "Rp 0";
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type ParsedSheet = { name: string; headers: string[]; rows: Record<string, any>[] };
// Steps: type → manualInput → docUpload → aiVerify → saving → done | error
type Step = "type" | "manualInput" | "docUpload" | "aiVerify" | "saving" | "done" | "error";
type FileKind = "excel" | "pdf" | null;

type VerifyCheck = {
  label: string;
  manualValue: string;
  docValue: string;
  match: boolean;
  diff?: string;
};
type VerifyResult = {
  checks: VerifyCheck[];
  summary: string;
  matchCount: number;
  totalCount: number;
};

type AiPreviewResult = {
  records: Record<string, any>[];
  count: number;
  docTotal: number;
  paidTotal?: number;
  remainingTotal?: number;
  cashIn?: number;
  cashOut?: number;
  colMap?: Record<string, string | null>;
  warnings?: string[];
  summary?: string;
};

// ─── Manual totals per type for summary display ───────────────────────────────
function computeManualTotals(type: string, rows: Record<string, any>[]) {
  const n = (v: any) => parseFloat(String(v).replace(/[^\d.-]/g, "")) || 0;
  if (type === "hutang") {
    const total = rows.reduce((s, r) => s + n(r.totalAmount), 0);
    const paid = rows.reduce((s, r) => s + n(r.paidAmount), 0);
    return [
      { label: "Total Nilai Hutang", value: fmtRp(total) },
      { label: "Total Terbayar", value: fmtRp(paid) },
      { label: "Sisa Hutang", value: fmtRp(total - paid) },
      { label: "Jumlah Kreditur", value: `${rows.length} entri` },
    ];
  }
  if (type === "piutang") {
    const total = rows.reduce((s, r) => s + n(r.totalAmount), 0);
    return [
      { label: "Total Piutang", value: fmtRp(total) },
      { label: "Jumlah Debitur", value: `${rows.length} entri` },
    ];
  }
  if (["cashflow", "general_ledger", "bank"].includes(type)) {
    const cashIn = rows.filter(r => r.type === "cash_in").reduce((s, r) => s + n(r.amount), 0);
    const cashOut = rows.filter(r => r.type === "cash_out").reduce((s, r) => s + n(r.amount), 0);
    return [
      { label: "Total Masuk", value: fmtRp(cashIn) },
      { label: "Total Keluar", value: fmtRp(cashOut) },
      { label: "Net", value: fmtRp(cashIn - cashOut) },
      { label: "Jumlah Transaksi", value: `${rows.length} baris` },
    ];
  }
  if (type === "rab") {
    const anggaran = rows.reduce((s, r) => s + n(r.rabAmount), 0);
    const realisasi = rows.reduce((s, r) => s + n(r.realizationAmount), 0);
    return [
      { label: "Total Anggaran", value: fmtRp(anggaran) },
      { label: "Total Realisasi", value: fmtRp(realisasi) },
      { label: "Variance", value: fmtRp(anggaran - realisasi) },
      { label: "Jumlah Item", value: `${rows.length} item` },
    ];
  }
  return [{ label: "Jumlah Entri", value: `${rows.length} baris` }];
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function UploadCenter() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("type");
  const [selected, setSelected] = useState("hutang");
  const [errorMsg, setErrorMsg] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  // Manual input table state
  const [manualRows, setManualRows] = useState<Record<string, any>[]>([]);
  const [extraCols, setExtraCols] = useState<string[]>([]);
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);

  // Bukti file state
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<FileKind>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{ pages: number } | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);

  // AI verify result
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [aiPreview, setAiPreview] = useState<AiPreviewResult | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: uploads = [], refetch: refetchUploads } = useQuery({
    queryKey: ["finance-uploads"],
    queryFn: () => fetch("/api/finance/uploads").then(r => r.json()),
  });

  const lastByType: Record<string, any> = {};
  for (const u of uploads) {
    if (!lastByType[u.fileType] || new Date(u.uploadedAt) > new Date(lastByType[u.fileType].uploadedAt))
      lastByType[u.fileType] = u;
  }

  function invalidateAll() {
    ["finance-uploads","finance-hutang","finance-piutang","finance-cashflow","finance-rab"]
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  }

  // ── Start manual input step ──────────────────────────────────────────────────
  function startManualInput() {
    const fields = TYPE_FIELDS[selected] ?? [];
    setManualRows([emptyRow(fields, [])]);
    setExtraCols([]);
    setNewColName("");
    setShowAddCol(false);
    setAiPreview(null);
    setFileName("");
    setSheets([]);
    setFileKind(null);
    setErrorMsg("");
    setStep("manualInput");
  }

  // ── Manual table handlers ────────────────────────────────────────────────────
  function updateCell(rowIdx: number, key: string, val: any) {
    setManualRows(rows => rows.map((r, i) => i === rowIdx ? { ...r, [key]: val } : r));
  }
  function addRow() {
    const fields = TYPE_FIELDS[selected] ?? [];
    setManualRows(rows => [...rows, emptyRow(fields, extraCols)]);
  }
  function removeRow(i: number) {
    setManualRows(rows => rows.filter((_, idx) => idx !== i));
  }
  function clearTable() {
    setManualRows([]);
    setExtraCols([]);
    setNewColName("");
    setShowAddCol(false);
  }
  function addExtraCol() {
    const name = newColName.trim();
    if (!name || extraCols.includes(name)) return;
    setExtraCols(c => [...c, name]);
    setManualRows(rows => rows.map(r => ({ ...r, [name]: "" })));
    setNewColName("");
    setShowAddCol(false);
  }
  function removeExtraCol(col: string) {
    setExtraCols(c => c.filter(x => x !== col));
    setManualRows(rows => rows.map(r => { const nr = { ...r }; delete nr[col]; return nr; }));
  }

  // ── File parsing ─────────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg("");
    setAiPreview(null);
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (isPdf) {
      setErrorMsg("Finance Upload sekarang dibuat paten ke Excel. Gunakan file .xlsx, .xls, atau .csv.");
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      return;
    } else {
      setFileKind("excel");
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: true, cellNF: false, cellText: false });
          const parsed: ParsedSheet[] = [];
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
            const rawRowsRaw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
            if (rawRows.length < 2) continue;
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(6, rawRows.length); i++) {
              if ((rawRows[i] as any[]).filter(c => c !== null && c !== undefined && String(c).trim() !== "").length >= 2) { headerRowIdx = i; break; }
            }
            const headers = (rawRows[headerRowIdx] as any[]).map(v => String(v ?? "").trim()).filter(h => h !== "");
            const dataRawRows = rawRowsRaw.slice(headerRowIdx + 1).filter(row => (row as any[]).some(c => c !== null && c !== undefined && String(c).trim() !== ""));
            const dataFormattedRows = rawRows.slice(headerRowIdx + 1).filter(row => (row as any[]).some(c => c !== null && c !== undefined && String(c).trim() !== ""));
            const dataRows = forwardFill(dataRawRows, headers).map((row, rowIdx) => {
              const formatted = dataFormattedRows[rowIdx] ?? [];
              const result: Record<string, any> = {};
              headers.forEach((h, i) => {
                const rawVal = row[h]; const fmtVal = formatted[i];
                if (rawVal instanceof Date) result[h] = rawVal.toISOString().split("T")[0];
                else if (typeof rawVal === "number" && rawVal > 40000 && rawVal < 60000 && typeof fmtVal === "string" && fmtVal.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) result[h] = excelDateToISO(fmtVal) ?? rawVal;
                else result[h] = sanitizeCell(rawVal);
              });
              return result;
            });
            if (dataRows.length > 0) parsed.push({ name: sheetName, headers, rows: dataRows });
          }
          if (!parsed.length) { setErrorMsg("File tidak memiliki data yang bisa dibaca."); return; }
          setSheets(parsed); setActiveSheet(0);
          runExcelPreview(file.name, parsed);
        } catch { setErrorMsg("Gagal membaca file Excel. Pastikan format .xlsx atau .xls."); }
      };
      reader.readAsBinaryString(file);
    }
  }

  async function runExcelPreview(nextFileName = fileName, nextSheets = sheets) {
    if (!nextSheets.length) { setErrorMsg("Upload Excel terlebih dahulu."); return; }
    setStep("saving");
    setProcessingMsg("AI membaca Excel, mendeteksi mapping kolom, dan menyiapkan preview data...");
    try {
      const res = await fetch("/api/finance/uploads/ai-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: selected, fileName: nextFileName, fileKind: "excel", sheets: nextSheets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI gagal membaca Excel");
      const rows = Array.isArray(data.records) ? data.records : [];
      setAiPreview(data);
      setManualRows(rows.length ? rows : [emptyRow(TYPE_FIELDS[selected] ?? [], [])]);
      setExtraCols([]);
      setStep("manualInput");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Gagal menganalisis Excel");
      setStep("docUpload");
    }
  }

  const fileReady = fileName && fileKind === "excel" && sheets.length > 0;
  const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);
  const curSheet = sheets[activeSheet];

  // ── AI Verifikasi ────────────────────────────────────────────────────────────
  async function runVerify() {
    if (!fileReady) { setErrorMsg("Upload bukti file terlebih dahulu."); return; }
    setStep("saving");
    setProcessingMsg("AI membaca bukti dokumen dan memverifikasi kesesuaian dengan data manual...");
    try {
      const body = {
        fileType: selected,
        manualEntries: manualRows,
        fileName,
        fileKind,
        sheets,
      };
      const res = await fetch("/api/finance/uploads/ai-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verifikasi AI gagal");
      setVerifyResult(data);
      setStep("aiVerify");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Kesalahan saat verifikasi");
      setStep("error");
    }
  }

  // ── Save manual data ─────────────────────────────────────────────────────────
  async function saveManualData() {
    const valid = manualRows.filter(r => Object.values(r).some(v => v !== "" && v !== 0));
    if (!valid.length) { setErrorMsg("Tidak ada data untuk disimpan."); return; }
    setStep("saving");
    setProcessingMsg(`Menyimpan ${valid.length} entri ke database...`);
    try {
      const res = await fetch("/api/finance/uploads/manual-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: selected, sessionName: fileName || `Manual ${new Date().toLocaleDateString("id-ID")}`, entries: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setResultMsg(`${data.inserted} entri data ${FILE_TYPES.find(f => f.key === selected)?.label ?? selected} berhasil disimpan.`);
      setStep("done");
      invalidateAll();
    } catch (err: any) {
      setErrorMsg(err.message ?? "Terjadi kesalahan");
      setStep("error");
    }
  }

  async function deleteUpload(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/uploads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      await refetchUploads();
      invalidateAll();
    } catch { } finally { setDeletingId(null); }
  }

  function reset() {
    setStep("type"); setFileName(""); setSheets([]); setFileKind(null); setPdfBase64(null);
    setPdfInfo(null); setErrorMsg(""); setResultMsg(""); setActiveSheet(0);
    setManualRows([]); setExtraCols([]); setNewColName(""); setShowAddCol(false);
    setVerifyResult(null); setAiPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fields = TYPE_FIELDS[selected] ?? [];
  const manualTotals = computeManualTotals(selected, manualRows);
  const typeName = FILE_TYPES.find(f => f.key === selected)?.label ?? selected;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Upload Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload Excel keuangan, AI membaca isi file, lalu Finance tinggal review dan simpan.</p>
      </div>

      {/* ── STEP: TYPE ──────────────────────────────────────────────────────────── */}
      {step === "type" && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background font-bold text-[10px]">1</span>
            <span className="font-medium text-foreground">Pilih Jenis Data</span>
            <span className="text-muted-foreground/50">→</span>
            <span>2. Upload Excel</span>
            <span className="text-muted-foreground/50">→</span>
            <span>3. AI Analisis</span>
            <span className="text-muted-foreground/50">→</span>
            <span>4. Review & Simpan</span>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Pilih Jenis Data</span>
              <span className="text-xs text-muted-foreground">Dipilih: <strong>{typeName}</strong></span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {FILE_TYPES.map(ft => {
                const last = lastByType[ft.key];
                return (
                  <button key={ft.key} onClick={() => setSelected(ft.key)}
                    className={cn("text-left p-3 rounded-lg border transition-all", selected === ft.key ? "border-foreground bg-foreground/5" : "hover:bg-muted/40")}>
                    <div className="text-sm font-medium">{ft.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ft.desc}</div>
                    {last && (
                      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                        {fmtDate(last.uploadedAt)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep("docUpload")}
            className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 flex items-center gap-2">
            <Upload className="size-3.5" /> Upload Excel {typeName}
          </button>
          <button onClick={startManualInput}
            className="border text-sm font-medium px-5 py-2.5 rounded-md hover:bg-muted flex items-center gap-2">
            <Plus className="size-3.5" /> Input Manual dari Template
          </button>
        </div>
      )}

      {/* ── STEP: MANUAL INPUT ──────────────────────────────────────────────────── */}
      {step === "manualInput" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setStep("type")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />Kembali
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold">{typeName} — Review Tabel Finance</div>
              <div className="text-xs text-muted-foreground">
                {aiPreview ? "AI sudah membaca Excel. Periksa mapping, edit baris jika perlu, lalu simpan." : "Input manual dari template. Kolom dan baris bisa ditambah atau dikosongkan ulang."}
              </div>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">{manualRows.length} baris</span>
          </div>

          {aiPreview && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Hasil Analisis Excel</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{aiPreview.summary ?? `${aiPreview.count} baris valid dibaca.`}</p>
                </div>
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 font-medium">
                  {aiPreview.count.toLocaleString("id-ID")} baris
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-[10px] text-muted-foreground">Total terbaca</div>
                  <div className="text-sm font-semibold">{fmtRp(aiPreview.docTotal ?? 0)}</div>
                </div>
                {selected === "hutang" && (
                  <>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-[10px] text-muted-foreground">Terbayar</div>
                      <div className="text-sm font-semibold">{fmtRp(aiPreview.paidTotal ?? 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-[10px] text-muted-foreground">Sisa hutang</div>
                      <div className="text-sm font-semibold">{fmtRp(aiPreview.remainingTotal ?? 0)}</div>
                    </div>
                  </>
                )}
                {["cashflow", "general_ledger", "bank"].includes(selected) && (
                  <>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-[10px] text-muted-foreground">Cash in</div>
                      <div className="text-sm font-semibold text-emerald-600">{fmtRp(aiPreview.cashIn ?? 0)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-[10px] text-muted-foreground">Cash out</div>
                      <div className="text-sm font-semibold text-red-500">{fmtRp(aiPreview.cashOut ?? 0)}</div>
                    </div>
                  </>
                )}
              </div>
              {aiPreview.colMap && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(aiPreview.colMap).filter(([, v]) => v).map(([field, col]) => (
                    <span key={field} className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground">
                      {field} → <strong>{col}</strong>
                    </span>
                  ))}
                </div>
              )}
              {!!aiPreview.warnings?.length && (
                <div className="space-y-1">
                  {aiPreview.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">{w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Running totals */}
          <div className="flex gap-2 flex-wrap">
            {manualTotals.map(t => (
              <div key={t.label} className="border rounded-lg px-3 py-2 bg-muted/20">
                <div className="text-[10px] text-muted-foreground">{t.label}</div>
                <div className="text-sm font-semibold">{t.value}</div>
              </div>
            ))}
          </div>

          {/* Manual input table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2 py-2 text-left text-muted-foreground font-medium w-7">#</th>
                    {fields.map(f => (
                      <th key={f.key} className="px-1.5 py-2 text-left text-muted-foreground font-medium whitespace-nowrap" style={{ minWidth: f.w ?? 120 }}>
                        {f.label}
                      </th>
                    ))}
                    {extraCols.map(col => (
                      <th key={col} className="px-1.5 py-2 text-left font-medium whitespace-nowrap" style={{ minWidth: 120 }}>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{col}</span>
                          <button onClick={() => removeExtraCol(col)} className="text-muted-foreground hover:text-red-500 ml-0.5">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2 w-24">
                      {showAddCol ? (
                        <div className="flex items-center gap-1">
                          <input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") addExtraCol(); if (e.key === "Escape") { setShowAddCol(false); setNewColName(""); } }}
                            placeholder="Nama kolom"
                            className="text-[10px] px-1.5 py-1 border rounded-sm bg-background w-20 focus:outline-none focus:ring-1 focus:ring-ring" />
                          <button onClick={addExtraCol} className="text-emerald-600 hover:text-emerald-700 text-[10px] font-medium">OK</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddCol(true)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap">
                          <PlusSquare className="size-3" />Kolom
                        </button>
                      )}
                    </th>
                    <th className="px-2 py-2 w-7" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-2 py-1 text-muted-foreground text-center text-[10px]">{i + 1}</td>
                      {fields.map(f => (
                        <td key={f.key} className="px-1 py-1" style={{ minWidth: f.w ?? 120 }}>
                          {f.type === "select" ? (
                            <select value={row[f.key] ?? ""} onChange={e => updateCell(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === "date" ? (
                            <input type="date" value={row[f.key] ?? ""} onChange={e => updateCell(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                          ) : f.type === "number" ? (
                            <input type="number" value={row[f.key] ?? ""} onChange={e => updateCell(i, f.key, e.target.value)}
                              placeholder="0" min={0}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          ) : (
                            <input type="text" value={row[f.key] ?? ""} onChange={e => updateCell(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                          )}
                        </td>
                      ))}
                      {extraCols.map(col => (
                        <td key={col} className="px-1 py-1" style={{ minWidth: 120 }}>
                          <input type="text" value={row[col] ?? ""} onChange={e => updateCell(i, col, e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                        </td>
                      ))}
                      <td className="px-2 py-1 w-24" />
                      <td className="px-2 py-1 w-7">
                        <button onClick={() => removeRow(i)}
                          className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t">
              <div className="flex flex-wrap gap-2">
                <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">
                  <Plus className="size-3.5" />Tambah Baris
                </button>
                <button onClick={clearTable} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                  <Trash2 className="size-3.5" />Kosongkan Tabel
                </button>
              </div>
            </div>
          </div>

          {errorMsg && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">{errorMsg}</div>}

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("docUpload")}
              className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 flex items-center gap-2">
              <Upload className="size-3.5" /> Upload Excel Baru
            </button>
            <button onClick={saveManualData}
              className="border text-sm font-medium px-4 py-2.5 rounded-md hover:bg-muted flex items-center gap-2">
              Simpan Tabel ke Database
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: DOC UPLOAD (bukti) ─────────────────────────────────────────────── */}
      {step === "docUpload" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("manualInput")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />Kembali ke Review
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold">{typeName} — Upload Excel</div>
              <div className="text-xs text-muted-foreground">Pakai Excel sebagai sumber utama. Setelah file dipilih, AI langsung membaca isi sheet dan menyiapkan tabel preview.</div>
            </div>
          </div>

          {/* Summary of manual input */}
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Ringkasan tabel sementara:</div>
            <div className="flex gap-2 flex-wrap">
              {manualTotals.map(t => (
                <div key={t.label} className="text-xs">
                  <span className="text-muted-foreground">{t.label}: </span>
                  <span className="font-semibold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn("rounded-xl border-2 border-dashed p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors", errorMsg && "border-red-300")}
            onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">{fileName || "Klik untuk pilih Excel finance"}</p>
            <p className="text-xs text-muted-foreground mt-1">Format: Excel saja (.xlsx, .xls, .csv). PDF tidak dipakai di flow Finance.</p>
          </div>

          {errorMsg && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">{errorMsg}</div>}

          {fileReady && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-500" />
                <span className="text-sm font-medium truncate">{fileName}</span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {`${totalRows.toLocaleString("id-ID")} baris, ${sheets.length} sheet`}
                </span>
              </div>
              {fileKind === "excel" && sheets.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {sheets.map((sh, i) => (
                    <button key={sh.name} onClick={() => setActiveSheet(i)}
                      className={cn("text-xs px-2.5 py-0.5 rounded border", activeSheet === i ? "bg-foreground text-background" : "hover:bg-muted")}>
                      {sh.name} ({sh.rows.length})
                    </button>
                  ))}
                </div>
              )}
              {fileKind === "excel" && curSheet && (
                <div className="overflow-x-auto rounded-lg border text-xs max-h-40">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {curSheet.headers.slice(0, 6).map(h => <th key={h} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
                        {curSheet.headers.length > 6 && <th className="px-3 py-1.5 text-muted-foreground">+{curSheet.headers.length - 6}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {curSheet.rows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {curSheet.headers.slice(0, 6).map(h => (
                            <td key={h} className="px-3 py-1 text-muted-foreground truncate max-w-[110px]">{String(row[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {fileReady && (
              <button onClick={() => runExcelPreview()}
                className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2.5 rounded-md hover:opacity-90">
                <Sparkles className="size-3.5" /> Analisis Ulang Excel
              </button>
            )}
            <button onClick={saveManualData}
              className="border text-sm font-medium px-4 py-2.5 rounded-md hover:bg-muted flex items-center gap-2">
              Simpan Tabel ke Database
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: AI VERIFY RESULT ──────────────────────────────────────────────── */}
      {step === "aiVerify" && verifyResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("docUpload")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" />Kembali
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold">{typeName} — Hasil Verifikasi AI</div>
              <div className="text-xs text-muted-foreground">
                {verifyResult.matchCount}/{verifyResult.totalCount} item cocok — {verifyResult.summary}
              </div>
            </div>
            <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full",
              verifyResult.matchCount === verifyResult.totalCount
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : verifyResult.matchCount >= verifyResult.totalCount / 2
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400")}>
              {verifyResult.matchCount === verifyResult.totalCount ? "Cocok Semua" : `${verifyResult.matchCount}/${verifyResult.totalCount} Cocok`}
            </span>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Item Verifikasi</th>
                  <th className="text-right px-3 py-2.5 font-medium">Input Manual</th>
                  <th className="text-right px-3 py-2.5 font-medium">Dari Dokumen</th>
                  <th className="text-center px-3 py-2.5 font-medium w-24">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {verifyResult.checks.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{c.label}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{c.manualValue}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-muted-foreground">{c.docValue}</td>
                    <td className="px-3 py-2.5 text-center">
                      {c.match ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <Check className="size-3" /> Cocok
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          <XIcon className="size-3" /> Tidak Cocok
                        </span>
                      )}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right text-sm font-mono", c.match ? "text-muted-foreground" : "text-red-600 dark:text-red-400 font-semibold")}>
                      {c.diff ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verifyResult.matchCount < verifyResult.totalCount && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
              <HelpCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>Terdapat selisih antara data manual dan dokumen bukti. Pastikan dokumen yang diupload sudah benar sebelum menyimpan.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={saveManualData}
              className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90">
              Simpan Data Manual ke Database
            </button>
            <button onClick={() => setStep("manualInput")}
              className="border text-sm px-4 py-2.5 rounded-md hover:bg-muted">
              Edit Data Manual
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: SAVING ────────────────────────────────────────────────────────── */}
      {step === "saving" && (
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">{processingMsg}</p>
        </div>
      )}

      {/* ── STEP: DONE ──────────────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="size-10 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold">Berhasil Disimpan</p>
            <p className="text-sm text-muted-foreground mt-1">{resultMsg}</p>
          </div>
          <button onClick={reset} className="mt-2 border text-sm px-4 py-2 rounded-md hover:bg-muted">Upload Data Lagi</button>
        </div>
      )}

      {/* ── STEP: ERROR ─────────────────────────────────────────────────────────── */}
      {step === "error" && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="size-10 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Terjadi Kesalahan</p>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset} className="mt-2 border border-red-300 dark:border-red-800 text-sm px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30">Coba Lagi</button>
        </div>
      )}

      {/* ── RIWAYAT UPLOAD ──────────────────────────────────────────────────────── */}
      {step === "type" && uploads.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Riwayat Upload</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Jenis Data", "Sesi / Nama File", "Tanggal", "Baris", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 12).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        {u.fileName?.toLowerCase().endsWith(".pdf") ? <FileType className="size-3 text-blue-500" />
                          : <FileText className="size-3 text-emerald-500" />}
                        {FILE_TYPES.find(f => f.key === u.fileType)?.label ?? u.fileType}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{u.fileName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.uploadedAt)}</td>
                    <td className="px-4 py-2.5 text-xs">{u.rowCount ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                        u.status === "berhasil" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : u.status === "error" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400")}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs w-10">
                      <button onClick={() => deleteUpload(u.id)} disabled={deletingId === u.id}
                        className="text-muted-foreground hover:text-red-500 disabled:opacity-40"
                        title="Hapus upload ini">
                        {deletingId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
