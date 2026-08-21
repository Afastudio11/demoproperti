import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Download, Plus, Search, ChevronDown, ChevronRight,
  Building2, X, Check, AlertCircle, RefreshCw, Trash2, Filter,
  BarChart2, FileSpreadsheet, Database,
} from "lucide-react";
import { DAFTAR_PERUMAHAN_SULSEL, type PerumahanEntry } from "@/data/perumahan-sulsel";
import { cn } from "@/lib/utils";
import { isOwnCompany } from "@/lib/own-company";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KompetitorEntry extends PerumahanEntry {
  id: string;
  tahun?: number;
  catatan?: string;
  source: "static" | "import" | "manual";
  importBatch?: string;
}

interface ImportMeta {
  date: string;
  count: number;
  tahun?: number;
  label: string;
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const LS_MANUAL   = "app_komp_manual";
const LS_IMPORT   = "app_komp_import";
const LS_IMP_META = "app_komp_import_meta";

function loadManual(): KompetitorEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_MANUAL) ?? "[]"); } catch { return []; }
}
function saveManual(data: KompetitorEntry[]) {
  localStorage.setItem(LS_MANUAL, JSON.stringify(data));
}
function loadImported(): KompetitorEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_IMPORT) ?? "[]"); } catch { return []; }
}
function saveImported(data: KompetitorEntry[], meta: ImportMeta) {
  localStorage.setItem(LS_IMPORT, JSON.stringify(data));
  localStorage.setItem(LS_IMP_META, JSON.stringify(meta));
}
function loadImportMeta(): ImportMeta | null {
  try { return JSON.parse(localStorage.getItem(LS_IMP_META) ?? "null"); } catch { return null; }
}
function clearImported() {
  localStorage.removeItem(LS_IMPORT);
  localStorage.removeItem(LS_IMP_META);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKab(s: string) {
  return s.toUpperCase().replace(/^KAB\.?\s+|^KOTA\s+|^KABUPATEN\s+/g, "").trim();
}

function toEntry(row: Record<string, unknown>, source: KompetitorEntry["source"], batch?: string): KompetitorEntry | null {
  const find = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
  const nama = find("Nama Perumahan", "nama", "NAMA PERUMAHAN", "Nama");
  const kabupaten = find("Kabupaten", "kabupaten", "KABUPATEN");
  const kecamatan = find("Kecamatan", "kecamatan", "KECAMATAN");
  if (!nama || !kabupaten || !kecamatan) return null;
  const totalUnit = parseInt(find("Total Unit", "totalUnit", "total_unit", "TOTAL UNIT") || "0", 10);
  const unitKomersil = parseInt(find("Unit Komersil", "unitKomersil", "unit_komersil", "UNIT KOMERSIL") || "0", 10);
  const tahunRaw = find("Tahun", "tahun", "TAHUN");
  return {
    id: crypto.randomUUID(),
    nama,
    pengembang: find("Pengembang", "pengembang", "PENGEMBANG"),
    asosiasi: find("Asosiasi", "asosiasi", "ASOSIASI"),
    jenis: find("Jenis", "jenis", "JENIS") || "Rumah Tapak",
    kabupaten,
    kecamatan,
    kelurahan: find("Kelurahan", "kelurahan", "KELURAHAN"),
    totalUnit: isNaN(totalUnit) ? 0 : totalUnit,
    unitKomersil: isNaN(unitKomersil) ? 0 : unitKomersil,
    status: find("Status", "status", "STATUS") || "Aktif",
    catatan: find("Catatan", "catatan", "CATATAN"),
    tahun: tahunRaw ? parseInt(tahunRaw, 10) : undefined,
    source,
    importBatch: batch,
  };
}

function staticToEntry(p: PerumahanEntry): KompetitorEntry {
  return { ...p, id: `static-${p.nama}-${p.kabupaten}-${p.kecamatan}`, source: "static" };
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nama Perumahan", "Pengembang", "Asosiasi", "Jenis", "Kabupaten", "Kecamatan", "Kelurahan", "Total Unit", "Unit Komersil", "Status", "Tahun", "Catatan"],
    ["CONTOH PERUMAHAN INDAH", "PT CONTOH DEVELOPER", "REI", "Rumah Tapak", "KAB GOWA", "Pattallasang", "Sunggumanai", "120", "0", "Aktif", "2026", ""],
  ]);
  ws["!cols"] = [20, 30, 10, 12, 20, 18, 18, 10, 12, 10, 8, 20].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kompetitor");
  XLSX.writeFile(wb, "template_kompetitor_sulsel.xlsx");
}

function exportData(entries: KompetitorEntry[]) {
  const rows = entries.map(e => ({
    "Nama Perumahan": e.nama,
    "Pengembang": e.pengembang,
    "Asosiasi": e.asosiasi ?? "",
    "Jenis": e.jenis,
    "Kabupaten": e.kabupaten,
    "Kecamatan": e.kecamatan,
    "Kelurahan": e.kelurahan ?? "",
    "Total Unit": e.totalUnit,
    "Unit Komersil": e.unitKomersil ?? 0,
    "Status": e.status ?? "Aktif",
    "Tahun": e.tahun ?? "",
    "Catatan": e.catatan ?? "",
    "Sumber": e.source === "static" ? "Data Dasar" : e.source === "import" ? "Import Excel" : "Manual",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [20, 30, 10, 12, 20, 18, 18, 10, 12, 10, 8, 20, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kompetitor");
  const now = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `data_kompetitor_sulsel_${now}.xlsx`);
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

const BLANK: Omit<KompetitorEntry, "id" | "source"> = {
  nama: "", pengembang: "", asosiasi: "", jenis: "Rumah Tapak",
  kabupaten: "", kecamatan: "", kelurahan: "",
  totalUnit: 0, unitKomersil: 0, status: "Aktif", tahun: new Date().getFullYear(), catatan: "",
};

function AddModal({ initial, onSave, onClose }: {
  initial?: KompetitorEntry | null;
  onSave: (e: KompetitorEntry) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<KompetitorEntry, "id" | "source">>(initial ?? BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nama.trim()) e.nama = "Wajib diisi";
    if (!form.kabupaten.trim()) e.kabupaten = "Wajib diisi";
    if (!form.kecamatan.trim()) e.kecamatan = "Wajib diisi";
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, id: initial?.id ?? crypto.randomUUID(), source: "manual" });
  }

  const Field = ({ label, field, type = "text", placeholder = "" }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        value={String((form as Record<string, unknown>)[field] ?? "")}
        onChange={e => set(field, type === "number" ? (parseInt(e.target.value, 10) || 0) : e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30",
          errors[field] ? "border-red-400" : "border-border"
        )}
      />
      {errors[field] && <p className="text-[10px] text-red-500 mt-0.5">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <h2 className="text-sm font-semibold">{initial ? "Edit Kompetitor" : "Tambah Kompetitor"}</h2>
            <p className="text-[11px] text-muted-foreground">Data disimpan di browser (manual)</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          <div className="col-span-2"><Field label="Nama Perumahan *" field="nama" placeholder="PERUMAHAN INDAH SEJAHTERA" /></div>
          <div className="col-span-2"><Field label="Pengembang" field="pengembang" placeholder="PT DEVELOPER MAJU" /></div>
          <Field label="Kabupaten / Kota *" field="kabupaten" placeholder="KAB GOWA" />
          <Field label="Kecamatan *" field="kecamatan" placeholder="Pattallasang" />
          <Field label="Kelurahan / Desa" field="kelurahan" placeholder="Sunggumanai" />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Jenis</label>
            <select value={form.jenis} onChange={e => set("jenis", e.target.value)}
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30 border-border">
              <option>Rumah Tapak</option><option>Rusun</option><option>Apartemen</option><option>Ruko</option>
            </select>
          </div>
          <Field label="Asosiasi" field="asosiasi" placeholder="REI / HIMPERRA / PI" />
          <Field label="Total Unit" field="totalUnit" type="number" />
          <Field label="Unit Komersil" field="unitKomersil" type="number" />
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
            <select value={form.status ?? "Aktif"} onChange={e => set("status", e.target.value)}
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30 border-border">
              <option>Aktif</option><option>Selesai</option><option>Ditangguhkan</option>
            </select>
          </div>
          <Field label="Tahun Data" field="tahun" type="number" placeholder={String(new Date().getFullYear())} />
          <div className="col-span-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Catatan</label>
            <textarea value={form.catatan ?? ""} onChange={e => set("catatan", e.target.value)} rows={2}
              placeholder="Catatan tambahan..."
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">Batal</button>
          <button onClick={submit} className="px-4 py-1.5 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
            {initial ? "Simpan Perubahan" : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ onImported, onClose }: {
  onImported: (entries: KompetitorEntry[], meta: ImportMeta) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsed, setParsed] = useState<KompetitorEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [label, setLabel] = useState(`Import ${new Date().getFullYear()}`);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const batch = crypto.randomUUID();
        let skip = 0;
        const entries: KompetitorEntry[] = [];
        for (const row of rows) {
          const e = toEntry(row, "import", batch);
          if (e) { if (tahun) e.tahun = tahun; entries.push(e); }
          else skip++;
        }
        setParsed(entries);
        setSkipped(skip);
        setStep("preview");
      } catch {
        alert("Gagal membaca file. Pastikan format Excel (.xlsx) atau CSV.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFile(files: FileList | null) {
    if (!files?.length) return;
    parseFile(files[0]);
  }

  function confirm() {
    const meta: ImportMeta = { date: new Date().toISOString(), count: parsed.length, tahun, label };
    onImported(parsed, meta);
    setStep("done");
  }

  const kabCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of parsed) { m[e.kabupaten] = (m[e.kabupaten] ?? 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [parsed]);

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <h2 className="text-sm font-semibold">Import Data Kompetitor dari Excel</h2>
            <p className="text-[11px] text-muted-foreground">
              {step === "upload" && "Upload file .xlsx atau .csv"}
              {step === "preview" && `${parsed.length} entri valid, ${skipped} dilewati`}
              {step === "done" && "Import berhasil"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors"><X className="size-4" /></button>
        </div>

        {step === "upload" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Tahun Data</label>
                <input type="number" value={tahun} onChange={e => { setTahun(parseInt(e.target.value,10)); setLabel(`Import ${e.target.value}`); }}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Label Import</label>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="contoh: Data REI 2026"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">Mode Import</label>
              <div className="flex gap-2">
                {(["replace", "merge"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn("flex-1 text-xs px-3 py-2 rounded-lg border transition-colors",
                      mode === m ? "bg-foreground text-background border-foreground" : "hover:bg-muted border-border"
                    )}>
                    <div className="font-medium">{m === "replace" ? "Ganti (Replace)" : "Gabung (Merge)"}</div>
                    <div className={cn("text-[10px] mt-0.5", mode === m ? "text-background/70" : "text-muted-foreground")}>
                      {m === "replace" ? "Data import menggantikan data lama" : "Data import ditambahkan ke data yang ada"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragOver ? "border-foreground bg-muted" : "border-border hover:border-foreground/40 hover:bg-muted/30"
              )}
            >
              <FileSpreadsheet className="size-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Klik atau drag & drop file Excel di sini</p>
              <p className="text-[11px] text-muted-foreground mt-1">Format: .xlsx, .xls, .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files)} />
            </div>
            <div className="flex items-center gap-2 justify-between">
              <p className="text-[11px] text-muted-foreground">Butuh template kolom yang benar?</p>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                <Download className="size-3.5" /> Download Template
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-center">
                <div className="text-xl font-bold text-emerald-700">{parsed.length}</div>
                <div className="text-[10px] text-emerald-600">Entri Valid</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-center">
                <div className="text-xl font-bold text-amber-700">{skipped}</div>
                <div className="text-[10px] text-amber-600">Dilewati</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-center">
                <div className="text-xl font-bold text-blue-700">{kabCounts.length}</div>
                <div className="text-[10px] text-blue-600">Kabupaten/Kota</div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Distribusi per Kabupaten</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {kabCounts.map(([kab, count]) => (
                  <div key={kab} className="flex items-center gap-2 text-[11px]">
                    <span className="flex-1 truncate">{kab}</span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${(count / parsed.length) * 100}%` }} />
                    </div>
                    <span className="text-muted-foreground w-8 text-right font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Pratinjau (5 pertama)</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left font-medium">Nama</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">Kabupaten</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">Kecamatan</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 5).map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2.5 py-1.5 font-medium truncate max-w-[180px]">{e.nama}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{e.kabupaten}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{e.kecamatan}</td>
                        <td className="px-2.5 py-1.5 text-right">{(e.totalUnit||0)+(e.unitKomersil||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {mode === "replace" && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">Mode Ganti: data import ini akan menggantikan data import sebelumnya. Data manual yang ditambahkan tetap ada.</p>
              </div>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="p-10 text-center">
            <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Check className="size-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium">Import Berhasil</p>
            <p className="text-[11px] text-muted-foreground mt-1">{parsed.length} entri kompetitor berhasil disimpan</p>
          </div>
        )}

        <div className="flex justify-between gap-2 px-5 py-3 border-t">
          {step === "preview" && (
            <button onClick={() => setStep("upload")} className="px-4 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">Kembali</button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">
              {step === "done" ? "Tutup" : "Batal"}
            </button>
            {step === "preview" && (
              <button onClick={confirm}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
                <Check className="size-3.5" /> Konfirmasi Import
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KompetitorPage() {
  const [manualEntries, setManualEntries] = useState<KompetitorEntry[]>(loadManual);
  const [importedEntries, setImportedEntries] = useState<KompetitorEntry[]>(loadImported);
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(loadImportMeta);

  const [search, setSearch] = useState("");
  const [filterKab, setFilterKab] = useState<string>("");
  const [filterJenis, setFilterJenis] = useState<string>("");
  const [expandedKab, setExpandedKab] = useState<Set<string>>(new Set());
  const [expandedKec, setExpandedKec] = useState<Set<string>>(new Set());

  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<KompetitorEntry | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Merged dataset: imported replaces static when available
  const baseEntries: KompetitorEntry[] = useMemo(
    () => importedEntries.length > 0 ? importedEntries : DAFTAR_PERUMAHAN_SULSEL.map(staticToEntry),
    [importedEntries]
  );

  const allEntries = useMemo(() => [...baseEntries, ...manualEntries], [baseEntries, manualEntries]);

  // Unique kabupaten/jenis lists
  const kabList = useMemo(() => [...new Set(allEntries.map(e => e.kabupaten))].sort(), [allEntries]);
  const jenisList = useMemo(() => [...new Set(allEntries.map(e => e.jenis).filter(Boolean))].sort(), [allEntries]);

  // Filtered entries
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allEntries.filter(e => {
      if (filterKab && normalizeKab(e.kabupaten) !== normalizeKab(filterKab)) return false;
      if (filterJenis && e.jenis !== filterJenis) return false;
      if (q) {
        return e.nama.toLowerCase().includes(q)
          || e.pengembang.toLowerCase().includes(q)
          || e.kecamatan.toLowerCase().includes(q)
          || e.kelurahan?.toLowerCase().includes(q)
          || e.kabupaten.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allEntries, search, filterKab, filterJenis]);

  // Grouped by kabupaten → kecamatan
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, KompetitorEntry[]>>();
    for (const e of filtered) {
      if (!m.has(e.kabupaten)) m.set(e.kabupaten, new Map());
      const kecMap = m.get(e.kabupaten)!;
      if (!kecMap.has(e.kecamatan)) kecMap.set(e.kecamatan, []);
      kecMap.get(e.kecamatan)!.push(e);
    }
    return Array.from(m.entries())
      .sort((a, b) => {
        const ta = Array.from(a[1].values()).flat().length;
        const tb = Array.from(b[1].values()).flat().length;
        return tb - ta;
      })
      .map(([kab, kecMap]) => ({
        kab,
        kecList: Array.from(kecMap.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([kec, entries]) => ({ kec, entries })),
        total: Array.from(kecMap.values()).flat().length,
        totalUnit: Array.from(kecMap.values()).flat().reduce((s, e) => s + (e.totalUnit ?? 0) + (e.unitKomersil ?? 0), 0),
      }));
  }, [filtered]);

  function toggleKab(kab: string) {
    setExpandedKab(prev => { const n = new Set(prev); n.has(kab) ? n.delete(kab) : n.add(kab); return n; });
  }
  function toggleKec(key: string) {
    setExpandedKec(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function handleSaveManual(e: KompetitorEntry) {
    setManualEntries(prev => {
      const idx = prev.findIndex(x => x.id === e.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), e, ...prev.slice(idx + 1)] : [...prev, e];
      saveManual(next);
      return next;
    });
    setShowAdd(false);
    setEditEntry(null);
  }

  function handleDeleteManual(id: string) {
    if (!confirm("Hapus entri ini?")) return;
    setManualEntries(prev => { const next = prev.filter(e => e.id !== id); saveManual(next); return next; });
  }

  function handleImported(entries: KompetitorEntry[], meta: ImportMeta) {
    const merged = entries; // mode = replace for now (could be merged based on state from ImportModal but we pass replace as default)
    saveImported(merged, meta);
    setImportedEntries(merged);
    setImportMeta(meta);
    setTimeout(() => setShowImport(false), 1500);
  }

  function handleClearImport() {
    if (!confirm("Hapus data import? Data akan kembali ke data dasar bawaan.")) return;
    clearImported();
    setImportedEntries([]);
    setImportMeta(null);
  }

  const totalUnit = filtered.reduce((s, e) => s + (e.totalUnit ?? 0) + (e.unitKomersil ?? 0), 0);
  const manualCount = filtered.filter(e => e.source === "manual").length;
  const importCount = filtered.filter(e => e.source === "import").length;

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-end gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
            <Download className="size-3.5" /> Template
          </button>
          <button onClick={() => exportData(filtered)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
            <FileSpreadsheet className="size-3.5" /> Export Excel
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            <Upload className="size-3.5" /> Import Excel
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
            <Plus className="size-3.5" /> Tambah Manual
          </button>
        </div>
      </div>

      {/* ── Data Source Banner ── */}
      {importMeta ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <Database className="size-4 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-blue-800">{importMeta.label}</span>
            <span className="text-[11px] text-blue-600 ml-2">
              {importMeta.count} entri · Diimport {new Date(importMeta.date).toLocaleDateString("id-ID")}
              {importMeta.tahun && ` · Tahun ${importMeta.tahun}`}
            </span>
          </div>
          <button onClick={handleClearImport}
            className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-red-600 transition-colors">
            <RefreshCw className="size-3" /> Reset ke Data Dasar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-muted/40 border rounded-xl px-4 py-2.5">
          <Database className="size-4 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground flex-1">
            Menggunakan <strong>data dasar bawaan</strong> ({DAFTAR_PERUMAHAN_SULSEL.length} entri, Juni 2026).
            Import Excel untuk memperbarui ke data terbaru (2027, dst).
          </p>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Perumahan", value: filtered.length.toLocaleString("id"), sub: `dari ${allEntries.length} total` },
          { label: "Total Unit", value: totalUnit.toLocaleString("id"), sub: "unit (tapak + komersil)" },
          { label: "Kabupaten/Kota", value: grouped.length, sub: "wilayah" },
          { label: "Manual / Import", value: `${manualCount} / ${importCount > 0 ? importCount : (importedEntries.length > 0 ? importedEntries.length : "data dasar")}`, sub: "entri tambahan" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card border rounded-xl px-4 py-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-xl font-bold mt-0.5">{value}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, pengembang, kecamatan..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground" />
          <select value={filterKab} onChange={e => setFilterKab(e.target.value)}
            className="text-sm rounded-lg border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/30 max-w-48">
            <option value="">Semua Kabupaten</option>
            {kabList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
            className="text-sm rounded-lg border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/30">
            <option value="">Semua Jenis</option>
            {jenisList.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          {(filterKab || filterJenis || search) && (
            <button onClick={() => { setFilterKab(""); setFilterJenis(""); setSearch(""); }}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border hover:bg-muted transition-colors">
              Reset
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setExpandedKab(new Set(grouped.map(g => g.kab)))}
            className="text-[11px] px-2.5 py-1 rounded border hover:bg-muted transition-colors">Buka Semua</button>
          <button onClick={() => { setExpandedKab(new Set()); setExpandedKec(new Set()); }}
            className="text-[11px] px-2.5 py-1 rounded border hover:bg-muted transition-colors">Tutup Semua</button>
        </div>
      </div>

      {/* ── Grouped List ── */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Building2 className="size-8 opacity-30" />
            <p className="text-sm">Tidak ada data yang cocok</p>
          </div>
        )}
        {grouped.map(({ kab, kecList, total, totalUnit: kabTotal }) => {
          const isExpanded = expandedKab.has(kab);
          return (
            <div key={kab} className="border rounded-xl overflow-hidden">
              {/* Kabupaten Header */}
              <button
                onClick={() => toggleKab(kab)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{kab}</span>
                  <span className="text-[11px] text-muted-foreground ml-2">{kecList.length} kecamatan</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold">{total}</div>
                    <div className="text-[9px] text-muted-foreground">perumahan</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{kabTotal.toLocaleString("id")}</div>
                    <div className="text-[9px] text-muted-foreground">unit</div>
                  </div>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${Math.min(100, (total / (filtered.length || 1)) * 100 * 3)}%` }} />
                  </div>
                </div>
              </button>

              {/* Kecamatan Children */}
              {isExpanded && (
                <div className="border-t divide-y">
                  {kecList.map(({ kec, entries }) => {
                    const kecKey = `${kab}::${kec}`;
                    const kecExpanded = expandedKec.has(kecKey);
                    const kecUnit = entries.reduce((s, e) => s + (e.totalUnit ?? 0) + (e.unitKomersil ?? 0), 0);
                    return (
                      <div key={kec}>
                        <button onClick={() => toggleKec(kecKey)}
                          className="w-full flex items-center gap-3 px-5 py-2 hover:bg-muted/30 transition-colors text-left bg-muted/10">
                          {kecExpanded ? <ChevronDown className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />}
                          <span className="text-[12px] font-medium flex-1">Kec. {kec}</span>
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                            <span><strong className="text-foreground">{entries.length}</strong> perumahan</span>
                            <span><strong className="text-foreground">{kecUnit.toLocaleString("id")}</strong> unit</span>
                          </div>
                        </button>

                        {kecExpanded && (
                          <div className="border-t">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-muted/20">
                                  <th className="px-5 pl-9 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Nama Perumahan</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Pengembang</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Kelurahan</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Jenis</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-right">Unit</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Status</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground text-left">Sumber</th>
                                  <th className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {entries.map((e) => {
                                  const ownProject = isOwnCompany(e.pengembang);
                                  return (
                                  <tr key={e.id} className={cn("hover:bg-muted/20 transition-colors group", ownProject && "bg-blue-50/50")}>
                                    <td className="px-5 pl-9 py-1.5 text-[11px] font-medium max-w-[220px]">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{e.nama}</span>
                                        {ownProject && (
                                          <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Sendiri</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-muted-foreground max-w-[180px] truncate">{e.pengembang}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-muted-foreground">{e.kelurahan ?? "-"}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-muted-foreground">{e.jenis}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-right font-medium">
                                      {((e.totalUnit ?? 0) + (e.unitKomersil ?? 0)).toLocaleString("id")}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                                        e.status === "Aktif" ? "bg-emerald-100 text-emerald-700"
                                          : e.status === "Selesai" ? "bg-blue-100 text-blue-700"
                                          : "bg-muted text-muted-foreground"
                                      )}>{e.status ?? "Aktif"}</span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium",
                                        e.source === "manual" ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : e.source === "import" ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-muted text-muted-foreground border-border"
                                      )}>
                                        {e.source === "manual" ? "Manual" : e.source === "import" ? "Import" : "Dasar"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                      {e.source === "manual" && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => setEditEntry(e)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors">
                                            <BarChart2 className="size-3" />
                                          </button>
                                          <button onClick={() => handleDeleteManual(e.id)} className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors">
                                            <Trash2 className="size-3" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {(showAdd || editEntry) && (
        <AddModal
          initial={editEntry}
          onSave={handleSaveManual}
          onClose={() => { setShowAdd(false); setEditEntry(null); }}
        />
      )}
      {showImport && (
        <ImportModal onImported={handleImported} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
