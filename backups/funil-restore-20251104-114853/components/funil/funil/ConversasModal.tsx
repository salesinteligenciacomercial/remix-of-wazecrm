import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConversasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

export function ConversasModal({ open, onOpenChange, leadName }: ConversasModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversas - {leadName}</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-muted-foreground">
          Componente em desenvolvimento
        </div>
      </DialogContent>
    </Dialog>
  );
}
