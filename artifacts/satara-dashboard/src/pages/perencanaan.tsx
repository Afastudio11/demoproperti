import { useListFeasibilityStudies } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Perencanaan() {
  const { data: studies } = useListFeasibilityStudies({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perencanaan</h1>
        <p className="text-sm text-muted-foreground">Feasibility study dan kalkulasi ROI</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {studies?.map(study => (
          <Card key={study.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Project ID: {study.projectId}</CardTitle>
              <Badge variant={study.isApproved ? 'default' : 'secondary'}>
                {study.isApproved ? 'Approved' : 'Draft'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">HPP</div>
                  <div className="font-semibold text-lg">Rp{study.hpp.toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Projected ROI</div>
                  <div className="font-semibold text-lg text-emerald-600">{study.roi}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Margin</div>
                  <div className="font-semibold text-lg">{study.margin}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">BEP</div>
                  <div className="font-semibold text-lg">{study.bep} Bulan</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
