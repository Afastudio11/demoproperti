import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const CUSTOMER_FIELDS = [
  "nama", "kontak", "phone", "nik", "pekerjaan", "bank",
  "unitBlock", "pipelineStatus", "picAdmin", "bookingDate", "catatan",
];

const STATUS_OPTIONS = [
  "MINAT","PROSES_BERKAS","BERKAS_LENGKAP","SETOR_BANK",
  "OTS","REVISI","SP3K","AKAD","HT_CAIR","BATAL",
];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => line.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

export default function ImportPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [imported, setImported] = useState(false);
  const [projectId, setProjectId] = useState("1");

  function handleFile(file: File) {
    setFileName(file.name);
    setImported(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCSV(text);
        setParsed(parsed);
        const autoMap: Record<string, string> = {};
        parsed.headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes("nama")) autoMap["nama"] = h;
          else if (lower.includes("kontak") || lower.includes("hp") || lower.includes("phone")) autoMap["kontak"] = h;
          else if (lower.includes("bank")) autoMap["bank"] = h;
          else if (lower.includes("unit") || lower.includes("blok")) autoMap["unitBlock"] = h;
          else if (lower.includes("status")) autoMap["pipelineStatus"] = h;
          else if (lower.includes("pic") || lower.includes("admin")) autoMap["picAdmin"] = h;
        });
        setMapping(autoMap);
      } catch (e) {
        toast({ title: "File tidak dapat dibaca", description: "Pastikan format CSV yang benar", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }

  function buildPreview() {
    if (!parsed) return;
    const rows = parsed.rows.slice(0, 5).map(row => {
      const obj: any = {};
      CUSTOMER_FIELDS.forEach(field => {
        const colHeader = mapping[field];
        if (colHeader) {
          const idx = parsed.headers.indexOf(colHeader);
          if (idx >= 0) obj[field] = row[idx] ?? "";
        }
      });
      return obj;
    });
    setPreview(rows);
  }

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("Tidak ada data");
      const customers = parsed.rows.map(row => {
        const obj: any = { projectId: parseInt(projectId) };
        CUSTOMER_FIELDS.forEach(field => {
          const colHeader = mapping[field];
          if (colHeader) {
            const idx = parsed.headers.indexOf(colHeader);
            if (idx >= 0 && row[idx]) obj[field] = row[idx];
          }
        });
        if (!obj.nama) return null;
        if (!obj.pipelineStatus || !STATUS_OPTIONS.includes(obj.pipelineStatus)) obj.pipelineStatus = "MINAT";
        return obj;
      }).filter(Boolean);

      let success = 0, fail = 0;
      for (const customer of customers) {
        try {
          const r = await fetch("/api/customers", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(customer),
          });
          if (r.ok) success++; else fail++;
        } catch { fail++; }
      }
      return { success, fail };
    },
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: `Import selesai: ${result.success} berhasil, ${result.fail} gagal` });
      setImported(true);
    },
    onError: (e: any) => toast({ title: "Import gagal", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/administrasi/customer"><Button variant="ghost" size="sm" className="h-7"><ArrowLeft className="size-3.5 mr-1" />Kembali</Button></Link>
        <div>
          <h1 className="text-lg font-semibold">Import Data Customer</h1>
          <p className="text-xs text-muted-foreground">Upload file CSV untuk impor data customer secara massal</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">1. Upload File CSV</CardTitle></CardHeader>
        <CardContent>
          <div
            className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors",
              parsed ? "border-primary" : "border-muted-foreground/30")}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {parsed ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="size-8 text-primary" />
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">{parsed.rows.length} baris data, {parsed.headers.length} kolom</p>
                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setParsed(null); setFileName(""); setPreview([]); }}>
                  Ganti File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop atau klik untuk upload</p>
                <p className="text-xs text-muted-foreground">Format: CSV (comma-separated)</p>
              </div>
            )}
          </div>
          <div className="mt-3">
            <Label className="text-xs">Proyek yang akan diimport ke</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 text-xs mt-1 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Proyek 1</SelectItem>
                <SelectItem value="2">Proyek 2</SelectItem>
                <SelectItem value="3">Proyek 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">2. Mapping Kolom</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Cocokkan kolom dari file CSV ke field sistem Satara</p>
            <div className="grid grid-cols-2 gap-2">
              {CUSTOMER_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs w-28 shrink-0 text-muted-foreground capitalize">{field}</span>
                  <Select value={mapping[field] ?? "__none__"} onValueChange={v => setMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Tidak dipetakan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak dipetakan</SelectItem>
                      {parsed.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-3" variant="outline" onClick={buildPreview}>
              Preview Data
            </Button>
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">3. Preview (5 baris pertama)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {CUSTOMER_FIELDS.filter(f => mapping[f]).map(f => (
                      <th key={f} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={cn("border-b", !row.nama ? "bg-red-50/50" : "")}>
                      {CUSTOMER_FIELDS.filter(f => mapping[f]).map(f => (
                        <td key={f} className="px-3 py-2">{row[f] ?? "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {parsed && (
        <div className="flex items-center justify-between">
          {imported && (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle className="size-4" />Import berhasil diselesaikan
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setParsed(null); setFileName(""); setPreview([]); setImported(false); }}>Reset</Button>
            <Button size="sm" disabled={importMut.isPending || imported || !mapping.nama}
              onClick={() => importMut.mutate()}>
              {importMut.isPending ? "Mengimport..." : `Import ${parsed.rows.length} Data`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
