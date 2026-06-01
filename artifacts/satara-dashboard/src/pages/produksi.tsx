import { useGetConstructionProgressSummary, useListQcDefects, useListMaterials } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function Produksi() {
  const { data: progress } = useGetConstructionProgressSummary({});
  const { data: defects } = useListQcDefects({});
  const { data: materials } = useListMaterials({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produksi & Konstruksi</h1>
        <p className="text-sm text-muted-foreground">Progress pembangunan, QC, dan stok material</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Material Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {materials?.filter(m => m.isBelowMinimum).map(material => (
                <div key={material.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{material.item}</div>
                    <div className="text-xs text-muted-foreground">Vendor: {material.vendor || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-destructive">{material.stok} {material.satuan}</div>
                    <div className="text-xs text-muted-foreground">Min: {material.minimumStock}</div>
                  </div>
                </div>
              ))}
              {!materials?.filter(m => m.isBelowMinimum).length && (
                <div className="text-center py-4 text-muted-foreground">Semua stok aman.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QC & Defect Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {defects?.map(defect => (
                <div key={defect.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">{defect.deskripsi}</div>
                    <div className="text-xs text-muted-foreground">Kategori: {defect.kategori} | Unit: {defect.unitId}</div>
                  </div>
                  <Badge variant={
                    defect.status === 'open' ? 'destructive' : 
                    defect.status === 'in_repair' ? 'secondary' : 'default'
                  }>
                    {defect.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {!defects?.length && (
                <div className="text-center py-4 text-muted-foreground">Tidak ada defect tercatat.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
