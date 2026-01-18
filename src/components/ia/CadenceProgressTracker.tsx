import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Phone, 
  Mail,
  Instagram,
  ArrowRight,
  User,
  Calendar,
  RefreshCw,
  Plus,
  Flame,
  Sun,
  Snowflake,
  Zap,
  Send,
  Edit2,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, addDays, addHours, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface CadenceProgress {
  id: string;
  lead_id: string;
  company_id: string;
  cadence_name: string;
  current_step: number;
  total_steps: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  completed_steps: any[];
  next_action_at: string | null;
  next_action_channel: string | null;
  next_action_description: string | null;
  assigned_to: string | null;
  cadence_steps?: CadenceStep[];
  leads?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
  };
}

interface ScheduledAction {
  id: string;
  cadence_progress_id: string;
  lead_id: string;
  step_number: number;
  channel: string;
  action_description: string;
  message_content: string;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
}

interface CadenceStep {
  day: number;
  channel: 'whatsapp' | 'call' | 'email' | 'instagram' | 'ligacao';
  action: string;
  script: string;
  hour?: number;
}

interface LeadOption {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  temperature?: string;
}

const CADENCE_TEMPLATES = [
  {
    name: "Cadência Frio → Morno",
    description: "Para leads sem engajamento recente",
    duration: "14 dias",
    steps: [
      { day: 1, channel: "whatsapp" as const, action: "Mensagem de reengajamento", script: "Olá {{nome}}! Tudo bem? 😊\n\nNotei que faz um tempo que não conversamos. Surgiu alguma dúvida?\n\nEstou à disposição para ajudar!", hour: 10 },
      { day: 3, channel: "whatsapp" as const, action: "Follow-up com valor", script: "Oi {{nome}}! 👋\n\nSei que o dia a dia é corrido, mas queria compartilhar algo que pode te interessar.\n\nPodemos conversar rapidinho?", hour: 14 },
      { day: 5, channel: "ligacao" as const, action: "Ligação de qualificação", script: "Bom dia/tarde {{nome}}! Aqui é [seu nome].\n\nTe mandei algumas mensagens nos últimos dias e queria entender melhor sua necessidade.", hour: 11 },
      { day: 7, channel: "whatsapp" as const, action: "Última tentativa com urgência", script: "{{nome}}, essa é minha última tentativa de contato 😅\n\nSe não tiver interesse agora, sem problemas! Mas me avisa, ok?", hour: 15 },
      { day: 10, channel: "email" as const, action: "Email de nutrição", script: "Assunto: {{nome}}, tenho novidades para você\n\nOlá {{nome}},\n\nEspero que esteja tudo bem! Queria compartilhar algumas informações que podem ser úteis.\n\nFico à disposição!\n\nAbraços", hour: 9 },
      { day: 12, channel: "whatsapp" as const, action: "Mensagem de reativação", script: "Oi {{nome}}! Passando para saber se posso ajudar com algo. 🙂", hour: 10 },
      { day: 14, channel: "email" as const, action: "Email de despedida", script: "Assunto: Encerrando por aqui, {{nome}}\n\nOlá {{nome}},\n\nComo não consegui retorno, vou encerrar este contato.\n\nMas saiba que estou à disposição sempre que precisar!\n\nAbraços", hour: 9 }
    ]
  },
  {
    name: "Cadência Morno → Quente",
    description: "Para leads com interesse moderado",
    duration: "7 dias",
    steps: [
      { day: 1, channel: "whatsapp" as const, action: "Mensagem de conexão", script: "Oi {{nome}}! 😊\n\nLembrei de você e queria saber como estão as coisas.\n\nAinda está considerando? Posso te ajudar com mais informações!", hour: 10 },
      { day: 2, channel: "whatsapp" as const, action: "Envio de case/conteúdo", script: "{{nome}}, separei um material que pode te ajudar na decisão:\n\n📊 [Case de sucesso]\n\nO que acha?", hour: 14 },
      { day: 4, channel: "ligacao" as const, action: "Ligação consultiva", script: "{{nome}}, tudo bem? Aqui é [nome].\n\nQueria bater um papo rápido pra entender melhor sua situação.", hour: 11 },
      { day: 6, channel: "whatsapp" as const, action: "Proposta ou próximo passo", script: "{{nome}}, baseado na nossa conversa, preparei algo especial pra você:\n\n🎯 Posso te enviar os detalhes?", hour: 15 },
      { day: 7, channel: "email" as const, action: "Follow-up final", script: "Assunto: Última chance, {{nome}}\n\nOlá {{nome}},\n\nPassando para confirmar se recebeu minha proposta.\n\nFico no aguardo!\n\nAbraços", hour: 9 }
    ]
  },
  {
    name: "Cadência Quente → Fechamento",
    description: "Para leads prontos para comprar",
    duration: "5 dias",
    steps: [
      { day: 1, channel: "whatsapp" as const, action: "Mensagem de fechamento", script: "{{nome}}, tudo certo? 🔥\n\nSei que você está bem interessado. Vamos fechar?\n\nPosso te enviar o link ou prefere que eu te ligue?", hour: 10 },
      { day: 1, channel: "ligacao" as const, action: "Ligação de fechamento", script: "{{nome}}, aqui é [nome]!\n\nVi que você está bem avançado. Queria te ligar pra tirar qualquer dúvida final.", hour: 15 },
      { day: 2, channel: "whatsapp" as const, action: "Urgência/escassez", script: "{{nome}}, última chance! ⏰\n\nA condição especial só até hoje.\n\nPosso segurar pra você?", hour: 11 },
      { day: 3, channel: "whatsapp" as const, action: "Quebra de objeção", script: "{{nome}}, percebi uma hesitação. Posso perguntar:\n\nO que está te impedindo de seguir em frente?", hour: 14 }
    ]
  },
  {
    name: "Reengajamento",
    description: "Para leads que esfriaram",
    duration: "10 dias",
    steps: [
      { day: 1, channel: "whatsapp" as const, action: "Mensagem de retorno", script: "Oi {{nome}}! Há quanto tempo! 😊\n\nLembrei de você e vim ver como as coisas estão por aí.", hour: 10 },
      { day: 3, channel: "whatsapp" as const, action: "Oferta especial", script: "{{nome}}, temos uma novidade que pode te interessar!\n\nPosso te contar?", hour: 14 },
      { day: 5, channel: "ligacao" as const, action: "Ligação de reengajamento", script: "{{nome}}, aqui é [nome]. Tudo bem?\n\nEstou ligando porque surgiu uma oportunidade que lembrei de você.", hour: 11 },
      { day: 7, channel: "email" as const, action: "Email com valor", script: "Assunto: {{nome}}, isso pode te interessar\n\nOlá {{nome}},\n\nSeparei algumas informações especiais.\n\nDá uma olhada!\n\nAbraços", hour: 9 },
      { day: 10, channel: "whatsapp" as const, action: "Última tentativa", script: "{{nome}}, vou encerrar meu contato por aqui.\n\nMas fico disponível se precisar! É só chamar 👋", hour: 15 }
    ]
  }
];

export const CadenceProgressTracker: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cadences, setCadences] = useState<CadenceProgress[]>([]);
  const [scheduledActions, setScheduledActions] = useState<Record<string, ScheduledAction[]>>({});
  const [availableLeads, setAvailableLeads] = useState<LeadOption[]>([]);
  const [showNewCadence, setShowNewCadence] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<ScheduledAction | null>(null);
  const [editedMessage, setEditedMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.company_id) return;
      setCompanyId(userRole.company_id);

      // Buscar cadências ativas
      const { data: cadenceData } = await supabase
        .from("lead_cadence_progress")
        .select(`
          *,
          leads:lead_id (id, nome, telefone, email)
        `)
        .eq("company_id", userRole.company_id)
        .in("status", ["active", "paused"])
        .order("next_action_at", { ascending: true });

      const cadencesTyped = (cadenceData || []) as unknown as CadenceProgress[];
      setCadences(cadencesTyped);

      // Buscar ações agendadas para cada cadência
      if (cadencesTyped.length > 0) {
        const cadenceIds = cadencesTyped.map(c => c.id);
        const { data: actionsData } = await supabase
          .from("scheduled_cadence_actions")
          .select("*")
          .in("cadence_progress_id", cadenceIds)
          .order("scheduled_at", { ascending: true });

        // Agrupar por cadence_progress_id
        const actionsMap: Record<string, ScheduledAction[]> = {};
        (actionsData || []).forEach((action) => {
          const typedAction = action as unknown as ScheduledAction;
          if (!actionsMap[typedAction.cadence_progress_id]) {
            actionsMap[typedAction.cadence_progress_id] = [];
          }
          actionsMap[typedAction.cadence_progress_id].push(typedAction);
        });
        setScheduledActions(actionsMap);
      }

      // Buscar leads disponíveis (sem cadência ativa)
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, name, phone, email")
        .eq("company_id", userRole.company_id)
        .limit(100);

      const { data: activeCadenceLeads } = await supabase
        .from("lead_cadence_progress")
        .select("lead_id")
        .eq("company_id", userRole.company_id)
        .eq("status", "active");

      const activeCadenceLeadIds = new Set(activeCadenceLeads?.map(c => c.lead_id) || []);
      const availableLeadsFiltered = (leadsData || []).filter(l => !activeCadenceLeadIds.has(l.id));
      
      setAvailableLeads(availableLeadsFiltered as unknown as LeadOption[]);

    } catch (error) {
      console.error("[CadenceProgressTracker] Erro:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscription for cadence progress
    const cadenceChannel = supabase
      .channel("cadence-progress-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_cadence_progress" },
        () => loadData()
      )
      .subscribe();

    // Realtime subscription for scheduled actions
    const actionsChannel = supabase
      .channel("scheduled-actions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_cadence_actions" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cadenceChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, [loadData]);

  const calculateScheduledDate = (startDate: Date, step: CadenceStep): Date => {
    const targetDate = addDays(startDate, step.day - 1);
    const hour = step.hour || 10;
    return setMinutes(setHours(targetDate, hour), 0);
  };

  const startCadence = async () => {
    if (!selectedLead || !selectedTemplate || !companyId) {
      toast.error("Selecione um lead e uma cadência");
      return;
    }

    const template = CADENCE_TEMPLATES.find(t => t.name === selectedTemplate);
    if (!template) return;

    // Buscar dados do lead para personalizar mensagens
    const leadData = availableLeads.find(l => l.id === selectedLead);
    if (!leadData) {
      toast.error("Lead não encontrado");
      return;
    }

    try {
      const startDate = new Date();
      const firstStep = template.steps[0];
      const firstActionDate = calculateScheduledDate(startDate, firstStep);

      // Criar progresso da cadência
      const { data: cadenceProgress, error: cadenceError } = await supabase
        .from("lead_cadence_progress")
        .insert({
          lead_id: selectedLead,
          company_id: companyId,
          cadence_name: template.name,
          current_step: 1,
          total_steps: template.steps.length,
          status: "active",
          next_action_at: firstActionDate.toISOString(),
          next_action_channel: firstStep.channel,
          next_action_description: firstStep.action,
          cadence_steps: template.steps,
          cadence_config: { start_date: startDate.toISOString(), template_name: template.name }
        })
        .select()
        .single();

      if (cadenceError) throw cadenceError;

      // Agendar todas as ações da cadência
      const scheduledActionsToInsert = template.steps.map((step, index) => {
        const scheduledAt = calculateScheduledDate(startDate, step);
        const personalizedMessage = step.script
          .replace(/\{\{nome\}\}/g, leadData.name || 'Cliente')
          .replace(/\{\{telefone\}\}/g, leadData.phone || '')
          .replace(/\{\{email\}\}/g, leadData.email || '');

        return {
          cadence_progress_id: cadenceProgress.id,
          lead_id: selectedLead,
          company_id: companyId,
          step_number: index + 1,
          channel: step.channel,
          action_description: step.action,
          message_content: personalizedMessage,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending'
        };
      });

      const { error: actionsError } = await supabase
        .from("scheduled_cadence_actions")
        .insert(scheduledActionsToInsert);

      if (actionsError) throw actionsError;

      toast.success(`Cadência iniciada! ${template.steps.length} ações agendadas automaticamente.`);
      setShowNewCadence(false);
      setSelectedLead("");
      setSelectedTemplate("");
      loadData();
    } catch (error) {
      console.error("Erro ao iniciar cadência:", error);
      toast.error("Erro ao iniciar cadência");
    }
  };

  const updateCadenceStatus = async (cadenceId: string, status: 'active' | 'paused' | 'completed' | 'cancelled') => {
    try {
      const updateData: any = { status };
      if (status === 'completed' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("lead_cadence_progress")
        .update(updateData)
        .eq("id", cadenceId);

      if (error) throw error;

      // Se cancelar ou completar, cancelar ações pendentes
      if (status === 'cancelled' || status === 'completed') {
        await supabase
          .from("scheduled_cadence_actions")
          .update({ status: 'cancelled' })
          .eq("cadence_progress_id", cadenceId)
          .eq("status", "pending");
      }

      toast.success(status === 'paused' ? "Cadência pausada" : 
                   status === 'completed' ? "Cadência concluída!" : 
                   status === 'cancelled' ? "Cadência cancelada" : "Cadência retomada");
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar cadência");
    }
  };

  const advanceStep = async (cadence: CadenceProgress) => {
    const newStep = cadence.current_step + 1;
    const isComplete = newStep > cadence.total_steps;

    try {
      // Marcar ação atual como concluída manualmente
      const currentActions = scheduledActions[cadence.id] || [];
      const currentAction = currentActions.find(a => a.step_number === cadence.current_step && a.status === 'pending');
      
      if (currentAction) {
        await supabase
          .from("scheduled_cadence_actions")
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq("id", currentAction.id);
      }

      if (isComplete) {
        await updateCadenceStatus(cadence.id, 'completed');
      } else {
        // Buscar próxima ação agendada
        const nextAction = currentActions.find(a => a.step_number === newStep);
        
        const { error } = await supabase
          .from("lead_cadence_progress")
          .update({
            current_step: newStep,
            completed_steps: [...(cadence.completed_steps || []), {
              step: cadence.current_step,
              completed_at: new Date().toISOString(),
              completed_manually: true
            }],
            next_action_at: nextAction?.scheduled_at || null,
            next_action_channel: nextAction?.channel || null,
            next_action_description: nextAction?.action_description || null,
          })
          .eq("id", cadence.id);

        if (error) throw error;
        toast.success(`Passo ${cadence.current_step} concluído manualmente!`);
        loadData();
      }
    } catch (error) {
      toast.error("Erro ao avançar step");
    }
  };

  const updateScheduledAction = async () => {
    if (!editingAction) return;

    try {
      const { error } = await supabase
        .from("scheduled_cadence_actions")
        .update({ message_content: editedMessage })
        .eq("id", editingAction.id);

      if (error) throw error;

      toast.success("Mensagem atualizada!");
      setEditingAction(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar mensagem");
    }
  };

  const cancelScheduledAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_cadence_actions")
        .update({ status: 'cancelled' })
        .eq("id", actionId);

      if (error) throw error;

      toast.success("Ação cancelada!");
      loadData();
    } catch (error) {
      toast.error("Erro ao cancelar ação");
    }
  };

  const getChannelIcon = (channel: string | null) => {
    switch (channel) {
      case "whatsapp": return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "call": 
      case "ligacao": return <Phone className="h-4 w-4 text-blue-500" />;
      case "email": return <Mail className="h-4 w-4 text-purple-500" />;
      case "instagram": return <Instagram className="h-4 w-4 text-pink-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case "paused": return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>;
      case "completed": return <Badge className="bg-blue-100 text-blue-800">Concluída</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>;
      default: return null;
    }
  };

  const getActionStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-xs">Agendado</Badge>;
      case "sent": return <Badge className="bg-green-100 text-green-800 text-xs">Enviado</Badge>;
      case "failed": return <Badge className="bg-red-100 text-red-800 text-xs">Falhou</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-800 text-xs">Cancelado</Badge>;
      default: return null;
    }
  };

  const isOverdue = (nextActionAt: string | null) => {
    if (!nextActionAt) return false;
    return isPast(new Date(nextActionAt));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Cadências Automatizadas
            </CardTitle>
            <CardDescription>
              Automação de follow-up com WhatsApp, Email e Ligações
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={showNewCadence} onOpenChange={setShowNewCadence}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Cadência
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Iniciar Nova Cadência Automatizada</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecione o Lead</label>
                    <Select value={selectedLead} onValueChange={setSelectedLead}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLeads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {lead.name}
                              {lead.phone && <span className="text-muted-foreground text-xs">({lead.phone})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Cadência</label>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                      {CADENCE_TEMPLATES.map(template => (
                        <div
                          key={template.name}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTemplate === template.name 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedTemplate(template.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{template.steps.length} passos</Badge>
                              <p className="text-xs text-muted-foreground mt-1">{template.duration}</p>
                            </div>
                          </div>
                          {selectedTemplate === template.name && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium mb-2">Canais utilizados:</p>
                              <div className="flex flex-wrap gap-1">
                                {template.steps.map((step, idx) => (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
                                          <span className="text-muted-foreground">Dia {step.day}:</span>
                                          {getChannelIcon(step.channel)}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{step.action}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={startCadence} disabled={!selectedLead || !selectedTemplate}>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Cadência Automatizada
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {cadences.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma cadência ativa</p>
                <p className="text-sm">Clique em "Nova Cadência" para automatizar follow-ups</p>
              </div>
            ) : (
              cadences.map(cadence => {
                const actions = scheduledActions[cadence.id] || [];
                const pendingActions = actions.filter(a => a.status === 'pending');
                const sentActions = actions.filter(a => a.status === 'sent');

                return (
                  <div
                    key={cadence.id}
                    className={`p-4 rounded-lg border ${
                      isOverdue(cadence.next_action_at) && cadence.status === 'active'
                        ? 'border-red-200 bg-red-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cadence.leads?.nome || "Lead"}</span>
                          {getStatusBadge(cadence.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{cadence.cadence_name}</p>
                      </div>
                      <div className="flex gap-1">
                        {cadence.status === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCadenceStatus(cadence.id, 'paused')}
                              title="Pausar"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => advanceStep(cadence)}
                              title="Concluir passo atual manualmente"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          </>
                        )}
                        {cadence.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCadenceStatus(cadence.id, 'active')}
                            title="Retomar"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateCadenceStatus(cadence.id, 'cancelled')}
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Passo {cadence.current_step} de {cadence.total_steps}</span>
                        <span className="text-muted-foreground">
                          {sentActions.length} enviados • {pendingActions.length} pendentes
                        </span>
                      </div>
                      <Progress value={(cadence.current_step / cadence.total_steps) * 100} />
                    </div>

                    {/* Timeline de Ações */}
                    {actions.length > 0 && (
                      <div className="space-y-2 mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Ações agendadas:</p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {actions.map((action) => (
                            <div 
                              key={action.id} 
                              className={`flex items-center gap-3 p-2 rounded text-sm ${
                                action.status === 'pending' && isOverdue(action.scheduled_at)
                                  ? 'bg-red-50'
                                  : action.status === 'sent'
                                  ? 'bg-green-50'
                                  : action.status === 'cancelled'
                                  ? 'bg-gray-50 opacity-50'
                                  : 'bg-muted/50'
                              }`}
                            >
                              {getChannelIcon(action.channel)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Passo {action.step_number}</span>
                                  {getActionStatusBadge(action.status)}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {action.action_description}
                                </p>
                              </div>
                              <div className="text-right text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {action.status === 'sent' && action.sent_at
                                    ? format(new Date(action.sent_at), "dd/MM HH:mm", { locale: ptBR })
                                    : format(new Date(action.scheduled_at), "dd/MM HH:mm", { locale: ptBR })
                                  }
                                </div>
                              </div>
                              {action.status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingAction(action);
                                      setEditedMessage(action.message_content);
                                    }}
                                    title="Editar mensagem"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => cancelScheduledAction(action.id)}
                                    title="Cancelar ação"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Action Alert */}
                    {cadence.status === 'active' && cadence.next_action_at && (
                      <div className={`flex items-center gap-2 text-sm p-2 rounded mt-3 ${
                        isOverdue(cadence.next_action_at) 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <Send className="h-4 w-4" />
                        <span className="flex-1">
                          Próximo envio automático:
                        </span>
                        <span className="font-medium">
                          {isOverdue(cadence.next_action_at) 
                            ? `Atrasado há ${formatDistanceToNow(new Date(cadence.next_action_at), { locale: ptBR })}`
                            : formatDistanceToNow(new Date(cadence.next_action_at), { locale: ptBR, addSuffix: true })
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Dialog para editar mensagem */}
      <Dialog open={!!editingAction} onOpenChange={() => setEditingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mensagem Agendada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo da mensagem</label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={6}
                placeholder="Digite a mensagem..."
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={updateScheduledAction}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setEditingAction(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
