import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListProjects } from "@workspace/api-client-react";
import { Search, Plus, MapPin, Layers } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const FASE_COLORS: Record<string, string> = {
  LAND: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  PLAN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  LEGAL: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  SELL: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BUILD: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  AKAD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  HANDOVER: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  SCALE: "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const [search, setSearch] = useState("");

  const filtered = projects?.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Daftar Proyek
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola seluruh proyek Satara Development
          </p>
        </div>
        <Button className="h-9 gap-1.5 bg-foreground hover:bg-foreground/90 text-background border border-border/50">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Proyek Baru</span>
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-card p-2.5 rounded-lg border">
        <Search className="size-4 text-muted-foreground ml-1 shrink-0" />
        <Input
          placeholder="Cari proyek..."
          className="border-0 bg-transparent ring-offset-0 focus-visible:ring-0 h-7 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((project) => (
            <div
              key={project.id}
              className="bg-card text-card-foreground rounded-xl border p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-sm leading-tight hover:underline line-clamp-1"
                  >
                    {project.nama}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {project.lokasi}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                    FASE_COLORS[project.fase] ?? "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {project.fase}
                </span>
              </div>

              <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Total Unit</div>
                    <div className="font-medium flex items-center gap-1">
                      <Layers className="size-3" />
                      {project.totalUnit}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Status</div>
                    <div className="font-medium capitalize">{project.status}</div>
                  </div>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full mt-3 h-7 text-xs bg-muted/50 border-border/50"
              >
                <Link href={`/projects/${project.id}`}>Detail Proyek</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
