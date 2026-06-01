import { useParams } from "wouter";
import { useGetProject, useGetProjectHealth, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: health, isLoading: healthLoading } = useGetProjectHealth(projectId, {
    query: { enabled: !!projectId, queryKey: ["projectHealth", projectId] }
  });

  if (projectLoading || healthLoading) {
    return <div className="p-6">Loading project details...</div>;
  }

  if (!project) {
    return <div className="p-6 text-destructive">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.nama}</h1>
          <p className="text-sm text-muted-foreground">{project.lokasi}</p>
        </div>
        <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20">{project.fase}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status Risiko</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold uppercase tracking-wider ${
              health?.riskLevel === 'red' ? 'text-red-500' : 
              health?.riskLevel === 'yellow' ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {health?.riskLevel || 'UNKNOWN'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sales Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{health?.salesProgress ?? 0}%</div>
            <Progress value={health?.salesProgress ?? 0} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Construction Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{health?.constructionProgress ?? 0}%</div>
            <Progress value={health?.constructionProgress ?? 0} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Akad Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{health?.akadProgress ?? 0}%</div>
            <Progress value={health?.akadProgress ?? 0} className="h-2" />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Unit & Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Feature in development. Total units: {project.totalUnit}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
