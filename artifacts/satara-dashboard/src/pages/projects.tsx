import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListProjects } from "@workspace/api-client-react";
import { Search, Filter, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Proyek</h1>
          <p className="text-muted-foreground text-sm">Kelola seluruh proyek Satara Development</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Proyek Baru
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-3 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari proyek..." className="pl-9 bg-transparent border-0 ring-offset-0 focus-visible:ring-0" />
        </div>
        <div className="h-6 w-px bg-border"></div>
        <Button variant="ghost" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter Fase
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="text-muted-foreground">Loading projects...</div>
        ) : projects?.map((project) => (
          <Card key={project.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-1">
                  <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                    {project.nama}
                  </Link>
                </CardTitle>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{project.lokasi}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2 mb-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Fase</div>
                  <div className="font-medium">{project.fase}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Total Unit</div>
                  <div className="font-medium">{project.totalUnit} Unit</div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/projects/${project.id}`}>
                  Detail Proyek
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
