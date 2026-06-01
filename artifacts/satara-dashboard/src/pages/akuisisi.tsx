import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListLandProspects } from "@workspace/api-client-react";

export default function Akuisisi() {
  const { data: prospects } = useListLandProspects({});
  const stages = [
    "prospek_baru", "survey", "analisis_kompetitor", "negosiasi", "legal_checking", "pks_mou", "ditolak"
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Akuisisi Lahan</h1>
        <p className="text-sm text-muted-foreground">Pipeline prospek lahan dan feasibility analysis</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const columnProspects = prospects?.filter(p => p.status === stage) || [];
          return (
            <div key={stage} className="w-80 flex-shrink-0 flex flex-col bg-muted/50 rounded-xl border p-3">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-sm capitalize">{stage.replace('_', ' ')}</h3>
                <span className="text-xs font-medium bg-background border px-2 py-0.5 rounded-full">
                  {columnProspects.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnProspects.map(prospect => (
                  <Card key={prospect.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="font-medium text-sm mb-1">{prospect.lokasi}</div>
                      <div className="text-xs text-muted-foreground mb-3">{prospect.luas} m² • Rp{prospect.hargaM2.toLocaleString('id-ID')}/m²</div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-medium text-emerald-600">ROI: {prospect.roi}%</div>
                        <div className={`w-2 h-2 rounded-full ${
                          prospect.riskLevel === 'red' ? 'bg-red-500' : 
                          prospect.riskLevel === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
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
