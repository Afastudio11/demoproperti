import { useListCustomers, useGetKprPipeline } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Administrasi() {
  const { data: customers } = useListCustomers({});
  const { data: pipeline } = useGetKprPipeline({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administrasi KPR</h1>
        <p className="text-sm text-muted-foreground">Customer database dan KPR pipeline tracker</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Customer KPR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reject Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pipeline?.rejectRate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg. Approval Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline?.avgDuration ?? 0} Hari</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Unit ID</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status KPR</TableHead>
                <TableHead>Berkas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.nama}</TableCell>
                  <TableCell>{customer.unitId || '-'}</TableCell>
                  <TableCell>{customer.kontak}</TableCell>
                  <TableCell>{customer.bank || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {customer.statusKpr.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.berkasLengkap ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Lengkap</Badge>
                    ) : (
                      <Badge variant="secondary">Incomplete</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!customers?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Tidak ada customer.
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
