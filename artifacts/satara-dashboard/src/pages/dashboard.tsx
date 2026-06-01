import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useGetDashboardSummary, 
  useGetDashboardKpi, 
  useGetDashboardAlerts,
  useGetDashboardCashflow 
} from "@workspace/api-client-react";
import IndonesiaMap from "@/components/indonesia-map";
import { AlertCircle, TrendingUp, Users, Building, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: kpi } = useGetDashboardKpi();
  const { data: alerts } = useGetDashboardAlerts();
  const { data: cashflow } = useGetDashboardCashflow();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Proyek</CardTitle>
            <Building className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProjects ?? "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active tracking in pipeline
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalLeads ?? "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.overallProgress ? `${summary.overallProgress}%` : "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Construction completion
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Projects at Risk</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{summary?.projectsAtRisk ?? 0}</div>
            <p className="text-xs text-red-600/80 mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Peta Proyek Nasional</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <IndonesiaMap />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk & Escalation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      alert.level === 'red' ? 'bg-red-500' : 
                      alert.level === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{alert.projectName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cashflow Forecast</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              {cashflow?.forecast && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflow.forecast}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
