import { useListLeads, useGetMarketingKpi } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Marketing() {
  const { data: leads } = useListLeads({});
  const { data: kpi } = useGetMarketingKpi({});

  const stages = [
    "lead_masuk", "qualified", "survey", "booking", "berkas_kpr", "akad", "batal"
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Pipeline</h1>
        <p className="text-sm text-muted-foreground">Lead tracker dan marketing KPI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.totalLeads ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cost per Lead (CPL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp{(kpi?.cpl ?? 0).toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.conversionRate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Booking to Akad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.bookingToAkadRate ?? 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const columnLeads = leads?.filter(l => l.status === stage) || [];
          return (
            <div key={stage} className="w-80 flex-shrink-0 flex flex-col bg-muted/50 rounded-xl border p-3">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-sm capitalize">{stage.replace('_', ' ')}</h3>
                <span className="text-xs font-medium bg-background border px-2 py-0.5 rounded-full">
                  {columnLeads.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="font-medium text-sm mb-1">{lead.nama}</div>
                      <div className="text-xs text-muted-foreground mb-3">{lead.kontak}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="px-2 py-1 bg-secondary rounded-full">{lead.source.replace('_', ' ')}</span>
                        {lead.assignedTo && <span className="text-muted-foreground">{lead.assignedTo}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
