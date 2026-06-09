import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileText, FileType, Plus, Trash2, ChevronLeft, ClipboardList, Table } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ─── Field schema per data type ────────────────────────────────────────────────
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

function emptyRow(type: string): Record<string, any> {
  const row: Record<string, any> = {};
  for (const f of (TYPE_FIELDS[type] ?? [])) {
    row[f.key] = f.type === "select" ? (f.options?.[0] ?? "") : "";
  }
  return row;
}

function fmtRp(n: number) {
  if (!n || isNaN(n)) return "Rp 0";
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type ParsedSheet = { name: string; headers: string[]; rows: Record<string, any>[] };
type Step = "type" | "manual" | "docUpload" | "aiCompare" | "saving" | "done" | "error";
type Mode = "manual_first" | "doc_direct";
type FileKind = "excel" | "pdf" | null;

// ─── AutocompleteInput ─────────────────────────────────────────────────────────
function AcInput({ value, onChange, dataType, field, placeholder, cls }: {
  value: string; onChange: (v: string) => void; dataType: string; field: string;
  placeholder?: string; cls?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: all = [] } = useQuery<string[]>({
    queryKey: ["ac", dataType, field],
    queryFn: () => fetch(`/api/finance/autocomplete?type=${dataType}&field=${field}`).then(r => r.json()),
    staleTime: 120_000,
    enabled: !!field,
  });
  const matches = value.length >= 1
    ? all.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : all;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder ?? ""}
        className={cn("w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring", cls)}
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 z-40 mt-0.5 bg-popover border rounded-md shadow-lg max-h-44 overflow-y-auto" style={{ minWidth: 160 }}>
          {matches.slice(0, 10).map(s => (
            <button key={s} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted border-b last:border-0 truncate">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function UploadCenter() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("type");
  const [mode, setMode] = useState<Mode>("manual_first");
  const [selected, setSelected] = useState("hutang");
  const [manualRows, setManualRows] = useState<Record<string, any>[]>([emptyRow("hutang")]);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<FileKind>(null);
  const [pdfInfo, setPdfInfo] = useState<{ pages: number } | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [aiPreview, setAiPreview] = useState<{ records: any[]; count: number; docTotal: number } | null>(null);
  const [resultMsg, setResultMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: uploads = [] } = useQuery({
    queryKey: ["finance-uploads"],
    queryFn: () => fetch("/api/finance/uploads").then(r => r.json()),
  });

  const lastByType: Record<string, any> = {};
  for (const u of uploads) {
    if (!lastByType[u.fileType] || new Date(u.uploadedAt) > new Date(lastByType[u.fileType].uploadedAt))
      lastByType[u.fileType] = u;
  }

  function invalidateAll() {
    ["finance-uploads", "finance-hutang", "finance-piutang", "finance-cashflow", "finance-rab"]
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  }

  function selectType(type: string) {
    setSelected(type);
    setManualRows([emptyRow(type)]);
    setErrorMsg("");
  }

  function startFlow() {
    if (mode === "doc_direct") { setStep("docUpload"); }
    else { setStep("manual"); }
  }

  function addRow() { setManualRows(r => [...r, emptyRow(selected)]); }
  function removeRow(i: number) { setManualRows(r => r.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: string, val: any) {
    setManualRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  const validManualRows = manualRows.filter(r => Object.values(r).some(v => v !== "" && v !== 0));

  const manualTotal = validManualRows.reduce((s, r) => {
    const numFields = (TYPE_FIELDS[selected] ?? []).filter(f => f.type === "number");
    const firstNumField = numFields[0]?.key ?? "totalAmount";
    return s + (Number(r[firstNumField]) || 0);
  }, 0);

  // ── File parsing ──────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg("");
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (isPdf) {
      setFileKind("pdf");
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          setPdfBase64(btoa(binary));
          const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          const pageCount = (text.match(/\/Page\b/g) || []).length;
          setPdfInfo({ pages: Math.max(1, Math.floor(pageCount / 2)) });
        } catch { setErrorMsg("Gagal membaca file PDF."); }
      };
      reader.readAsArrayBuffer(file);
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
        } catch { setErrorMsg("Gagal membaca file Excel. Pastikan format .xlsx atau .xls."); }
      };
      reader.readAsBinaryString(file);
    }
  }

  async function runAiPreview() {
    setStep("saving");
    setProcessingMsg(`AI membaca ${fileKind === "pdf" ? "PDF" : `${sheets.length} sheet Excel`} dan membandingkan dengan ${validManualRows.length} baris manual...`);
    try {
      const body = fileKind === "pdf"
        ? { fileType: selected, fileName, pdfBase64, fileKind: "pdf" }
        : { fileType: selected, fileName, sheets, fileKind: "excel" };
      const res = await fetch("/api/finance/uploads/ai-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI preview gagal");
      setAiPreview(data);
      setStep("aiCompare");
    } catch (err: any) { setErrorMsg(err.message ?? "Kesalahan saat AI membaca dokumen"); setStep("error"); }
  }

  async function saveManual() {
    if (!validManualRows.length) { setErrorMsg("Tidak ada data untuk disimpan."); return; }
    setStep("saving");
    setProcessingMsg(`Menyimpan ${validManualRows.length} entri ke database...`);
    try {
      const res = await fetch("/api/finance/uploads/manual-save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileType: selected, entries: validManualRows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setResultMsg(`${data.inserted} entri data ${FILE_TYPES.find(f => f.key === selected)?.label ?? selected} berhasil disimpan dari input manual.`);
      setStep("done"); invalidateAll();
    } catch (err: any) { setErrorMsg(err.message ?? "Terjadi kesalahan"); setStep("error"); }
  }

  async function saveFromDoc() {
    setStep("saving");
    setProcessingMsg("Menyimpan data dari dokumen ke database...");
    try {
      let res: Response;
      if (fileKind === "pdf") {
        res = await fetch("/api/finance/uploads/pdf-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileType: selected, fileName, pdfBase64 }) });
      } else {
        res = await fetch("/api/finance/uploads/ai-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileType: selected, fileName, sheets }) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import gagal");
      setResultMsg(`${data.inserted} entri data ${FILE_TYPES.find(f => f.key === selected)?.label ?? selected} berhasil diimport dari ${fileKind === "pdf" ? "PDF" : `${sheets.length} sheet Excel`}.`);
      setStep("done"); invalidateAll();
    } catch (err: any) { setErrorMsg(err.message ?? "Terjadi kesalahan"); setStep("error"); }
  }

  function reset() {
    setStep("type"); setFileName(""); setSheets([]); setFileKind(null); setPdfBase64(null);
    setPdfInfo(null); setErrorMsg(""); setResultMsg(""); setActiveSheet(0); setAiPreview(null);
    setManualRows([emptyRow(selected)]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fields = TYPE_FIELDS[selected] ?? [];
  const curSheet = sheets[activeSheet];
  const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);

  const fileReady = fileName && (fileKind === "pdf" ? !!pdfBase64 : sheets.length > 0);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Upload Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Input data keuangan secara manual atau import dari dokumen</p>
      </div>

      {/* ── STEP: TYPE ──────────────────────────────────────────────────────────── */}
      {step === "type" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "manual_first" as Mode, Icon: ClipboardList, title: "Manual + Bukti Dokumen", desc: "Isi data sendiri dulu, lalu upload dokumen sebagai bukti. AI akan verifikasi." },
              { key: "doc_direct" as Mode, Icon: Table, title: "Upload Dokumen Langsung", desc: "Upload Excel atau PDF, AI baca dan ekstrak data secara otomatis." },
            ]).map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={cn("text-left p-4 rounded-xl border transition-all", mode === m.key ? "border-foreground bg-foreground/5 shadow-sm" : "border-border hover:bg-muted/30")}>
                <m.Icon className={cn("size-5 mb-2", mode === m.key ? "text-foreground" : "text-muted-foreground")} />
                <div className="text-sm font-semibold">{m.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</div>
                {mode === m.key && <div className="mt-2 text-[11px] font-medium text-foreground bg-foreground/10 inline-block px-2 py-0.5 rounded-full">Dipilih</div>}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Pilih Jenis Data</span>
              <span className="text-xs text-muted-foreground">Dipilih: <strong>{FILE_TYPES.find(f => f.key === selected)?.label}</strong></span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {FILE_TYPES.map(ft => {
                const last = lastByType[ft.key];
                return (
                  <button key={ft.key} onClick={() => selectType(ft.key)}
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

          <button onClick={startFlow}
            className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 flex items-center gap-2">
            {mode === "manual_first" ? <><ClipboardList className="size-3.5" />Mulai Input Manual</> : <><Upload className="size-3.5" />Mulai Upload Dokumen</>}
          </button>
        </div>
      )}

      {/* ── STEP: MANUAL ────────────────────────────────────────────────────────── */}
      {step === "manual" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("type")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-3.5" />Kembali
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold">{FILE_TYPES.find(f => f.key === selected)?.label} — Input Data Manual</div>
              <div className="text-xs text-muted-foreground">Klik kolom teks untuk melihat riwayat pilihan. Bisa tambah banyak baris sekaligus.</div>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">{manualRows.length} baris</span>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2 py-2 text-left text-muted-foreground font-medium w-7 shrink-0">#</th>
                    {fields.map(f => (
                      <th key={f.key} className="px-1.5 py-2 text-left text-muted-foreground font-medium whitespace-nowrap" style={{ minWidth: f.w ?? 120 }}>
                        {f.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 w-7" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-1 text-muted-foreground text-center text-[10px]">{i + 1}</td>
                      {fields.map(f => (
                        <td key={f.key} className="px-1 py-1" style={{ minWidth: f.w ?? 120 }}>
                          {f.type === "select" ? (
                            <select value={row[f.key] ?? ""} onChange={e => updateRow(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === "date" ? (
                            <input type="date" value={row[f.key] ?? ""} onChange={e => updateRow(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                          ) : f.type === "number" ? (
                            <input type="number" value={row[f.key] ?? ""} onChange={e => updateRow(i, f.key, e.target.value)}
                              placeholder="0" min={0}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          ) : f.ac ? (
                            <AcInput value={row[f.key] ?? ""} onChange={v => updateRow(i, f.key, v)} dataType={selected} field={f.key} />
                          ) : (
                            <input type="text" value={row[f.key] ?? ""} onChange={e => updateRow(i, f.key, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-1 w-7">
                        <button onClick={() => removeRow(i)} disabled={manualRows.length === 1}
                          className="text-muted-foreground hover:text-red-500 disabled:opacity-20 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t">
              <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                <Plus className="size-3.5" />Tambah Baris
              </button>
            </div>
          </div>

          {errorMsg && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">{errorMsg}</div>}

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={saveManual}
              className="bg-foreground text-background text-sm font-medium px-4 py-2 rounded-md hover:opacity-90">
              Simpan Sekarang
            </button>
            <button onClick={() => { setErrorMsg(""); setStep("docUpload"); }}
              className="flex items-center gap-2 border text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-colors">
              <Upload className="size-3.5" />Upload Bukti Dokumen
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: DOC UPLOAD ────────────────────────────────────────────────────── */}
      {step === "docUpload" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(mode === "manual_first" ? "manual" : "type")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-3.5" />Kembali
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold">{FILE_TYPES.find(f => f.key === selected)?.label} — {mode === "manual_first" ? "Upload Bukti Dokumen" : "Upload Dokumen"}</div>
              <div className="text-xs text-muted-foreground">
                {mode === "manual_first" && validManualRows.length > 0
                  ? `${validManualRows.length} baris dari input manual siap diverifikasi`
                  : "Upload Excel atau PDF untuk diproses AI"}
              </div>
            </div>
          </div>

          <div className={cn("rounded-xl border-2 border-dashed p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors", errorMsg && "border-red-300")}
            onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={handleFile} />
            <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">{fileName || "Klik atau seret file ke sini"}</p>
            <p className="text-xs text-muted-foreground mt-1">Format: Excel (.xlsx, .xls) atau PDF</p>
          </div>

          {errorMsg && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">{errorMsg}</div>}

          {fileReady && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                {fileKind === "pdf" ? <FileType className="size-4 text-blue-500" /> : <FileText className="size-4 text-emerald-500" />}
                <span className="text-sm font-medium truncate">{fileName}</span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {fileKind === "pdf" ? `~${pdfInfo?.pages} hal.` : `${totalRows.toLocaleString("id-ID")} baris, ${sheets.length} sheet`}
                </span>
              </div>
              {fileKind === "excel" && sheets.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {sheets.map((sh, i) => (
                    <button key={sh.name} onClick={() => setActiveSheet(i)}
                      className={cn("text-xs px-2.5 py-0.5 rounded border transition-colors", activeSheet === i ? "bg-foreground text-background" : "hover:bg-muted")}>
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
              <button onClick={mode === "manual_first" ? runAiPreview : saveFromDoc}
                className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-md hover:opacity-90">
                <Sparkles className="size-3.5" />
                {mode === "manual_first" ? "Verifikasi dengan AI" : `Proses dengan AI`}
              </button>
            )}
            {mode === "manual_first" && (
              <button onClick={saveManual} className="border text-sm px-4 py-2 rounded-md hover:bg-muted transition-colors">
                Simpan Manual Saja
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: AI COMPARE ────────────────────────────────────────────────────── */}
      {step === "aiCompare" && aiPreview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("docUpload")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-3.5" />Kembali
            </button>
            <div className="text-sm font-semibold">Hasil Verifikasi AI</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Input Manual Anda</div>
              <div className="text-2xl font-bold tabular-nums">{validManualRows.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">baris</div>
              <div className="text-sm font-medium mt-2 text-foreground">{fmtRp(manualTotal)}</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Terdeteksi dari Dokumen</div>
              <div className="text-2xl font-bold tabular-nums">{aiPreview.count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">baris</div>
              <div className="text-sm font-medium mt-2 text-foreground">{fmtRp(aiPreview.docTotal)}</div>
            </div>
          </div>

          {(() => {
            const diff = Math.abs(manualTotal - aiPreview.docTotal);
            const pct = manualTotal > 0 ? (diff / manualTotal) * 100 : 100;
            const match = pct < 2;
            return (
              <div className={cn("rounded-lg border p-3 flex items-center gap-2 text-sm",
                match ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400")}>
                {match ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                <span>
                  {match
                    ? "Nilai dari input manual cocok dengan dokumen."
                    : `Selisih ${fmtRp(diff)} antara manual (${fmtRp(manualTotal)}) dan dokumen (${fmtRp(aiPreview.docTotal)}). Pilih sumber data yang tepat.`}
                </span>
              </div>
            );
          })()}

          {aiPreview.records.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                Preview entri dari dokumen ({aiPreview.count} total, tampil {Math.min(5, aiPreview.records.length)})
              </div>
              <div className="overflow-x-auto max-h-44">
                <table className="w-full text-xs">
                  <tbody>
                    {aiPreview.records.slice(0, 5).map((r: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.entries(r).slice(0, 5).map(([k, v]) => (
                          <td key={k} className="px-3 py-1.5 text-muted-foreground truncate max-w-[120px]">{String(v ?? "-")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={saveManual}
              className="bg-foreground text-background text-sm font-medium px-4 py-2 rounded-md hover:opacity-90">
              Simpan dari Input Manual
            </button>
            <button onClick={saveFromDoc}
              className="flex items-center gap-2 border text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-colors">
              <Sparkles className="size-3.5" />Simpan dari Dokumen
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
          <button onClick={reset} className="mt-2 border text-sm px-4 py-2 rounded-md hover:bg-muted transition-colors">Input Data Lagi</button>
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
          <button onClick={reset} className="mt-2 border border-red-300 dark:border-red-800 text-sm px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">Coba Lagi</button>
        </div>
      )}

      {/* ── RIWAYAT UPLOAD ──────────────────────────────────────────────────────── */}
      {step === "type" && uploads.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Riwayat Upload & Input</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Jenis Data", "Nama / Sesi", "Tanggal", "Baris", "Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 12).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        {u.fileName?.startsWith("Manual") ? <ClipboardList className="size-3 text-amber-500" />
                          : u.fileName?.toLowerCase().endsWith(".pdf") ? <FileType className="size-3 text-blue-500" />
                          : <FileText className="size-3 text-emerald-500" />}
                        {FILE_TYPES.find(f => f.key === u.fileType)?.label ?? u.fileType}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{u.fileName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.uploadedAt)}</td>
                    <td className="px-4 py-2.5 text-xs">{u.rowCount ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                        u.status === "berhasil" ? "bg-emerald-100 text-emerald-700" : u.status === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                        {u.status}
                      </span>
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
