import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function useCategoryOptions(type: string, defaults: string[]) {
  const qc = useQueryClient();

  const { data: custom = [] } = useQuery<{ id: number; label: string }[]>({
    queryKey: ["categories", type],
    queryFn: () =>
      fetch(`/api/categories?type=${encodeURIComponent(type)}`).then((r) =>
        r.json()
      ),
  });

  const all = custom.length > 0 ? custom.map((c) => c.label) : defaults;

  const addMut = useMutation({
    mutationFn: (label: string) =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, label }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", type] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) =>
        r.json()
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", type] }),
  });

  return { all, addMut, removeMut, custom };
}

interface AddInlineProps {
  onSave: (label: string) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

function AddInline({ onSave, onCancel, isPending }: AddInlineProps) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <input
        ref={ref}
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) onSave(val.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Nama kategori baru..."
        className="flex-1 border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-background"
      />
      <button
        onClick={() => val.trim() && onSave(val.trim())}
        disabled={!val.trim() || isPending}
        className="p-1.5 rounded-md bg-foreground text-background disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Check className="size-3" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 rounded-md border hover:bg-muted transition-colors"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

interface CategorySelectProps {
  type: string;
  defaults: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function CategorySelect({
  type,
  defaults,
  value,
  onChange,
  className,
  placeholder,
}: CategorySelectProps) {
  const [adding, setAdding] = useState(false);
  const { all, addMut } = useCategoryOptions(type, defaults);

  async function handleSave(label: string) {
    await addMut.mutateAsync(label);
    onChange(label);
    setAdding(false);
  }

  return (
    <div>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === "__add__") {
            setAdding(true);
          } else {
            onChange(e.target.value);
          }
        }}
        className={cn(
          "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background",
          className
        )}
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {value && !all.includes(value) && (
          <option key={`__current__${value}`} value={value}>{value}</option>
        )}
        {all.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option disabled>──────────</option>
        <option value="__add__">＋ Tambah kategori baru...</option>
      </select>
      {adding && (
        <AddInline
          onSave={handleSave}
          onCancel={() => setAdding(false)}
          isPending={addMut.isPending}
        />
      )}
    </div>
  );
}

interface CategorySelectShadcnProps {
  type: string;
  defaults: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}

export function CategorySelectShadcn({
  type,
  defaults,
  value,
  onValueChange,
  placeholder,
  triggerClassName,
}: CategorySelectShadcnProps) {
  const [adding, setAdding] = useState(false);
  const { all, addMut } = useCategoryOptions(type, defaults);

  async function handleSave(label: string) {
    await addMut.mutateAsync(label);
    onValueChange(label);
    setAdding(false);
  }

  return (
    <div>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === "__add__") {
            setAdding(true);
          } else {
            onValueChange(v);
          }
        }}
      >
        <SelectTrigger className={cn("h-8 text-sm", triggerClassName)}>
          <SelectValue placeholder={placeholder ?? "Pilih..."} />
        </SelectTrigger>
        <SelectContent>
          {all.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="__add__" className="text-muted-foreground text-xs">
            ＋ Tambah kategori baru...
          </SelectItem>
        </SelectContent>
      </Select>
      {adding && (
        <AddInline
          onSave={handleSave}
          onCancel={() => setAdding(false)}
          isPending={addMut.isPending}
        />
      )}
    </div>
  );
}
