import { useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date | null; to: Date | null };

const PRESETS = [
  { key: "all",     label: "Semua" },
  { key: "week",    label: "Minggu Ini" },
  { key: "month",   label: "Bulan Ini" },
  { key: "last",    label: "Bulan Lalu" },
  { key: "3m",      label: "3 Bulan" },
  { key: "6m",      label: "6 Bulan" },
  { key: "year",    label: "Tahun Ini" },
  { key: "custom",  label: "Custom" },
] as const;

type PresetKey = typeof PRESETS[number]["key"];

function computeRange(key: PresetKey): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const startOfDay = (dt: Date) => { const r = new Date(dt); r.setHours(0, 0, 0, 0); return r; };
  const endOfDay   = (dt: Date) => { const r = new Date(dt); r.setHours(23, 59, 59, 999); return r; };

  switch (key) {
    case "week": {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const mon = new Date(now); mon.setDate(d - dow);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: startOfDay(mon), to: endOfDay(sun) };
    }
    case "month":
      return { from: new Date(y, m, 1), to: endOfDay(new Date(y, m + 1, 0)) };
    case "last": {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      return { from: new Date(py, pm, 1), to: endOfDay(new Date(py, pm + 1, 0)) };
    }
    case "3m": {
      const from = new Date(y, m - 3, d);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "6m": {
      const from = new Date(y, m - 6, d);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "year":
      return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) };
    default:
      return { from: null, to: null };
  }
}

function fmtShort(d: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toInputVal(d: Date | null) {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

interface PeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<PresetKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isFiltered = value.from !== null || value.to !== null;

  const selectPreset = (key: PresetKey) => {
    setActiveKey(key);
    if (key !== "custom") {
      const range = computeRange(key);
      onChange(range);
      if (key !== "all") setOpen(false);
    }
  };

  const applyCustom = () => {
    onChange({
      from: customFrom ? new Date(customFrom + "T00:00:00") : null,
      to:   customTo   ? new Date(customTo   + "T23:59:59") : null,
    });
    setOpen(false);
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveKey("all");
    setCustomFrom("");
    setCustomTo("");
    onChange({ from: null, to: null });
  };

  const triggerLabel = (() => {
    if (!isFiltered) return "Semua Periode";
    const p = PRESETS.find(p => p.key === activeKey);
    if (activeKey === "custom") {
      const parts = [customFrom && fmtShort(new Date(customFrom)), customTo && fmtShort(new Date(customTo))].filter(Boolean);
      return parts.length ? parts.join(" — ") : "Custom";
    }
    return p?.label ?? "Periode";
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-normal",
            isFiltered && "border-primary text-primary",
            className,
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{triggerLabel}</span>
          {isFiltered ? (
            <X className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100" onClick={reset} />
          ) : (
            <ChevronDown className="h-3 w-3 ml-0.5 opacity-40" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pilih Periode</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPreset(p.key)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
                activeKey === p.key
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activeKey === "custom" && (
          <div className="space-y-2 pt-1 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dari</p>
              <Input
                type="date"
                className="h-7 text-xs"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sampai</p>
              <Input
                type="date"
                className="h-7 text-xs"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={applyCustom}>
              Terapkan
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function filterByPeriod<T extends { createdAt?: string; uploadedAt?: string; tanggalCair?: string | null }>(
  items: T[],
  range: DateRange,
  field: keyof T = "createdAt" as keyof T,
): T[] {
  if (!range.from && !range.to) return items;
  return items.filter(item => {
    const raw = item[field] as string | null | undefined;
    if (!raw) return false;
    const d = new Date(raw);
    if (range.from && d < range.from) return false;
    if (range.to   && d > range.to)   return false;
    return true;
  });
}
