import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';
import { CallRecord } from '@/hooks/useCallCenter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CallHistoryProps {
  calls: CallRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onCallLead?: (leadId: string, leadName: string, phone: string) => void;
}

const resultConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  atendida: { label: 'Atendida', icon: PhoneIncoming, color: 'bg-green-500/10 text-green-500' },
  recusada: { label: 'Recusada', icon: PhoneOff, color: 'bg-red-500/10 text-red-500' },
  caixa_postal: { label: 'Caixa Postal', icon: PhoneMissed, color: 'bg-yellow-500/10 text-yellow-500' },
  ocupado: { label: 'Ocupado', icon: PhoneMissed, color: 'bg-orange-500/10 text-orange-500' },
  nao_atende: { label: 'Não Atende', icon: PhoneMissed, color: 'bg-gray-500/10 text-gray-500' },
  numero_invalido: { label: 'Número Inválido', icon: PhoneOff, color: 'bg-red-500/10 text-red-500' },
  falha: { label: 'Falha', icon: PhoneOff, color: 'bg-destructive/10 text-destructive' },
  encerrada: { label: 'Encerrada', icon: Phone, color: 'bg-muted text-muted-foreground' }
};

export const CallHistory: React.FC<CallHistoryProps> = ({
  calls,
  isLoading,
  onRefresh,
  onCallLead
}) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Phone className="w-12 h-12 mb-4 opacity-50" />
        <p>Nenhuma ligação registrada</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico de Chamadas</h3>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-4">
          {calls.map((call) => {
            const result = resultConfig[call.call_result || 'encerrada'] || resultConfig.encerrada;
            const ResultIcon = result.icon;

            return (
              <Card key={call.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon & Info */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${result.color}`}>
                        <ResultIcon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {call.lead_name || 'Contato Desconhecido'}
                          </span>
                          <Badge variant="outline" className={result.color}>
                            {result.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{call.phone_number}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(call.call_start), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </div>
                        {call.notes && (
                          <div className="mt-2 text-sm bg-muted/50 p-2 rounded">
                            <div className="flex items-start gap-2">
                              <FileText className="w-3 h-3 mt-0.5 text-muted-foreground" />
                              <span className="text-muted-foreground line-clamp-2">{call.notes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {call.lead_id && onCallLead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCallLead(call.lead_id!, call.lead_name || '', call.phone_number)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
