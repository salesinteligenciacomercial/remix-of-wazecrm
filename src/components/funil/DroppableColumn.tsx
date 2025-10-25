import { useDroppable } from "@dnd-kit/core";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { EditarEtapaDialog } from "./EditarEtapaDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DroppableColumnProps {
  id: string;
  children: ReactNode;
  cor: string;
  nome: string;
  quantidadeLeads: number;
  totalEtapa: number;
  onEtapaUpdated: () => void;
}

export function DroppableColumn({ id, children, cor, nome, quantidadeLeads, totalEtapa, onEtapaUpdated }: DroppableColumnProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'etapa',
      etapaId: id
    }
  });

  const handleDeleteClick = () => {
    if (quantidadeLeads > 0) {
      toast.error("Não é possível deletar etapa com leads. Mova os leads primeiro.");
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("etapas").delete().eq("id", id);
      if (error) throw error;

      toast.success(`Etapa "${nome}" deletada com sucesso!`);
      setShowDeleteDialog(false);
      onEtapaUpdated();
    } catch (error: any) {
      console.error("Erro ao deletar etapa:", error);
      toast.error(error.message || "Erro ao deletar etapa");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div>
        <div className="text-white p-3 rounded-t-lg" style={{ backgroundColor: cor }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{nome}</h3>
            <div className="flex gap-1">
              <EditarEtapaDialog 
                etapaId={id}
                nomeAtual={nome}
                corAtual={cor}
                onEtapaUpdated={onEtapaUpdated}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={handleDeleteClick}
                title={quantidadeLeads > 0 ? "Mova os leads antes de deletar" : "Deletar Etapa"}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-sm">
            <div>{quantidadeLeads} lead{quantidadeLeads !== 1 ? 's' : ''}</div>
            <div className="font-bold">
              R$ {totalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div 
          ref={setNodeRef}
          className={`bg-secondary/20 p-4 rounded-b-lg min-h-[500px] transition-colors ${
            isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
          }`}
        >
          {children}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão da etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a etapa <strong>"{nome}"</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
