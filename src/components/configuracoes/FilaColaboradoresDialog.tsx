import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FilaColaboradoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filaId: string | null;
}

export function FilaColaboradoresDialog({ open, onOpenChange }: FilaColaboradoresDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Colaboradores</DialogTitle>
        </DialogHeader>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta funcionalidade requer configuração adicional no banco de dados.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
