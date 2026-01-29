import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Rocket, 
  Wrench, 
  Zap, 
  Trash2, 
  Eye,
  Loader2,
  Megaphone
} from "lucide-react";
import { useSystemUpdates, SystemUpdate } from "@/hooks/useSystemUpdates";
import { NovaAtualizacaoDialog } from "./NovaAtualizacaoDialog";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'feature':
      return <Rocket className="h-4 w-4 text-green-500" />;
    case 'improvement':
      return <Zap className="h-4 w-4 text-blue-500" />;
    case 'fix':
      return <Wrench className="h-4 w-4 text-orange-500" />;
    default:
      return <Megaphone className="h-4 w-4 text-primary" />;
  }
};

const getTypeBadge = (type: string) => {
  const config = {
    feature: { label: 'Nova Funcionalidade', variant: 'default' as const },
    improvement: { label: 'Melhoria', variant: 'secondary' as const },
    fix: { label: 'Correção', variant: 'outline' as const },
  };
  const { label, variant } = config[type as keyof typeof config] || { label: type, variant: 'default' as const };
  return <Badge variant={variant}>{label}</Badge>;
};

interface UpdateCardProps {
  update: SystemUpdate;
  onDelete: (id: string) => void;
}

function UpdateCard({ update, onDelete }: UpdateCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <>
      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getTypeIcon(update.tipo)}
              <Badge variant="outline" className="font-mono text-xs">
                v{update.version}
              </Badge>
              {getTypeBadge(update.tipo)}
              <span className="text-xs text-muted-foreground">
                {format(new Date(update.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <h4 className="font-semibold mt-2">{update.title}</h4>
            {update.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {update.description}
              </p>
            )}
            
            {/* Lista de mudanças resumida */}
            {update.changes && update.changes.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  {showDetails ? 'Ocultar' : 'Ver'} {update.changes.length} mudança(s)
                </button>
                
                {showDetails && (
                  <div className="mt-2 space-y-1 bg-muted/50 rounded p-2">
                    {update.changes.map((change: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {getTypeIcon(change.type)}
                        <span>{change.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atualização?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a atualização "{update.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(update.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SystemUpdatesManager() {
  const { updates, loading, deleteUpdate, isSuperAdmin } = useSystemUpdates();
  const [novaAtualizacaoOpen, setNovaAtualizacaoOpen] = useState(false);

  if (!isSuperAdmin) {
    return null;
  }

  const handleDelete = async (id: string) => {
    await deleteUpdate(id);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Publicar Atualizações
              </CardTitle>
              <CardDescription>
                Notifique suas subcontas sobre novas funcionalidades, melhorias e correções
              </CardDescription>
            </div>
            <Button onClick={() => setNovaAtualizacaoOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Nova Atualização
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma atualização publicada</h3>
              <p className="text-muted-foreground mt-2">
                Publique sua primeira atualização para notificar as subcontas
              </p>
              <Button onClick={() => setNovaAtualizacaoOpen(true)} className="mt-4">
                <Send className="mr-2 h-4 w-4" />
                Publicar Primeira Atualização
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {updates.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <NovaAtualizacaoDialog
        open={novaAtualizacaoOpen}
        onOpenChange={setNovaAtualizacaoOpen}
      />
    </>
  );
}
