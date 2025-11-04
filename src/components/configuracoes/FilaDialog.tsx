import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FilaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fila?: any;
  onSuccess?: () => void;
}

export function FilaDialog({ open, onOpenChange }: FilaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Fila</DialogTitle>
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
