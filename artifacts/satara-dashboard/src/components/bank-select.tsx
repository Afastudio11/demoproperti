import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function BankSelect({ value, onChange, className, required, disabled }: BankSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const qc = useQueryClient();

  const { data: banks = [] } = useQuery<{ id: number; name: string; code: string }[]>({
    queryKey: ["banks"],
    queryFn: () => fetch("/api/administrasi/banks").then(r => r.json()),
  });

  const createBank = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/administrasi/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then(r => r.json()),
    onSuccess: (bank) => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      onChange(bank.name);
      setShowModal(false);
      setNewBankName("");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "__tambah_bank__") {
      setShowModal(true);
    } else {
      onChange(e.target.value);
    }
  };

  const selectCls = cn(
    "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring",
    className
  );

  return (
    <>
      <select
        className={selectCls}
        value={value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
      >
        <option value="">-- Pilih Bank --</option>
        {banks.map(b => (
          <option key={b.id} value={b.name}>{b.name}</option>
        ))}
        <option value="__tambah_bank__">+ Tambah Bank Baru...</option>
      </select>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border rounded-xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Tambah Bank Baru</h3>
              <button onClick={() => { setShowModal(false); setNewBankName(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Bank</label>
            <input
              autoFocus
              className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring mb-4"
              placeholder="contoh: Bank Muamalat, BPR Sulsel..."
              value={newBankName}
              onChange={e => setNewBankName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newBankName.trim()) createBank.mutate(newBankName.trim()); }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setNewBankName(""); }}
                className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!newBankName.trim() || createBank.isPending}
                onClick={() => createBank.mutate(newBankName.trim())}
                className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                {createBank.isPending ? "Menyimpan..." : "Simpan Bank"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
