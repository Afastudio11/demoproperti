import { useListHandovers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SerahTerima() {
  const { data: handovers } = useListHandovers({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Serah Terima</h1>
        <p className="text-sm text-muted-foreground">Daftar BAST dan customer satisfaction</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Handover List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Unit ID</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Status BAST</TableHead>
                <TableHead>Skor Kepuasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {handovers?.map(handover => (
                <TableRow key={handover.id}>
                  <TableCell className="font-medium">{new Date(handover.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{handover.unitId}</TableCell>
                  <TableCell>{handover.customerId}</TableCell>
                  <TableCell>
                    {handover.bastGenerated ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Generated</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {handover.skorKepuasan ? (
                      <span className="font-medium text-primary">{handover.skorKepuasan} / 5</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!handovers?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Belum ada data serah terima.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
