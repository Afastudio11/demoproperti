import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

type Proof = {
  verified: boolean;
  status: string;
  docId: string;
  projectName: string;
  subkonName: string;
  stageCode: string | null;
  terminNumber: number | null;
  paymentType: string;
  amount: number;
  paymentDate: string | null;
  progressPrevious: number;
  progressCurrent: number;
  notes: string | null;
};

export default function PublicPaymentProof() {
  const [location] = useLocation();
  const token = location.split("/").pop() ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-payment-proof", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/payment-proof/${token}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Bukti pembayaran tidak ditemukan");
      return body as Proof;
    },
    retry: false,
  });

  const statusIcon = data?.verified
    ? <CheckCircle2 className="size-8 text-emerald-600" />
    : data?.status === "rejected"
      ? <XCircle className="size-8 text-red-600" />
      : <Clock className="size-8 text-amber-600" />;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg overflow-hidden">
        <div className="bg-black text-white px-6 py-5">
          <div className="text-xs uppercase tracking-wider opacity-70">Satara Development</div>
          <h1 className="text-xl font-bold mt-1">Verifikasi Bukti Pembayaran</h1>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-slate-500">Memuat bukti pembayaran...</div>
        ) : error ? (
          <div className="p-8">
            <XCircle className="size-8 text-red-600 mb-3" />
            <div className="font-semibold">Bukti tidak bisa dibuka</div>
            <p className="text-sm text-slate-500 mt-1">{(error as Error).message}</p>
          </div>
        ) : data ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div>
                <div className="text-lg font-bold">{data.verified ? "Terverifikasi Dibayar" : "Belum Dibayar"}</div>
                <div className="text-xs text-slate-500">Status: {data.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3 col-span-2">
                <div className="text-xs text-slate-500">Nomor Dokumen</div>
                <div className="font-semibold">{data.docId}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Proyek</div>
                <div className="font-semibold">{data.projectName}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Subkon</div>
                <div className="font-semibold">{data.subkonName}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Termin</div>
                <div className="font-semibold">T{data.terminNumber ?? "-"} {data.paymentType === "retensi" ? "(Retensi)" : ""}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Tanggal Bayar</div>
                <div className="font-semibold">{data.paymentDate ?? "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 col-span-2">
                <div className="text-xs text-slate-500">Jumlah Dibayar</div>
                <div className="text-2xl font-bold">{fmtRp(data.amount)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 col-span-2">
                <div className="text-xs text-slate-500">Progress Pekerjaan Saat Pengajuan</div>
                <div className="font-semibold">{data.progressPrevious}% {"->"} {data.progressCurrent}%</div>
              </div>
            </div>

            {data.notes && <div className="text-xs text-slate-500 border-t pt-4">{data.notes}</div>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
