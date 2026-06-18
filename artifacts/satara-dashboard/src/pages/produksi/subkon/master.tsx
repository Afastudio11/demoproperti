import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2 } from "lucide-react";

type SubkonMaster = {
  id: number;
  name: string;
  picName: string | null;
  phone: string | null;
  status: string;
  defaultValuePerUnit: number;
  defaultRetentionPerUnit: number;
  defaultMaintenanceMonths: number;
  contractCount: number;
  activeContractCount: number;
};

const emptyForm = {
  name: "",
  picName: "",
  phone: "",
  defaultValuePerUnit: 0,
  defaultRetentionPerUnit: 500000,
  defaultMaintenanceMonths: 3,
};

export default function SubkonMasterPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [] } = useQuery({
    queryKey: ["subkon-master", "all"],
    queryFn: async () => {
      const res = await fetch("/api/produksi/subkon/master");
      return res.json() as Promise<SubkonMaster[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/produksi/subkon/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan subkon");
      return data;
    },
    onSuccess: async () => {
      setForm(emptyForm);
      await qc.invalidateQueries({ queryKey: ["subkon-master"] });
      toast({ title: "Master subkon tersimpan" });
    },
    onError: err => toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/produksi/subkon/master/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.status === 409) {
        return { archived: true, message: data.error };
      }
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus subkon");
      return { archived: false };
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["subkon-master"] });
      if (result.archived) {
        toast({ title: "Subkon diarsipkan", description: "Subkon sudah dipakai, status diubah menjadi Inactive agar histori tetap aman." });
      } else {
        toast({ title: "Subkon dihapus" });
      }
    },
    onError: err => toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" }),
  });

  async function updateRow(id: number, patch: Partial<SubkonMaster>) {
    const res = await fetch(`/api/produksi/subkon/master/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Gagal update subkon", description: data.error ?? "Coba ulangi.", variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["subkon-master"] });
    toast({ title: "Master subkon diperbarui" });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Master Subkon</h1>
        <p className="text-sm text-muted-foreground">Satu data subkon untuk rencana, kontrak, unit, material, dan QC. Harga per unit otomatis terbawa saat subkon dipilih di Perencanaan.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs">Nama Subkon</Label>
              <Input className="h-8 text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="CV / mandor / subkon..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PIC</Label>
              <Input className="h-8 text-sm" value={form.picName} onChange={e => setForm(p => ({ ...p, picName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telepon</Label>
              <Input className="h-8 text-sm" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Harga per Unit (Rp)</Label>
              <NumericInput className="h-8 text-sm" value={form.defaultValuePerUnit} onChange={v => setForm(p => ({ ...p, defaultValuePerUnit: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Retensi per Unit (Rp)</Label>
              <NumericInput className="h-8 text-sm" value={form.defaultRetentionPerUnit} onChange={v => setForm(p => ({ ...p, defaultRetentionPerUnit: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Maintenance (bulan)</Label>
              <NumericInput className="h-8 text-sm" value={form.defaultMaintenanceMonths} onChange={v => setForm(p => ({ ...p, defaultMaintenanceMonths: Math.round(v) }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="h-8 gap-1.5" onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>
              <Plus className="size-3.5" /> Tambah Subkon
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              {["Subkon", "PIC", "Telepon", "Harga/Unit", "Retensi/Unit", "Maintenance", "Kontrak", "Status", ""].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.picName || "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.phone || "-"}</td>
                <td className="px-3 py-2 text-xs font-medium text-emerald-600">Rp {row.defaultValuePerUnit.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-xs text-amber-600">Rp {row.defaultRetentionPerUnit.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-xs">{row.defaultMaintenanceMonths} bln</td>
                <td className="px-3 py-2 text-xs">{row.activeContractCount}/{row.contractCount} aktif</td>
                <td className="px-3 py-2">
                  <Select value={row.status} onValueChange={status => updateRow(row.id, { status })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateRow(row.id, { name: row.name })}>
                      <Save className="size-3" /> Sync
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleteMutation.isPending}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus {row.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {row.contractCount > 0
                              ? `Subkon ini punya ${row.contractCount} kontrak. Tidak bisa dihapus permanen — status akan diubah menjadi Inactive agar histori tetap aman.`
                              : "Subkon belum dipakai dan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(row.id)}
                          >
                            {row.contractCount > 0 ? "Arsipkan" : "Hapus"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
