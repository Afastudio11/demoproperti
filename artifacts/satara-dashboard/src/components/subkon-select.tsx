import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type SubkonMasterOption = {
  id: number;
  name: string;
  normalizedName: string;
  type: string;
  picName: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  defaultRetentionPerUnit: number;
  defaultMaintenanceMonths: number;
  contractCount: number;
  activeContractCount: number;
  projectIds: number[];
};

type SubkonSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  projectId?: string | number | null;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
  valueMode?: "name" | "id";
  allowCreate?: boolean;
  onOptionChange?: (option: SubkonMasterOption | null) => void;
};

export function useSubkonOptions(projectId?: string | number | null) {
  const normalizedProjectId = projectId ? String(projectId) : "";

  return useQuery({
    queryKey: ["subkon-master", normalizedProjectId || "all"],
    queryFn: async () => {
      const params = normalizedProjectId ? `?projectId=${encodeURIComponent(normalizedProjectId)}` : "";
      const res = await fetch(`/api/produksi/subkon/master${params}`);
      if (!res.ok) throw new Error("Failed to load subkon master");
      return res.json() as Promise<SubkonMasterOption[]>;
    },
  });
}

export default function SubkonSelect({
  value,
  onValueChange,
  projectId,
  placeholder = "Pilih subkon...",
  triggerClassName,
  disabled,
  valueMode = "name",
  allowCreate = false,
  onOptionChange,
}: SubkonSelectProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: options = [], isLoading } = useSubkonOptions(projectId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function createSubkon() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    const res = await fetch("/api/produksi/subkon/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    const row = await res.json();
    if (!res.ok) {
      toast({ title: "Gagal menambah subkon", description: row.error ?? "Coba ulangi lagi.", variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["subkon-master"] });
    onValueChange(valueMode === "id" ? String(row.id) : row.name);
    onOptionChange?.(row);
    setName("");
    setOpen(false);
    toast({ title: "Subkon masuk master", description: row.name });
  }

  const selectValue = (option: SubkonMasterOption) => valueMode === "id" ? String(option.id) : option.name;

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value}
        onValueChange={(next) => {
          onValueChange(next);
          onOptionChange?.(options.find(option => selectValue(option) === next) ?? null);
        }}
        disabled={disabled || isLoading || options.length === 0}
      >
        <SelectTrigger className={cn("h-8 text-sm", triggerClassName)}>
          <SelectValue placeholder={isLoading ? "Memuat subkon..." : options.length === 0 ? "Belum ada master subkon" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.filter(option => option.status !== "inactive").map((option) => (
            <SelectItem key={option.id} value={selectValue(option)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowCreate && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" disabled={disabled}>
              <Plus className="size-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">Tambah Master Subkon</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input className="h-8 text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Nama subkon..." />
              <Button type="button" size="sm" className="w-full h-8" onClick={createSubkon}>Simpan Subkon</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
