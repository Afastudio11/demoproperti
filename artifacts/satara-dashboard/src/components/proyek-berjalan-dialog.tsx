import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Circle, Plus, Trash2,
  Building2, Layers, Scale, ClipboardList, Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitRow {
  blok: string;
  tipe: string;
  harga: string;
  jumlah: string;
  status: string;
  progress: string;
}

interface LegalDoc {
  tipeDokumen: string;
  label: string;
  status: string;
  pic: string;
  expiry: string;
  catatan: string;
}

interface FormData {
  nama: string;
  lokasi: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  luas: string;
  totalUnit: string;
  fase: string;
  status: string;
  targetStart: string;
  targetEnd: string;
  lat: string;
  lng: string;
  nilaiProyek: string;
  modalTerpakai: string;
  unitTerjual: string;
  progresKonstruksi: string;
  deskripsiKondisi: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FASE_OPTIONS = [
  { value: "LAND",     label: "LAND — Akuisisi Lahan" },
  { value: "PLAN",     label: "PLAN — Perencanaan" },
  { value: "LEGAL",    label: "LEGAL — Perizinan" },
  { value: "SELL",     label: "SELL — Penjualan" },
  { value: "BUILD",    label: "BUILD — Konstruksi" },
  { value: "AKAD",     label: "AKAD — Akad Kredit" },
  { value: "HANDOVER", label: "HANDOVER — Serah Terima" },
  { value: "SCALE",    label: "SCALE — Ekspansi" },
];

const STATUS_OPTIONS = [
  { value: "active",   label: "Aktif" },
  { value: "paused",   label: "Ditunda" },
  { value: "done",     label: "Selesai" },
];

const UNIT_TIPE_OPTIONS = [
  "Rumah Tapak 21/60",
  "Rumah Tapak 36/72",
  "Rumah Tapak 45/90",
  "Rumah Tapak 54/105",
  "Rumah Tapak 72/120",
  "Ruko",
  "Kavling Komersil",
  "Kav. Siap Bangun",
  "Lainnya",
];

const UNIT_STATUS_OPTIONS = [
  { value: "available",    label: "Tersedia" },
  { value: "booked",       label: "Booked" },
  { value: "kpr",          label: "Proses KPR" },
  { value: "akad",         label: "Akad" },
  { value: "serah_terima", label: "Serah Terima" },
];

const LEGAL_DOC_TEMPLATES: { tipeDokumen: string; label: string }[] = [
  { tipeDokumen: "SHM",         label: "SHM / Sertifikat Hak Milik" },
  { tipeDokumen: "AJB",         label: "AJB — Akta Jual Beli" },
  { tipeDokumen: "balik_nama",  label: "Balik Nama Sertifikat" },
  { tipeDokumen: "split",       label: "Pecah / Split Sertifikat" },
  { tipeDokumen: "PBG",         label: "PBG — Persetujuan Bangunan Gedung" },
  { tipeDokumen: "SLF",         label: "SLF — Sertifikat Laik Fungsi" },
  { tipeDokumen: "PKKPR",       label: "PKKPR / Kesesuaian Tata Ruang" },
  { tipeDokumen: "SPPL",        label: "SPPL / UKL-UPL / AMDAL" },
  { tipeDokumen: "PBB",         label: "PBB Lunas (Pajak Bumi & Bangunan)" },
  { tipeDokumen: "bank_ready",  label: "Bank Ready / Bankable" },
  { tipeDokumen: "sikumbang",   label: "Terdaftar di SIKUMBANG" },
  { tipeDokumen: "lainnya",     label: "Dokumen Lainnya" },
];

const LEGAL_STATUS_OPTIONS = [
  { value: "pending",     label: "Belum Ada" },
  { value: "in_progress", label: "Sedang Proses" },
  { value: "approved",    label: "Sudah Terbit" },
  { value: "expired",     label: "Kadaluarsa" },
];

const STEPS = [
  { id: 1, label: "Info Dasar",    icon: Building2 },
  { id: 2, label: "Kondisi",       icon: ClipboardList },
  { id: 3, label: "Unit",          icon: Layers },
  { id: 4, label: "Legal",         icon: Scale },
  { id: 5, label: "Review",        icon: Eye },
];

const DEFAULT_FORM: FormData = {
  nama: "", lokasi: "", provinsi: "Sulawesi Selatan",
  kabupaten: "", kecamatan: "", desa: "",
  luas: "", totalUnit: "", fase: "BUILD", status: "active",
  targetStart: "", targetEnd: "", lat: "", lng: "",
  nilaiProyek: "", modalTerpakai: "", unitTerjual: "",
  progresKonstruksi: "", deskripsiKondisi: "",
};

// ─── Helper: format Rupiah ────────────────────────────────────────────────────

function fmtRp(val: string) {
  const n = parseFloat(val);
  if (!val || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function genBlokLabel(idx: number) {
  return String.fromCharCode(65 + (idx % 26));
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "size-8 rounded-full flex items-center justify-center border-2 transition-all text-[11px] font-bold",
                done ? "bg-emerald-500 border-emerald-500 text-white"
                  : active ? "bg-foreground border-foreground text-background"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {done ? <CheckCircle2 className="size-4" /> : s.id}
              </div>
              <span className={cn("text-[9px] font-medium whitespace-nowrap",
                active ? "text-foreground" : "text-muted-foreground"
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-1 mb-4 transition-all",
                current > s.id ? "bg-emerald-400" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ─── Step 1: Info Dasar ───────────────────────────────────────────────────────

function Step1({ form, onChange, errors }: {
  form: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg px-3 py-2.5 text-[11px] text-muted-foreground">
        Isi data dasar proyek yang sedang berjalan. Semua field bertanda * wajib diisi.
      </div>

      <Field label="Nama Proyek" required error={errors.nama}>
        <Input
          placeholder="cth: Perumahan Griya Sejahtera"
          value={form.nama}
          onChange={e => onChange("nama", e.target.value)}
        />
      </Field>

      <Field label="Lokasi / Alamat" required error={errors.lokasi}>
        <Input
          placeholder="cth: Jl. Poros Bantaeng KM 12"
          value={form.lokasi}
          onChange={e => onChange("lokasi", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kabupaten / Kota">
          <Input placeholder="cth: Bantaeng" value={form.kabupaten} onChange={e => onChange("kabupaten", e.target.value)} />
        </Field>
        <Field label="Kecamatan">
          <Input placeholder="cth: Bantaeng" value={form.kecamatan} onChange={e => onChange("kecamatan", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Desa / Kelurahan">
          <Input placeholder="cth: Onto" value={form.desa} onChange={e => onChange("desa", e.target.value)} />
        </Field>
        <Field label="Luas Lahan (m²)">
          <Input type="number" min={0} placeholder="cth: 15000" value={form.luas} onChange={e => onChange("luas", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total Unit" required error={errors.totalUnit}>
          <Input type="number" min={1} placeholder="cth: 100" value={form.totalUnit} onChange={e => onChange("totalUnit", e.target.value)} />
        </Field>
        <Field label="Fase Saat Ini" required>
          <Select value={form.fase} onValueChange={v => onChange("fase", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FASE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status Proyek">
          <Select value={form.status} onValueChange={v => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target Mulai">
          <Input type="date" value={form.targetStart} onChange={e => onChange("targetStart", e.target.value)} />
        </Field>
        <Field label="Target Selesai">
          <Input type="date" value={form.targetEnd} onChange={e => onChange("targetEnd", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude (GPS)">
          <Input type="number" step="any" placeholder="cth: -5.5123" value={form.lat} onChange={e => onChange("lat", e.target.value)} />
        </Field>
        <Field label="Longitude (GPS)">
          <Input type="number" step="any" placeholder="cth: 119.8234" value={form.lng} onChange={e => onChange("lng", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 2: Kondisi & Progres ────────────────────────────────────────────────

function Step2({ form, onChange }: {
  form: FormData;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  const faseProg: { fase: string; done: boolean }[] = FASE_OPTIONS.map(o => ({
    fase: o.label,
    done: FASE_OPTIONS.findIndex(x => x.value === form.fase) >= FASE_OPTIONS.findIndex(x => x.value === o.value),
  }));

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg px-3 py-2.5 text-[11px] text-muted-foreground">
        Catat kondisi dan progres proyek saat ini. Data ini akan tampil di Executive Overview dan monitoring.
      </div>

      {/* Progress per fase */}
      <div>
        <Label className="text-xs font-medium mb-2 block">Fase yang Sudah Dilalui</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {FASE_OPTIONS.map(o => {
            const idx = FASE_OPTIONS.findIndex(x => x.value === o.value);
            const currentIdx = FASE_OPTIONS.findIndex(x => x.value === form.fase);
            const done = idx < currentIdx;
            const current = idx === currentIdx;
            return (
              <div key={o.value} className={cn(
                "border rounded-lg px-2 py-1.5 text-center text-[10px] font-medium",
                done ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : current ? "bg-foreground text-background border-foreground"
                  : "bg-muted/30 text-muted-foreground border-border"
              )}>
                {done && <CheckCircle2 className="size-3 mx-auto mb-0.5" />}
                {current && <Circle className="size-3 mx-auto mb-0.5 fill-current opacity-50" />}
                {o.value}
              </div>
            );
          })}
        </div>
      </div>

      {/* Finansial */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nilai Proyek (Rp)">
          <CurrencyInput
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="cth: 5000000000"
            value={form.nilaiProyek}
            onChange={raw => onChange("nilaiProyek", raw)}
          />
        </Field>
        <Field label="Modal Terpakai (Rp)">
          <CurrencyInput
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            placeholder="cth: 2000000000"
            value={form.modalTerpakai}
            onChange={raw => onChange("modalTerpakai", raw)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit Terjual / Booked">
          <Input
            type="number" min={0}
            placeholder="cth: 45"
            value={form.unitTerjual}
            onChange={e => onChange("unitTerjual", e.target.value)}
          />
          {form.unitTerjual && form.totalUnit && (
            <p className="text-[10px] text-muted-foreground">
              {Math.round((parseInt(form.unitTerjual) / parseInt(form.totalUnit)) * 100)}% dari total
            </p>
          )}
        </Field>
        <Field label="Progres Konstruksi (%)">
          <Input
            type="number" min={0} max={100}
            placeholder="cth: 65"
            value={form.progresKonstruksi}
            onChange={e => onChange("progresKonstruksi", e.target.value)}
          />
          {form.progresKonstruksi && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${form.progresKonstruksi}%` }} />
            </div>
          )}
        </Field>
      </div>

      <Field label="Deskripsi Kondisi Proyek">
        <Textarea
          placeholder="Contoh: Konstruksi cluster A sudah 80%, cluster B sedang proses pondasi. Marketing sudah buka 60 unit, 42 terjual..."
          value={form.deskripsiKondisi}
          onChange={e => onChange("deskripsiKondisi", e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
      </Field>
    </div>
  );
}

// ─── Step 3: Unit ─────────────────────────────────────────────────────────────

function Step3({ units, onUnitsChange, totalUnit }: {
  units: UnitRow[];
  onUnitsChange: (u: UnitRow[]) => void;
  totalUnit: string;
}) {
  const totalPlanned = units.reduce((s, r) => s + (parseInt(r.jumlah) || 0), 0);
  const totalTarget = parseInt(totalUnit) || 0;

  function addRow() {
    onUnitsChange([...units, {
      blok: genBlokLabel(units.length),
      tipe: "Rumah Tapak 36/72",
      harga: "",
      jumlah: "",
      status: "available",
      progress: "0",
    }]);
  }

  function removeRow(i: number) {
    onUnitsChange(units.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, key: keyof UnitRow, val: string) {
    const next = [...units];
    next[i] = { ...next[i], [key]: val };
    onUnitsChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-muted/30 border rounded-lg px-3 py-2 text-[11px] text-muted-foreground flex-1 mr-3">
          Definisikan tipe unit per blok. Sistem akan generate unit satu per satu saat disimpan.
          Total direncanakan: <span className={cn("font-bold", totalPlanned === totalTarget ? "text-emerald-600" : "text-amber-600")}>
            {totalPlanned}
          </span> / target <span className="font-bold">{totalTarget}</span> unit.
        </div>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 shrink-0">
          <Plus className="size-3.5" />Tambah Baris
        </Button>
      </div>

      {/* Progress bar */}
      {totalTarget > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", totalPlanned <= totalTarget ? "bg-blue-500" : "bg-red-500")}
              style={{ width: `${Math.min(100, (totalPlanned / totalTarget) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="border border-dashed rounded-xl py-10 text-center text-[12px] text-muted-foreground">
          <Layers className="size-8 mx-auto mb-2 opacity-30" />
          <p>Belum ada baris unit. Klik "Tambah Baris" untuk mulai.</p>
          <p className="text-[10px] mt-1 text-muted-foreground/70">Langkah ini opsional — bisa diisi nanti di modul Produksi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_80px_80px_32px] gap-2 px-1">
            {["Blok", "Tipe Rumah", "Harga/Unit (Rp)", "Status", "Jml", "Progress%", ""].map(h => (
              <div key={h} className="text-[10px] font-semibold text-muted-foreground">{h}</div>
            ))}
          </div>
          {units.map((row, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_80px_80px_32px] gap-2 items-center bg-muted/20 border rounded-lg px-2 py-2">
              <Input
                value={row.blok}
                onChange={e => updateRow(i, "blok", e.target.value)}
                className="h-7 text-xs"
                placeholder="A"
              />
              <Select value={row.tipe} onValueChange={v => updateRow(i, "tipe", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TIPE_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number" min={0}
                value={row.harga}
                onChange={e => updateRow(i, "harga", e.target.value)}
                className="h-7 text-xs"
                placeholder="150000000"
              />
              <Select value={row.status} onValueChange={v => updateRow(i, "status", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number" min={1}
                value={row.jumlah}
                onChange={e => updateRow(i, "jumlah", e.target.value)}
                className="h-7 text-xs"
                placeholder="20"
              />
              <Input
                type="number" min={0} max={100}
                value={row.progress}
                onChange={e => updateRow(i, "progress", e.target.value)}
                className="h-7 text-xs"
                placeholder="0"
              />
              <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {units.length > 0 && (
        <div className="bg-muted/20 border rounded-lg px-3 py-2 grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="text-muted-foreground text-[10px]">Total Unit Direncanakan</div>
            <div className="font-bold text-sm">{totalPlanned.toLocaleString("id-ID")}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px]">Estimasi Nilai</div>
            <div className="font-bold text-sm">
              {fmtRp(String(units.reduce((s, r) => s + (parseFloat(r.harga) || 0) * (parseInt(r.jumlah) || 0), 0)))}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px]">Jumlah Baris</div>
            <div className="font-bold text-sm">{units.length} tipe</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Legal ────────────────────────────────────────────────────────────

function Step4({ docs, onDocsChange }: {
  docs: LegalDoc[];
  onDocsChange: (d: LegalDoc[]) => void;
}) {
  function toggle(tipe: string) {
    const exists = docs.find(d => d.tipeDokumen === tipe);
    if (exists) {
      onDocsChange(docs.filter(d => d.tipeDokumen !== tipe));
    } else {
      const tmpl = LEGAL_DOC_TEMPLATES.find(t => t.tipeDokumen === tipe)!;
      onDocsChange([...docs, { tipeDokumen: tipe, label: tmpl.label, status: "pending", pic: "", expiry: "", catatan: "" }]);
    }
  }

  function updateDoc(tipe: string, key: keyof LegalDoc, val: string) {
    onDocsChange(docs.map(d => d.tipeDokumen === tipe ? { ...d, [key]: val } : d));
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg px-3 py-2.5 text-[11px] text-muted-foreground">
        Centang dokumen yang relevan, lalu isi statusnya. Dokumen yang tidak ada di proyek ini bisa dilewati.
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LEGAL_DOC_TEMPLATES.map(tmpl => {
          const active = docs.find(d => d.tipeDokumen === tmpl.tipeDokumen);
          return (
            <button
              key={tmpl.tipeDokumen}
              onClick={() => toggle(tmpl.tipeDokumen)}
              className={cn(
                "flex items-center gap-2 border rounded-lg px-3 py-2 text-left transition-all",
                active ? "border-foreground/40 bg-foreground/5" : "border-border hover:border-foreground/20"
              )}
            >
              <div className={cn(
                "size-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                active ? "border-foreground bg-foreground" : "border-muted-foreground/50"
              )}>
                {active && <CheckCircle2 className="size-3 text-background" />}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold">{tmpl.tipeDokumen}</div>
                <div className="text-[9px] text-muted-foreground truncate">{tmpl.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {docs.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Detail Dokumen Terpilih</div>
          {docs.map(doc => (
            <div key={doc.tipeDokumen} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">{doc.label}</span>
                <Select value={doc.status} onValueChange={v => updateDoc(doc.tipeDokumen, "status", v)}>
                  <SelectTrigger className="h-6 w-32 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEGAL_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px]">PIC / Penanggung Jawab</Label>
                  <Input
                    value={doc.pic}
                    onChange={e => updateDoc(doc.tipeDokumen, "pic", e.target.value)}
                    className="h-6 text-[11px]"
                    placeholder="Nama PIC"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px]">Tanggal Terbit / Exp.</Label>
                  <Input
                    type="date"
                    value={doc.expiry}
                    onChange={e => updateDoc(doc.tipeDokumen, "expiry", e.target.value)}
                    className="h-6 text-[11px]"
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px]">Catatan</Label>
                <Input
                  value={doc.catatan}
                  onChange={e => updateDoc(doc.tipeDokumen, "catatan", e.target.value)}
                  className="h-6 text-[11px]"
                  placeholder="Nomor surat, instansi, catatan penting..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function Step5({ form, units, docs }: {
  form: FormData; units: UnitRow[]; docs: LegalDoc[];
}) {
  const totalUnitPlanned = units.reduce((s, r) => s + (parseInt(r.jumlah) || 0), 0);
  const estimasiNilai = units.reduce((s, r) => s + (parseFloat(r.harga) || 0) * (parseInt(r.jumlah) || 0), 0);
  const docApproved = docs.filter(d => d.status === "approved").length;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[11px] text-emerald-800">
        Tinjau data sebelum disimpan. Setelah disimpan, proyek akan muncul di semua modul dashboard.
      </div>

      {/* Info dasar */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-3 py-2 border-b">
          <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Info Dasar</div>
        </div>
        <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {[
            { l: "Nama Proyek", v: form.nama },
            { l: "Fase", v: form.fase },
            { l: "Lokasi", v: form.lokasi },
            { l: "Status", v: form.status },
            { l: "Kabupaten", v: form.kabupaten || "—" },
            { l: "Kecamatan", v: form.kecamatan || "—" },
            { l: "Total Unit", v: `${form.totalUnit} unit` },
            { l: "Luas Lahan", v: form.luas ? `${parseInt(form.luas).toLocaleString("id-ID")} m²` : "—" },
            { l: "Target Mulai", v: form.targetStart || "—" },
            { l: "Target Selesai", v: form.targetEnd || "—" },
          ].map(({ l, v }) => (
            <div key={l} className="flex items-start justify-between gap-2 text-[11px] py-0.5 border-b border-border/20 last:border-0">
              <span className="text-muted-foreground shrink-0">{l}</span>
              <span className="font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kondisi */}
      {(form.nilaiProyek || form.unitTerjual || form.progresKonstruksi) && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 border-b">
            <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Kondisi Proyek</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              { l: "Nilai Proyek", v: fmtRp(form.nilaiProyek) },
              { l: "Modal Terpakai", v: fmtRp(form.modalTerpakai) },
              { l: "Unit Terjual", v: form.unitTerjual ? `${form.unitTerjual} unit` : "—" },
              { l: "Progres Konstruksi", v: form.progresKonstruksi ? `${form.progresKonstruksi}%` : "—" },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-start justify-between gap-2 text-[11px] py-0.5 border-b border-border/20 last:border-0">
                <span className="text-muted-foreground shrink-0">{l}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-xl p-3 text-center">
          <div className="text-2xl font-black">{totalUnitPlanned}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Unit akan dibuat</div>
          {totalUnitPlanned > 0 && <div className="text-[10px] text-muted-foreground/70">{units.length} tipe / {units.length} blok</div>}
        </div>
        <div className="border rounded-xl p-3 text-center">
          <div className="text-2xl font-black">{docs.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Dokumen Legal</div>
          {docApproved > 0 && <div className="text-[10px] text-emerald-600">{docApproved} sudah terbit</div>}
        </div>
        <div className="border rounded-xl p-3 text-center">
          <div className="text-lg font-black">{estimasiNilai > 0 ? fmtRp(String(estimasiNilai)) : "—"}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Estimasi Revenue</div>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 border-b">
            <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Dokumen Legal</div>
          </div>
          <div className="divide-y">
            {docs.map(d => (
              <div key={d.tipeDokumen} className="px-3 py-2 flex items-center justify-between text-[11px]">
                <span className="font-medium">{d.tipeDokumen}</span>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border",
                  d.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : d.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200"
                  : d.status === "expired" ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-muted text-muted-foreground border-border"
                )}>
                  {LEGAL_STATUS_OPTIONS.find(s => s.value === d.status)?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface ProyekBerjalanDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function ProyekBerjalanDialog({ open, onOpenChange, onSuccess }: ProyekBerjalanDialogProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function onChange(k: keyof FormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.nama.trim()) e.nama = "Nama proyek wajib diisi";
      if (!form.lokasi.trim()) e.lokasi = "Lokasi wajib diisi";
      if (!form.totalUnit || isNaN(parseInt(form.totalUnit)) || parseInt(form.totalUnit) < 1)
        e.totalUnit = "Total unit harus angka ≥ 1";
    }
    return e;
  }

  function handleNext() {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(s => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep(s => s - 1);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    try {
      const projectPayload: Record<string, unknown> = {
        nama: form.nama.trim(),
        lokasi: form.lokasi.trim(),
        totalUnit: parseInt(form.totalUnit),
        fase: form.fase,
        status: form.status,
      };
      if (form.provinsi.trim()) projectPayload.provinsi = form.provinsi.trim();
      if (form.kabupaten.trim()) projectPayload.kabupaten = form.kabupaten.trim();
      if (form.kecamatan.trim()) projectPayload.kecamatan = form.kecamatan.trim();
      if (form.desa.trim()) projectPayload.desa = form.desa.trim();
      if (form.luas && !isNaN(parseFloat(form.luas))) projectPayload.luas = parseFloat(form.luas);
      if (form.targetStart) projectPayload.targetStart = form.targetStart;
      if (form.targetEnd) projectPayload.targetEnd = form.targetEnd;
      if (form.lat && !isNaN(parseFloat(form.lat))) projectPayload.lat = parseFloat(form.lat);
      if (form.lng && !isNaN(parseFloat(form.lng))) projectPayload.lng = parseFloat(form.lng);

      const projRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
      });
      if (!projRes.ok) throw new Error("Gagal menyimpan proyek");
      const project = await projRes.json() as { id: number };

      // Save units
      for (const row of units) {
        const jumlah = parseInt(row.jumlah) || 0;
        const harga = parseFloat(row.harga) || 0;
        const progress = parseFloat(row.progress) || 0;
        for (let n = 1; n <= jumlah; n++) {
          await fetch("/api/units", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              blok: row.blok,
              nomor: String(n),
              tipe: row.tipe,
              harga,
              status: row.status,
              progress,
            }),
          });
        }
      }

      // Save legal docs
      for (const doc of docs) {
        await fetch("/api/legal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            tipeDokumen: doc.tipeDokumen,
            status: doc.status,
            pic: doc.pic || undefined,
            expiry: doc.expiry || undefined,
            catatan: doc.catatan || undefined,
          }),
        });
      }

      onSuccess();
      onOpenChange(false);
      resetState();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function resetState() {
    setStep(1);
    setForm(DEFAULT_FORM);
    setUnits([]);
    setDocs([]);
    setErrors({});
    setSaveError(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetState();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Input Proyek Berjalan</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Masukkan data proyek yang sudah berjalan — data, unit, dan dokumen legal sekaligus.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <StepIndicator current={step} />

          {step === 1 && <Step1 form={form} onChange={onChange} errors={errors} />}
          {step === 2 && <Step2 form={form} onChange={onChange} />}
          {step === 3 && <Step3 units={units} onUnitsChange={setUnits} totalUnit={form.totalUnit} />}
          {step === 4 && <Step4 docs={docs} onDocsChange={setDocs} />}
          {step === 5 && <Step5 form={form} units={units} docs={docs} />}

          {saveError && (
            <div className="mt-4 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {saveError}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="size-4" />Kembali
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>Batal</Button>
            {step < 5 ? (
              <Button onClick={handleNext} className="gap-1.5 bg-foreground hover:bg-foreground/90 text-background">
                Lanjut <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "Menyimpan..." : "Simpan Semua Data"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
