import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import BankSelect from "@/components/bank-select";
import { CurrencyInput } from "@/components/ui/currency-input";

const PEKERJAAN_OPTIONS = ["PNS/ASN", "P3K", "TNI/POLRI", "SPPG", "SPPI", "Karyawan Swasta", "Wiraswasta", "Guru", "Lain-lain"];
const PIPELINE_STATUSES = [
  { key: "MINAT", label: "Minat" }, { key: "PROSES_BERKAS", label: "Proses Berkas" },
  { key: "BERKAS_LENGKAP", label: "Berkas Lengkap" }, { key: "SETOR_BANK", label: "Setor Bank" },
  { key: "OTS", label: "OTS" }, { key: "REVISI", label: "Revisi" }, { key: "SP3K", label: "SP3K" },
  { key: "AKAD", label: "Akad" }, { key: "HT_CAIR", label: "HT Cair" },
  { key: "CASH", label: "Cash" }, { key: "DTBO", label: "DTBO" },
  { key: "BATAL", label: "Batal" }, { key: "BELUM_LAKU", label: "Belum Laku" },
  { key: "FOR_SALE", label: "For Sale" },
];
const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI", "TAHIR", "ARYA", "SHINTA", "ADMIN"];
const PAYMENT_OPTIONS = ["KPR", "CASH", "CASH_BERTAHAP"];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none";

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nama: "", nik: "", kontak: "", phone: "", pekerjaan: "",
    unitBlock: "", stageCode: "", projectId: "", referralSource: "", picAdmin: "",
    bank: "BRI", paymentType: "KPR", pipelineStatus: "MINAT",
    dpAmount: "", loanAmount: "", htAmount: "", unitPrice: "",
    bookingDate: "", akadDate: "", htDate: "",
    catatan: "", alternativeSolution: "", followUp: "",
  });
  const [loaded, setLoaded] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["administrasi-customer", id],
    queryFn: () => fetch(`/api/administrasi/customers/${id}`).then(r => r.json()),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  useEffect(() => {
    if (customer && !loaded && !customer.error) {
      setForm({
        nama: customer.nama ?? "",
        nik: customer.nik ?? "",
        kontak: customer.kontak ?? "",
        phone: customer.phone ?? "",
        pekerjaan: customer.pekerjaan ?? "",
        unitBlock: customer.unitBlock ?? "",
        stageCode: customer.stageCode ?? "",
        projectId: customer.projectId ? String(customer.projectId) : "",
        referralSource: customer.referralSource ?? "",
        picAdmin: customer.picAdmin ?? "",
        bank: customer.bank ?? "BRI",
        paymentType: customer.paymentType ?? "KPR",
        pipelineStatus: customer.pipelineStatus ?? "MINAT",
        dpAmount: customer.dpAmount ? String(customer.dpAmount) : "",
        loanAmount: customer.loanAmount ? String(customer.loanAmount) : "",
        htAmount: customer.htAmount ? String(customer.htAmount) : "",
        unitPrice: customer.unitPrice ? String(customer.unitPrice) : "",
        bookingDate: customer.bookingDate ?? "",
        akadDate: customer.akadDate ?? "",
        htDate: customer.htDate ?? "",
        catatan: customer.catatan ?? "",
        alternativeSolution: customer.alternativeSolution ?? "",
        followUp: customer.followUp ?? "",
      });
      setLoaded(true);
    }
  }, [customer, loaded]);

  const save = useMutation({
    mutationFn: (data: typeof form) => fetch(`/api/administrasi/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        projectId: data.projectId ? parseInt(data.projectId) : null,
        dpAmount: data.dpAmount || null,
        loanAmount: data.loanAmount || null,
        htAmount: data.htAmount || null,
        unitPrice: data.unitPrice || null,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["administrasi-customers"] });
      qc.invalidateQueries({ queryKey: ["administrasi-customer", id] });
      setLocation(`/administrasi/customer/${id}`);
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Memuat data customer...</div>;
  if (!customer || customer.error) return <div className="p-8 text-center text-sm text-muted-foreground">Customer tidak ditemukan.</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/administrasi/customer/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Kembali ke Detail
          </button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Customer: {customer.nama}</h1>
      </div>

      <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-5">

        <div className="bg-card border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Data Identitas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Customer" required><input className={inputCls} value={form.nama} onChange={set("nama")} required /></Field>
            <Field label="NIK"><input className={inputCls} value={form.nik} onChange={set("nik")} /></Field>
            <Field label="Nomor Telepon"><input className={inputCls} type="tel" value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Kontak / WhatsApp"><input className={inputCls} value={form.kontak} onChange={set("kontak")} /></Field>
            <Field label="Pekerjaan">
              <select className={selectCls} value={form.pekerjaan} onChange={set("pekerjaan")}>
                <option value="">-- Pilih --</option>
                {PEKERJAAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Proyek">
              <select className={selectCls} value={form.projectId} onChange={set("projectId")}>
                <option value="">-- Pilih Proyek --</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Tahap / Stage Code"><input className={inputCls} placeholder="T1, T2, T3..." value={form.stageCode} onChange={set("stageCode")} /></Field>
            <Field label="Blok / Nomor Unit"><input className={inputCls} placeholder="A.7, B.19, D1..." value={form.unitBlock} onChange={set("unitBlock")} /></Field>
            <Field label="Referensi (Nama Marketing)"><input className={inputCls} placeholder="UMMU, DINDA..." value={form.referralSource} onChange={set("referralSource")} /></Field>
            <Field label="PIC Admin">
              <select className={selectCls} value={form.picAdmin} onChange={set("picAdmin")}>
                <option value="">-- Pilih PIC --</option>
                {PIC_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Data Transaksi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jenis Pembayaran">
              <select className={selectCls} value={form.paymentType} onChange={set("paymentType")}>
                {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Bank KPR">
              <BankSelect value={form.bank} onChange={v => setForm(f => ({ ...f, bank: v }))} />
            </Field>
            <Field label="Harga Jual Unit (Rp)"><CurrencyInput className={inputCls} value={form.unitPrice} onChange={raw => setForm(f => ({ ...f, unitPrice: raw }))} /></Field>
            <Field label="Nilai DP (Rp)"><CurrencyInput className={inputCls} value={form.dpAmount} onChange={raw => setForm(f => ({ ...f, dpAmount: raw }))} /></Field>
            <Field label="Nilai Akad KPR (Rp)"><CurrencyInput className={inputCls} value={form.loanAmount} onChange={raw => setForm(f => ({ ...f, loanAmount: raw }))} /></Field>
            <Field label="Nilai HT (Rp)"><CurrencyInput className={inputCls} value={form.htAmount} onChange={raw => setForm(f => ({ ...f, htAmount: raw }))} /></Field>
            <Field label="Tanggal Booking"><input className={inputCls} type="date" value={form.bookingDate} onChange={set("bookingDate")} /></Field>
            <Field label="Tanggal Akad"><input className={inputCls} type="date" value={form.akadDate} onChange={set("akadDate")} /></Field>
            <Field label="Tanggal HT Cair"><input className={inputCls} type="date" value={form.htDate} onChange={set("htDate")} /></Field>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Status & Catatan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status Pipeline" required>
              <select className={selectCls} value={form.pipelineStatus} onChange={set("pipelineStatus")}>
                {PIPELINE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Masalah / Catatan">
            <textarea className={inputCls} rows={2} value={form.catatan} onChange={set("catatan")} />
          </Field>
          <Field label="Alternatif Solusi">
            <textarea className={inputCls} rows={2} value={form.alternativeSolution} onChange={set("alternativeSolution")} />
          </Field>
          <Field label="Tindak Lanjut">
            <textarea className={inputCls} rows={2} value={form.followUp} onChange={set("followUp")} />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/administrasi/customer/${id}`}>
            <button type="button" className="text-sm border rounded-md px-4 py-1.5 hover:bg-muted">Batal</button>
          </Link>
          <button type="submit" disabled={save.isPending} className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50">
            <Save className="size-3.5" />
            {save.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
