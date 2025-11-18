import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DisparoEmMassa() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Disparo em Massa</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta funcionalidade requer configuração adicional no banco de dados.
              Entre em contato com o suporte para ativar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
