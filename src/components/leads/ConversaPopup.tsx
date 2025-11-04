import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConversaPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
}

export function ConversaPopup({ open, onOpenChange, lead }: ConversaPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Conversa - {lead?.name}</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-muted-foreground">
          Componente em desenvolvimento
        </div>
      </DialogContent>
    </Dialog>
  );
}
