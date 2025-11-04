import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function SubcontasManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Subcontas</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta funcionalidade requer configuração adicional no banco de dados.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
