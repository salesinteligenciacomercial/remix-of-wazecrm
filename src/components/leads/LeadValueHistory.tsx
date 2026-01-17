import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  History,
  Percent,
  GitCommit,
  User
} from "lucide-react";

interface LeadValueHistoryProps {
  leadId: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryEntry {
  id: string;
  change_type: string;
  old_value: number | null;
  new_value: number | null;
  value_change: number | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  changed_by: string | null;
  changed_by_name?: string;
}

export function LeadValueHistory({ leadId, leadName, open, onOpenChange }: LeadValueHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, leadId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_value_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar nomes dos usuários
      const userIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
      let userNames: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        profiles?.forEach(p => {
          userNames[p.id] = p.full_name || p.email || "Usuário";
        });
      }

      const historyWithNames = (data || []).map(h => ({
        ...h,
        changed_by_name: h.changed_by ? userNames[h.changed_by] : undefined
      }));

      setHistory(historyWithNames);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "R$ 0,00";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getChangeIcon = (type: string, valueChange: number | null) => {
    switch (type) {
      case "value_change":
        return valueChange && valueChange > 0 
          ? <TrendingUp className="h-4 w-4 text-green-500" />
          : <TrendingDown className="h-4 w-4 text-red-500" />;
      case "status_change":
        return <GitCommit className="h-4 w-4 text-blue-500" />;
      case "probability_change":
        return <Percent className="h-4 w-4 text-purple-500" />;
      case "stage_change":
        return <ArrowRight className="h-4 w-4 text-orange-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeLabel = (type: string) => {
    switch (type) {
      case "value_change": return "Valor Alterado";
      case "status_change": return "Status Alterado";
      case "probability_change": return "Probabilidade Alterada";
      case "stage_change": return "Etapa Alterada";
      case "initial": return "Registro Inicial";
      default: return "Alteração";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "novo": return "Novo";
      case "em_andamento": return "Em Andamento";
      case "ganho": return "Ganho";
      case "perdido": return "Perdido";
      default: return status || "—";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "ganho": return "bg-green-500";
      case "perdido": return "bg-red-500";
      case "em_andamento": return "bg-blue-500";
      default: return "bg-muted";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico - {leadName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum histórico encontrado</p>
              <p className="text-sm">As alterações serão registradas automaticamente</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${
                      entry.change_type === 'value_change' && entry.value_change && entry.value_change > 0 
                        ? 'border-green-500' 
                        : entry.change_type === 'status_change' && entry.new_status === 'ganho'
                        ? 'border-green-500'
                        : entry.change_type === 'status_change' && entry.new_status === 'perdido'
                        ? 'border-red-500'
                        : 'border-primary'
                    }`}>
                      {getChangeIcon(entry.change_type, entry.value_change)}
                    </div>

                    <div className="bg-card border rounded-lg p-4 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {getChangeLabel(entry.change_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Content based on type */}
                      {entry.change_type === 'value_change' && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{formatCurrency(entry.old_value)}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-semibold">{formatCurrency(entry.new_value)}</span>
                          {entry.value_change !== null && (
                            <Badge variant={entry.value_change > 0 ? "default" : "destructive"} className="ml-2">
                              {entry.value_change > 0 ? "+" : ""}{formatCurrency(entry.value_change)}
                            </Badge>
                          )}
                        </div>
                      )}

                      {entry.change_type === 'status_change' && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className={getStatusColor(entry.old_status)}>
                            {getStatusLabel(entry.old_status)}
                          </Badge>
                          <ArrowRight className="h-4 w-4" />
                          <Badge className={getStatusColor(entry.new_status)}>
                            {getStatusLabel(entry.new_status)}
                          </Badge>
                        </div>
                      )}

                      {entry.change_type === 'probability_change' && entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}

                      {entry.change_type === 'stage_change' && (
                        <p className="text-sm text-muted-foreground">
                          Lead movido para nova etapa
                        </p>
                      )}

                      {/* User who made the change */}
                      {entry.changed_by_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                          <User className="h-3 w-3" />
                          <span>{entry.changed_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
