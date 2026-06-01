import { useListLegalDocuments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Legal() {
  const { data: documents } = useListLegalDocuments({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Legal & Perizinan</h1>
        <p className="text-sm text-muted-foreground">Dokumen tracker dan bankable status</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe Dokumen</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.tipeDokumen}</TableCell>
                  <TableCell>{doc.projectId}</TableCell>
                  <TableCell>
                    <Badge variant={
                      doc.status === 'approved' ? 'default' :
                      doc.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.pic || '-'}</TableCell>
                  <TableCell>{doc.expiry || '-'}</TableCell>
                </TableRow>
              ))}
              {!documents?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Tidak ada dokumen.
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
