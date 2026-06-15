import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save } from "lucide-react";

type SubkonMaster = {
  id: number;
  name: string;
  picName: string | null;
  phone: string | null;
  status: string;
  defaultRetentionPerUnit: number;
  defaultMaintenanceMonths: number;
  contractCount: number;
  activeContractCount: number;
};

const emptyForm = {
  name: "",
  picName: "",
  phone: "",
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
        <p className="text-sm text-muted-foreground">Satu data subkon untuk rencana, kontrak, unit, material, dan QC.</p>
      </div>

      <Card>
        <CardContent className="p-4 grid md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5 md:col-span-2">
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
          <Button className="h-8 gap-1.5" onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>
            <Plus className="size-3.5" /> Tambah
          </Button>
          <div className="space-y-1.5">
            <Label className="text-xs">Default Retensi/Unit</Label>
            <NumericInput className="h-8 text-sm" value={form.defaultRetentionPerUnit} onChange={v => setForm(p => ({ ...p, defaultRetentionPerUnit: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Default Maintenance (bulan)</Label>
            <NumericInput className="h-8 text-sm" value={form.defaultMaintenanceMonths} onChange={v => setForm(p => ({ ...p, defaultMaintenanceMonths: Math.round(v) }))} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              {["Subkon", "PIC", "Telepon", "Default", "Kontrak", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.picName || "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.phone || "-"}</td>
                <td className="px-3 py-2 text-xs">Rp {row.defaultRetentionPerUnit.toLocaleString("id-ID")} · {row.defaultMaintenanceMonths} bln</td>
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
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateRow(row.id, { name: row.name })}>
                    <Save className="size-3" /> Sync
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
