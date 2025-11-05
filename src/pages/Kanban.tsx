/**
 * ✅ BACKUP ATUALIZADO - 2024-11-01 (TARDE)
 * CORREÇÕES CRÍTICAS DE BLOQUEIO DE DRAG:
 * 
 * 1. Sistema de bloqueio inteligente implementado
 *    - currentDragIdRef rastreia qual item está sendo arrastado
 *    - Permite mesmo drag continuar, bloqueia drags diferentes
 *    - Verificar: linha 134 (currentDragIdRef), linha 438-482 (handleDragStart), linha 502-542 (handleDragEnd)
 * 
 * 2. LeadCard agora passa etapaId no data do drag
 *    - Verificar: src/components/funil/LeadCard.tsx linha 105
 * 
 * 3. Todos os returns liberam bloqueio + currentDragIdRef
 *    - Verificar: todos os returns no handleDragEnd liberam ambos
 * 
 * 4. Lógica de identificação de destino melhorada
 *    - Prioridade: etapa > etapaId > lead com etapaId
 *    - Verificar: linha 574-596
 * 
 * Se retroceder, verificar estes pontos críticos.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DndContext, DragEndEvent, closestCenter, DragStartEvent, DragOverEvent, DragOverlay } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Wifi, WifiOff, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LeadCard } from "@/components/funil/LeadCard";
import { DroppableColumn } from "@/components/funil/DroppableColumn";
import { NovoLeadDialog } from "@/components/funil/NovoLeadDialog";
import { AdicionarLeadExistenteDialog } from "@/components/funil/AdicionarLeadExistenteDialog";
import { NovoFunilDialog } from "@/components/funil/NovoFunilDialog";
import { EditarFunilDialog } from "@/components/funil/EditarFunilDialog";
import { AdicionarEtapaDialog } from "@/components/funil/AdicionarEtapaDialog";
import { toast } from "sonner";
import { useGlobalSync } from "@/hooks/useGlobalSync";
import { useWorkflowAutomation } from "@/hooks/useWorkflowAutomation";

interface Lead {
  id: string;
  nome: string;
  name: string;
  company?: string;
  value?: number;
  telefone?: string;
  email?: string;
  cpf?: string;
  source?: string;
  notes?: string;
  etapa_id?: string;
  funil_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ✅ IMPORTANTE: Campos de timestamp por tabela:
 * - Tabela "etapas": usa campo "atualizado_em" (NÃO "updated_at")
 *   Schema: migration 20251022210449_fa6c8264-1153-40d0-a942-f85e5035729b.sql linha 59
 * - Tabela "leads": usa campo "updated_at" (NÃO "atualizado_em")
 * - Tabela "funis": usa campo "atualizado_em" (NÃO "updated_at")
 */
interface Etapa {
  id: string;
  nome: string;
  posicao: number;
  cor: string;
  funil_id: string;
  atualizado_em?: string; // ✅ Campo correto para tabela etapas
}

interface Funil {
  id: string;
  nome: string;
  descricao?: string;
}

// Componente para coluna ordenável
/**
 * ✅ BACKUP ATUALIZADO - 2024-11-01
 * IMPORTANTE: Deve ter data: { type: 'etapa' } no useSortable para identificar drag de etapas
 * Se retroceder, verificar se tem data: { type: 'etapa' }
 */
function SortableColumn({
  id,
  children,
  isDragging
}: {
  id: string;
  children: React.ReactNode;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id, data: { type: 'etapa' } }); // ✅ CRÍTICO: data: { type: 'etapa' } para identificar drag de etapas

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: (sortableIsDragging || isDragging) ? 0.6 : 1,
    scale: (sortableIsDragging || isDragging) ? 0.95 : 1,
    boxShadow: (sortableIsDragging || isDragging) ? '0 10px 30px rgba(0,0,0,0.2)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-[320px] flex-shrink-0 relative group">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="bg-background border rounded-full p-1 shadow-md">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {children}
    </div>
  );
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [selectedFunil, setSelectedFunil] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [dragOperation, setDragOperation] = useState<{
    isDragging: boolean;
    leadId: string | null;
    sourceEtapa: string | null;
  }>({
    isDragging: false,
    leadId: null,
    sourceEtapa: null,
  });
  const [leadsPerEtapa, setLeadsPerEtapa] = useState<Record<string, number>>({});
  const [activeColumn, setActiveColumn] = useState<Etapa | null>(null);
  const [calculatingMetrics, setCalculatingMetrics] = useState(false); // ✅ Indicador de loading
  const LEADS_PER_PAGE = 10;
  const MAX_LEADS_TO_PROCESS = 500; // ✅ Limite de leads processados por vez
  const isMovingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ Timeout de segurança
  const metricsDebounceRef = useRef<NodeJS.Timeout | null>(null); // ✅ Debounce para cálculo de métricas
  // ✅ CRÍTICO - BACKUP 2024-11-01: Rastrear qual item está sendo arrastado para permitir mesmo drag continuar
  const currentDragIdRef = useRef<string | null>(null); // ✅ Identificar qual item está sendo arrastado

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar funis
        const { data: funisData, error: funisError } = await supabase
          .from("funis")
          .select("*")
          .order("criado_em");

        if (funisError) throw funisError;

        if (!mounted) return;

        // Atualizar funis
        const loadedFunis = funisData || [];
        setFunis(loadedFunis);

        // Selecionar primeiro funil se necessário
        if (loadedFunis.length > 0 && !selectedFunil) {
          setSelectedFunil(loadedFunis[0].id);
        }

        // Carregar etapas
        const { data: etapasData, error: etapasError } = await supabase
          .from("etapas")
          .select("*")
          .order("posicao");

        if (etapasError) throw etapasError;
        if (!mounted) return;

        setEtapas(etapasData || []);

        // Carregar leads
        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (leadsError) throw leadsError;
        if (!mounted) return;

        setLeads((leadsData || []).map(lead => ({
          ...lead,
          nome: lead.name || "",
          name: lead.name || ""
        })));

      } catch (err: any) {
        console.error("Erro ao carregar dados:", err);
        if (mounted) {
          setError(err.message || "Erro ao carregar dados");
          toast.error("Erro ao carregar funil de vendas");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [selectedFunil]);

  // Atualiza apenas os leads sem recarregar a página
  const refreshLeads = async () => {
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (leadsError) throw leadsError;
      setLeads((leadsData || []).map(lead => ({
        ...lead,
        nome: lead.name || "",
        name: lead.name || ""
      })));
    } catch (err) {
      console.error("Erro ao atualizar leads:", err);
    }
  };

  // Atualiza funis
  const refreshFunis = async () => {
    try {
      const { data: funisData, error } = await supabase.from('funis').select('*').order('criado_em');
      if (error) throw error;
      const loaded = funisData || [];
      setFunis(loaded);
      if (!selectedFunil && loaded.length > 0) setSelectedFunil(loaded[0].id);
      if (selectedFunil && !loaded.find(f => f.id === selectedFunil) && loaded.length > 0) {
        setSelectedFunil(loaded[0].id);
      }
    } catch (err) {
      console.error('Erro ao atualizar funis:', err);
    }
  };

  // Atualiza etapas
  const refreshEtapas = async () => {
    try {
      const { data: etapasData, error } = await supabase.from('etapas').select('*').order('posicao');
      if (error) throw error;
      setEtapas(etapasData || []);
    } catch (err) {
      console.error('Erro ao atualizar etapas:', err);
    }
  };

  // Carregar mais leads para uma etapa específica
  const loadMoreLeads = useCallback(async (etapaId: string) => {
    const currentCount = leadsPerEtapa[etapaId] || LEADS_PER_PAGE;
    const newCount = currentCount + LEADS_PER_PAGE;

    setLeadsPerEtapa(prev => ({
      ...prev,
      [etapaId]: newCount
    }));
  }, [leadsPerEtapa, LEADS_PER_PAGE]);

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restaurada");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Sem conexão com a internet");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // useLeadsSync removido aqui para evitar duplicidade com o canal consolidado abaixo

  // Sistema de eventos globais para comunicação entre módulos
  const { emitGlobalEvent } = useGlobalSync({
    callbacks: {
      // Receber eventos de outros módulos
      onLeadUpdated: (data) => {
        console.log('🌍 [Kanban] Lead atualizado via evento global:', data);
        // Atualizar lead se estiver presente no funil atual
        setLeads(prev => prev.map(lead => {
          if (lead.id === data.id) {
            const formattedLead = { ...data, nome: data.name || '', name: data.name || '' };
            return formattedLead;
          }
          return lead;
        }));
      },
      onTaskCreated: (data) => {
        console.log('🌍 [Kanban] Nova tarefa criada, verificar se afeta lead:', data);
        // Se a tarefa estiver vinculada a um lead no funil, podemos atualizar status
        if (data.lead_id) {
          // Opcional: marcar lead como tendo tarefas pendentes
        }
      },
      onMeetingScheduled: (data) => {
        console.log('🌍 [Kanban] Reunião agendada, verificar se afeta lead:', data);
        // Se a reunião estiver vinculada a um lead, podemos atualizar atividade
        if (data.lead_id) {
          // Opcional: marcar lead como tendo reunião agendada
        }
      }
    },
    showNotifications: false
  });

  // Sistema de workflows automatizados
  useWorkflowAutomation({
    showNotifications: true
  });

  // 🎯 Realtime consolidado com gerenciamento robusto
  useEffect(() => {
    let realtimeChannel: any = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const formatLead = (lead: any): Lead => ({
      ...lead,
      nome: lead.name || '',
      name: lead.name || ''
    });

    const setupRealtimeChannel = () => {
      console.log('🔄 [REALTIME] Configurando canal consolidado...');

      // Canal único para consolidar realtime
      realtimeChannel = supabase
        .channel('kanban_realtime_consolidated')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload: any) => {
          console.log('📡 [REALTIME] Leads:', payload.eventType, payload.new?.id || payload.old?.id);
          
          // ✅ CRÍTICO: Ignorar atualizações durante operações de drag
          if (isMovingRef.current) {
            console.log('⏸️ [REALTIME] 🚫 BLOQUEIO ATIVO - Ignorando atualização durante drag:', {
              eventType: payload.eventType,
              leadId: payload.new?.id || payload.old?.id,
              isMoving: isMovingRef.current
            });
            return;
          }

          if (payload.eventType === 'INSERT') {
            setLeads(prev => {
              // Evitar duplicatas
              if (prev.some(l => l.id === payload.new.id)) return prev;
              return [formatLead(payload.new), ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === payload.new.id ? formatLead(payload.new) : l));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'etapas' }, (payload: any) => {
          console.log('📡 [REALTIME] Etapas:', payload.eventType);

          // Filtrar mudanças irrelevantes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const changedFields = Object.keys(payload.new).filter(key =>
              payload.new[key] !== payload.old[key]
            );

            // ✅ CRÍTICO: Ignorar mudanças apenas de posição ou timestamp
            // NOTA: Tabela etapas usa campo "atualizado_em" (NÃO "updated_at")
            // Ver migration: 20251031221500_reorder_etapas_function.sql linha 64
            if (changedFields.length === 1 && (changedFields[0] === 'posicao' || changedFields[0] === 'atualizado_em')) {
              console.log('⏭️ [REALTIME] Ignorando mudança de posição/timestamp');
              return;
            }
          }

          refreshEtapas();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'funis' }, () => {
          console.log('📡 [REALTIME] Funis atualizados');
          refreshFunis();
        })
        .subscribe((status) => {
          console.log('🔌 [REALTIME] Status:', status);

          if (status === 'SUBSCRIBED') {
            console.log('✅ [REALTIME] Canal conectado com sucesso');
            setIsOnline(true);
            reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] Erro no canal');
            setIsOnline(false);

            // Tentar reconectar automaticamente
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Backoff exponencial
              
              console.log(`🔄 [REALTIME] Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
              
              reconnectTimeout = setTimeout(() => {
                if (realtimeChannel) {
                  supabase.removeChannel(realtimeChannel);
                }
                setupRealtimeChannel();
              }, delay);
            } else {
              toast.error('Erro na conexão em tempo real', {
                description: 'Recarregue a página para restaurar'
              });
            }
          } else if (status === 'CLOSED') {
            console.log('🔌 [REALTIME] Canal fechado');
            setIsOnline(false);
          }
        });
    };

    setupRealtimeChannel();

    return () => {
      console.log('🧹 [REALTIME] Limpando canal...');
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [selectedFunil]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragId = active.id as string;
    
    // ✅ CRÍTICO: Identificar qual item está sendo arrastado
    currentDragIdRef.current = dragId;
    
    const activeData = active.data.current;
    
    // ✅ Se for drag de etapa, não precisa bloquear aqui (handleEtapaReorder gerencia)
    if (activeData?.type === 'etapa') {
      console.log('[DRAG START] Drag de etapa iniciado:', dragId);
      return;
    }

    // ✅ Para drag de lead: Ativar bloqueio e configurar timeout
    isMovingRef.current = true;
    console.log('🔒 [DRAG START] 🚫 BLOQUEIO ATIVADO - Bloqueando atualizações realtime:', {
      dragId,
      type: activeData?.type,
      isMoving: isMovingRef.current
    });

    const lead = leads.find(l => l.id === dragId);
    setDragOperation({
      isDragging: true,
      leadId: dragId,
      sourceEtapa: lead?.etapa_id || null,
    });

    // ✅ Timeout de segurança (5s) para liberar bloqueio caso algo dê errado
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
    }
    blockTimeoutRef.current = setTimeout(() => {
      if (isMovingRef.current && currentDragIdRef.current === dragId) {
        console.warn('⚠️ [DRAG TIMEOUT] Liberando bloqueio após 5s de segurança');
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        blockTimeoutRef.current = null;
      }
    }, 5000);

    console.log('[DRAG START] Iniciando drag:', { dragId, sourceEtapa: lead?.etapa_id });
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Pode ser usado para feedback visual durante o drag
    const { over } = event;
    if (over) {
      console.log('[DRAG OVER] Hover sobre:', over.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[DRAG END] 🎯 Iniciando operação de drag:', { 
      activeId: active.id, 
      overId: over?.id,
      activeType: active.data.current?.type,
      overType: over?.data.current?.type 
    });

    const dragId = active.id as string;
    const activeData = active.data.current;

    // ✅ CRÍTICO - BACKUP 2024-11-01: Verificar se é uma operação concorrente ou o mesmo drag
    // Sistema de bloqueio inteligente que permite mesmo drag continuar, bloqueia drags diferentes
    if (isMovingRef.current) {
      // Se é o mesmo item sendo arrastado, é o mesmo drag - permitir continuar
      if (currentDragIdRef.current === dragId) {
        console.log('[DRAG END] ✅ Mesmo drag - continuando operação:', dragId);
        // Não fazer nada, o bloqueio já está ativo e é o mesmo drag
      } else {
        // É um drag diferente - bloquear
        console.warn('[DRAG END] ⚠️ Operação de drag já em andamento - bloqueado:', {
          isMoving: isMovingRef.current,
          currentDragId: currentDragIdRef.current,
          newDragId: dragId,
          activeType: activeData?.type
        });
        toast.warning("Aguarde a operação anterior finalizar", {
          description: "Tente novamente em alguns segundos"
        });
      return;
      }
    } else {
      // ✅ Bloqueio não está ativo - ativar agora (caso handleDragStart não tenha sido chamado)
      isMovingRef.current = true;
      currentDragIdRef.current = dragId; // ✅ CRÍTICO: Rastrear drag atual
      console.log('🔒 [DRAG END] 🚫 BLOQUEIO ATIVADO - Iniciando operação de drag');
      
      // ✅ Timeout de segurança (5s) - só libera se for o mesmo drag
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
      blockTimeoutRef.current = setTimeout(() => {
        if (isMovingRef.current && currentDragIdRef.current === dragId) {
          console.warn('⚠️ [DRAG TIMEOUT] Liberando bloqueio após 5s de segurança');
          isMovingRef.current = false;
          currentDragIdRef.current = null; // ✅ CRÍTICO: Limpar rastreamento
          blockTimeoutRef.current = null;
        }
      }, 5000);
    }

    try {
      // 🧹 Reset drag states
      setDragOperation({
        isDragging: false,
        leadId: null,
        sourceEtapa: null,
      });
      setActiveColumn(null);

      // ✅ Validação básica - sem destino
      if (!over) {
        console.log('[DRAG END] ❌ Drag cancelado - nenhum destino válido');
        // ✅ CRÍTICO: Liberar bloqueio antes de retornar
        isMovingRef.current = false;
        currentDragIdRef.current = null; // ✅ BACKUP 2024-11-01: Limpar rastreamento
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // ✅ Validação de conectividade
      if (!isOnline) {
        console.error('[DRAG END] 🌐 Sem conexão com internet');
        toast.error("Sem conexão - operação não pode ser realizada", {
          description: "Verifique sua conexão e tente novamente"
        });
        // ✅ CRÍTICO: Liberar bloqueio antes de retornar
        isMovingRef.current = false;
        currentDragIdRef.current = null; // ✅ BACKUP 2024-11-01: Limpar rastreamento
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      const overData = over.data.current;

      // 🔀 FLUXO 1: Reordenação de etapas (drag horizontal)
      if (activeData?.type === 'etapa') {
        console.log('[DRAG END] 🔄 Detectado drag de etapa - reordenação');
        // ✅ handleEtapaReorder gerencia seu próprio bloqueio, mas precisamos garantir que este está liberado
        // O bloqueio deste contexto será liberado no finally
        await handleEtapaReorder(active.id as string, over.id as string);
        // ✅ Liberar bloqueio deste contexto (handleEtapaReorder usa seu próprio bloqueio)
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // 🎯 FLUXO 2: Movimentação de lead entre etapas
      const leadId = active.id as string;

      // ✅ Validar se o lead existe no estado ANTES de determinar destino
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        console.error('[DRAG END] ❌ Lead não encontrado no estado local:', {
          leadId,
          totalLeads: leads.length,
          leadIdsDisponiveis: leads.slice(0, 10).map(l => l.id)
        });
        toast.error("Lead não encontrado", {
          description: "O lead pode ter sido removido. Recarregue a página se necessário."
        });
        // ✅ Liberar bloqueio em caso de erro
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // ✅ BACKUP 2024-11-01: Determinar etapa de destino com lógica clara (melhorada)
      // Prioridade: Drop direto na coluna > etapaId no data > lead com etapaId
      let newEtapaId: string | null = null;
      
      // ✅ Prioridade 1: Drop direto na área da coluna (tipo 'etapa')
      if (overData?.type === 'etapa') {
        newEtapaId = over.id as string;
        console.log('[DRAG END] 📍 Drop direto na etapa:', newEtapaId);
      } 
      // ✅ Prioridade 2: etapaId no data (DroppableColumn passa isso)
      else if (overData?.etapaId) {
        newEtapaId = overData.etapaId as string;
        console.log('[DRAG END] 📍 Drop sobre coluna - etapaId:', newEtapaId);
      } 
      // ✅ Prioridade 3: Drop sobre lead - usar etapaId do data ou etapa_id do lead
      // CRÍTICO: LeadCard agora passa etapaId no data (verificar LeadCard.tsx linha 105)
      else if (overData?.type === 'lead') {
        // Tentar etapaId do data primeiro (LeadCard agora passa)
        newEtapaId = overData.etapaId || overData.lead?.etapa_id || null;
        console.log('[DRAG END] 📍 Drop sobre lead:', {
          etapaIdFromData: overData.etapaId,
          etapaIdFromLead: overData.lead?.etapa_id,
          selectedEtapaId: newEtapaId
        });
      }

      // ✅ Validar etapa de destino identificada
      if (!newEtapaId) {
        console.error('[DRAG END] ❌ Etapa de destino não identificada:', { 
          overData, 
          overId: over.id,
          activeId: active.id,
          activeData: active.data.current,
          leadsTotal: leads.length
        });
        toast.error("Etapa de destino não identificada", {
          description: "Não foi possível identificar para qual etapa mover o lead. Tente novamente."
        });
        // ✅ Liberar bloqueio em caso de erro
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // ✅ Validar se a etapa de destino existe
      const etapaDestino = etapas.find(e => e.id === newEtapaId);
      if (!etapaDestino) {
        console.error('[DRAG END] ❌ Etapa de destino não existe:', {
          etapaId: newEtapaId,
          etapasDisponiveis: etapas.map(e => ({ id: e.id, nome: e.nome }))
        });
        toast.error("Etapa de destino não encontrada", {
          description: "A etapa selecionada não existe mais"
        });
        // ✅ Liberar bloqueio em caso de erro
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // ✅ CRÍTICO: Validar se está tentando mover entre funis diferentes (ANTES de update otimista)
      // Validação 1: Verificar se etapa destino pertence ao funil selecionado
      if (etapaDestino.funil_id !== selectedFunil) {
        const funilDestino = funis.find(f => f.id === etapaDestino.funil_id);
        const funilOrigem = funis.find(f => f.id === selectedFunil);
        const etapaOrigem = etapas.find(e => e.id === lead.etapa_id);
        const funilAtualLead = funis.find(f => f.id === lead.funil_id);
        
        console.warn('[DRAG END] ⚠️❌ TENTATIVA DE MOVER ENTRE FUNIS DIFERENTES - BLOQUEADO:', {
          lead: {
            id: leadId,
            nome: lead.name,
            etapaAtual: {
              id: lead.etapa_id,
              nome: etapaOrigem?.nome || 'N/A',
              funilId: lead.funil_id,
              funilNome: funilAtualLead?.nome || 'N/A'
            }
          },
          etapaDestino: {
            id: etapaDestino.id,
            nome: etapaDestino.nome,
            funilId: etapaDestino.funil_id,
            funilNome: funilDestino?.nome || 'N/A'
          },
          funilSelecionado: {
            id: selectedFunil,
            nome: funilOrigem?.nome || 'N/A'
          },
          validacao: {
            etapaDestinoPertenceFunilSelecionado: etapaDestino.funil_id === selectedFunil,
            funilAtualLead: lead.funil_id,
          funilSelecionado: selectedFunil
          },
          timestamp: new Date().toISOString(),
          userAction: 'drag_and_drop'
        });
        
        toast.error("Movimentação entre funis bloqueada", {
          description: `Você está tentando mover "${lead.name}" de "${funilOrigem?.nome || 'Funil selecionado'}" para "${funilDestino?.nome || 'outro funil'}". Use o menu do lead (⋮) → "Mover para outro funil" para fazer essa operação de forma segura.`,
          duration: 6000,
          action: {
            label: "Entendi",
            onClick: () => {}
          }
        });
        
        // ✅ Liberar bloqueio em caso de erro
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // ✅ Validação 2: Verificar se o lead está sendo movido para o mesmo funil (consistência)
      if (lead.funil_id && lead.funil_id !== selectedFunil && lead.funil_id !== etapaDestino.funil_id) {
        console.warn('[DRAG END] ⚠️ Lead está em funil diferente do selecionado:', {
          leadFunilId: lead.funil_id,
          selectedFunilId: selectedFunil,
          etapaDestinoFunilId: etapaDestino.funil_id,
          leadNome: lead.name
        });
        // Continuar com a movimentação, mas logar para debug
      }

      // ✅ Verificar se já está na mesma etapa (movimento desnecessário)
      if (lead.etapa_id === newEtapaId) {
        console.log('[DRAG END] ℹ️ Lead já está na etapa destino - ignorando');
        // ✅ Liberar bloqueio mesmo quando ignora movimento desnecessário
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        return;
      }

      // 💾 Guardar estado original para rollback em caso de erro
      const originalEtapaId = lead.etapa_id;
      const originalFunilId = lead.funil_id;
      const etapaOrigem = etapas.find(e => e.id === originalEtapaId);

      console.log('[DRAG END] ✅ Validações OK - iniciando movimentação:', {
        leadId,
        leadNome: lead.name,
        de: etapaOrigem?.nome || 'sem etapa',
        para: etapaDestino.nome,
        funilId: etapaDestino.funil_id
      });

      // 🎨 Atualizar UI imediatamente (otimistic update)
      setLeads(currentLeads =>
        currentLeads.map(l =>
          l.id === leadId
            ? { ...l, etapa_id: newEtapaId, funil_id: etapaDestino.funil_id }
            : l
        )
      );

      // ✅ CRÍTICO: Bloqueio já deve estar ativo desde handleDragStart
      // Se não estiver, ativar agora
      if (!isMovingRef.current) {
      isMovingRef.current = true;
        console.log('🔒 [DRAG END] 🚫 BLOQUEIO ATIVADO (movimento de lead)');
      }

      // 💾 Atualizar no banco de dados
      const { error } = await supabase
        .from("leads")
        .update({
          etapa_id: newEtapaId,
          funil_id: etapaDestino.funil_id,
          stage: etapaDestino.nome.toLowerCase(),
          updated_at: new Date().toISOString() // ✅ NOTA: Tabela leads usa "updated_at", não "atualizado_em"
        })
        .eq("id", leadId);

      if (error) {
        console.error('[DRAG END] ❌ Erro na atualização do banco:', error);
        // ✅ Liberar bloqueio em caso de erro ANTES de lançar exceção
        isMovingRef.current = false;
        currentDragIdRef.current = null;
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
          blockTimeoutRef.current = null;
        }
        throw error;
      }

      // ✅ CRÍTICO: Confirmar sucesso do servidor ANTES de liberar bloqueio
      console.log('[DRAG END] ✅ Lead movido com sucesso no banco - Confirmado pelo servidor');
      toast.success(`Lead movido para "${etapaDestino.nome}"`, {
        description: `${lead.name} foi movido com sucesso`
      });

      // 🌍 Emitir evento global para sincronização com outros módulos
      emitGlobalEvent({
        type: 'funnel-stage-changed',
        data: {
          leadId: leadId,
          leadName: lead.name,
          oldStage: etapaOrigem?.nome || 'sem etapa',
          newStage: etapaDestino.nome,
          funilId: etapaDestino.funil_id,
          etapaId: newEtapaId
        },
        source: 'Funil'
      });

      // ✅ CRÍTICO: Liberar bloqueio APÓS confirmação do servidor
      isMovingRef.current = false;
      currentDragIdRef.current = null;
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      console.log('🔓 [DRAG END] ✅ BLOQUEIO LIBERADO - Após confirmação do servidor');

    } catch (error: any) {
      console.error('[DRAG END] ❌ Erro crítico ao mover lead:', error);

      // 🎯 Determinar mensagem de erro específica e útil
      let errorTitle = "Erro ao mover lead";
      let errorDescription = "Tente novamente";

      if (error?.code === 'PGRST116') {
        errorTitle = "Lead não encontrado no servidor";
        errorDescription = "O lead pode ter sido deletado";
      } else if (error?.code === '23503') {
        errorTitle = "Erro de referência";
        errorDescription = "Etapa ou funil inválido";
      } else if (error?.message?.includes('network') || !navigator.onLine) {
        errorTitle = "Erro de conexão";
        errorDescription = "Verifique sua internet";
      } else if (error?.message) {
        errorDescription = error.message;
      }

      toast.error(errorTitle, { description: errorDescription });

      // 🔄 Reverter mudança local (rollback)
      const leadId = event.active.id as string;
      const lead = leads.find(l => l.id === leadId);
      
      if (lead) {
        const originalEtapaId = dragOperation.sourceEtapa;
        const originalFunilId = lead.funil_id;

        console.log('[DRAG END] 🔄 Revertendo mudança local:', {
          leadId,
          revertendoPara: originalEtapaId
        });

        setLeads(currentLeads =>
          currentLeads.map(l =>
            l.id === leadId
              ? { ...l, etapa_id: originalEtapaId, funil_id: originalFunilId }
              : l
          )
        );
      }
    } finally {
      // ✅ CRÍTICO: Garantir que bloqueio seja sempre liberado (mesmo em caso de erro)
      if (isMovingRef.current && currentDragIdRef.current === dragId) {
        console.log('🔓 [DRAG END] ✅ BLOQUEIO LIBERADO (finally) - Garantindo liberação segura');
      isMovingRef.current = false;
        currentDragIdRef.current = null;
      }
      // ✅ Limpar timeout de segurança
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
    }
  };

  // 🎯 Calcular dados das etapas com useMemo para otimização
  const etapasFiltradas = useMemo(() =>
    etapas.filter((etapa) => etapa.funil_id === selectedFunil),
    [etapas, selectedFunil]
  );

  // ✅ OTIMIZADO - Cálculo de métricas com debounce e limitação de processamento
  // 🎯 Pré-calcular totais e métricas avançadas de todas as etapas de uma vez (mais eficiente)
  const [etapaStats, setEtapaStats] = useState<Record<string, { 
    total: number; 
    count: number; 
    leads: Lead[];
    valorMedio: number;
    taxaConversao: number;
    tempoMedio: number;
  }>>({});

  // ✅ Função otimizada para calcular métricas com limite de leads
  const calcularMétricasOtimizado = useCallback((leadsParaProcessar: Lead[], etapasParaProcessar: Etapa[]) => {
    console.log('📊 [MÉTRICAS] Iniciando cálculo otimizado:', {
      totalLeads: leadsParaProcessar.length,
      totalEtapas: etapasParaProcessar.length,
      limite: MAX_LEADS_TO_PROCESS
    });

    setCalculatingMetrics(true);
    const startTime = performance.now();

    const stats: Record<string, { 
      total: number; 
      count: number; 
      leads: Lead[];
      valorMedio: number;
      taxaConversao: number;
      tempoMedio: number;
    }> = {};
    
    // ✅ Limitar quantidade de leads processados
    const leadsLimitados = leadsParaProcessar.slice(0, MAX_LEADS_TO_PROCESS);
    const excedeuLimite = leadsParaProcessar.length > MAX_LEADS_TO_PROCESS;
    
    if (excedeuLimite) {
      console.warn(`⚠️ [MÉTRICAS] Processando apenas ${MAX_LEADS_TO_PROCESS} de ${leadsParaProcessar.length} leads para manter performance`);
    }

    // ✅ Processar por etapas (chunks)
    etapasParaProcessar.forEach((etapa, index) => {
      // Filtrar leads da etapa (usando limite)
      const leadsNaEtapa = leadsLimitados.filter(l => l.etapa_id === etapa.id);
      const count = leadsNaEtapa.length;
      
      // ✅ Calcular total apenas dos leads processados
      const total = leadsNaEtapa.reduce((sum, lead) => sum + (lead.value || 0), 0);
      
      // 📊 Valor médio por lead
      const valorMedio = count > 0 ? total / count : 0;
      
      // 📈 Taxa de conversão (quantos leads avançaram para próxima etapa)
      let taxaConversao = 0;
      if (index < etapasParaProcessar.length - 1) {
        const proximaEtapa = etapasParaProcessar[index + 1];
        const leadsProximaEtapa = leadsLimitados.filter(l => l.etapa_id === proximaEtapa.id).length;
        taxaConversao = count > 0 ? (leadsProximaEtapa / count) * 100 : 0;
      }
      
      // ⏱️ Tempo médio na etapa (otimizado - processa apenas leads visíveis)
      let tempoMedio = 0;
      if (count > 0) {
        // ✅ Processar em lotes menores para não travar
        const chunkSize = 50;
        let totalDias = 0;
            const now = new Date();

        for (let i = 0; i < leadsNaEtapa.length; i += chunkSize) {
          const chunk = leadsNaEtapa.slice(i, i + chunkSize);
          totalDias += chunk.reduce((sum, lead) => {
            const createdAt = new Date(lead.created_at || Date.now());
            const dias = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return sum + dias;
          }, 0);
        }
        
        tempoMedio = totalDias / count;
      }
      
      stats[etapa.id] = {
        total,
        count: excedeuLimite && index === 0 ? count + (leadsParaProcessar.length - MAX_LEADS_TO_PROCESS) : count,
        leads: leadsNaEtapa,
        valorMedio,
        taxaConversao,
        tempoMedio
      };
    });
    
    const endTime = performance.now();
    console.log(`✅ [MÉTRICAS] Cálculo concluído em ${(endTime - startTime).toFixed(2)}ms`);

    setEtapaStats(stats);
    setCalculatingMetrics(false);
  }, []);

  // ✅ useMemo com debounce para recalcular métricas apenas quando necessário
  useEffect(() => {
    // Limpar debounce anterior
    if (metricsDebounceRef.current) {
      clearTimeout(metricsDebounceRef.current);
    }

    // ✅ Debounce de 300ms para evitar cálculos excessivos
    metricsDebounceRef.current = setTimeout(() => {
      if (etapasFiltradas.length > 0 && leads.length > 0) {
        calcularMétricasOtimizado(leads, etapasFiltradas);
      } else {
        setEtapaStats({});
        setCalculatingMetrics(false);
      }
    }, 300);

    // ✅ Cleanup ao desmontar ou quando dependências mudarem
    return () => {
      if (metricsDebounceRef.current) {
        clearTimeout(metricsDebounceRef.current);
      }
    };
  }, [etapasFiltradas, leads, calcularMétricasOtimizado]);

  // 🎯 Função otimizada para obter total de uma etapa
  const calcularTotalEtapa = useCallback((etapaId: string) => {
    return etapaStats[etapaId]?.total || 0;
  }, [etapaStats]);

  // 🎯 Função otimizada para obter quantidade de leads em uma etapa
  const getQuantidadeLeads = useCallback((etapaId: string) => {
    return etapaStats[etapaId]?.count || 0;
  }, [etapaStats]);

  // 🎯 Função otimizada para obter leads de uma etapa
  const getLeadsEtapa = useCallback((etapaId: string) => {
    return etapaStats[etapaId]?.leads || [];
  }, [etapaStats]);

  // 🎯 Navegação horizontal suave
  const scrollHorizontal = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = 340; // Largura da coluna + gap
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }, []);

  // Função para reordenar etapas
  const handleEtapaReorder = useCallback(async (activeId: string, overId: string) => {
    if (activeId === overId) return;

    console.log('[REORDER] Iniciando reordenação:', { activeId, overId });

    // ✅ CRÍTICO: Ativar bloqueio durante reordenação de etapas
    if (isMovingRef.current) {
      console.warn('[REORDER] ⚠️ Operação de drag já em andamento - aguardando');
      return;
    }

    isMovingRef.current = true;
    console.log('🔒 [REORDER] 🚫 BLOQUEIO ATIVADO - Reordenação de etapas');

    // ✅ Timeout de segurança (5s) para reordenação de etapas
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
    }
    blockTimeoutRef.current = setTimeout(() => {
      if (isMovingRef.current) {
        console.warn('⚠️ [REORDER TIMEOUT] Liberando bloqueio após 5s de segurança');
        isMovingRef.current = false;
        blockTimeoutRef.current = null;
      }
    }, 5000);

    const activeIndex = etapasFiltradas.findIndex(etapa => etapa.id === activeId);
    const overIndex = etapasFiltradas.findIndex(etapa => etapa.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
      console.error('[REORDER] Índices não encontrados:', { activeIndex, overIndex });
      // ✅ Liberar bloqueio em caso de erro
      isMovingRef.current = false;
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      return;
    }

    // Criar nova ordem das etapas
    const reorderedEtapas = [...etapasFiltradas];
    const [movedEtapa] = reorderedEtapas.splice(activeIndex, 1);
    reorderedEtapas.splice(overIndex, 0, movedEtapa);

    console.log('[REORDER] Nova ordem:', reorderedEtapas.map(e => e.nome));

    // Atualizar posições no estado local primeiro
    const updatedEtapas = reorderedEtapas.map((etapa, index) => ({
      ...etapa,
      posicao: index + 1
    }));

    // Atualizar estado local
    setEtapas(prev =>
      prev.map(etapa =>
        etapa.funil_id === selectedFunil
          ? updatedEtapas.find(e => e.id === etapa.id) || etapa
          : etapa
      )
    );

    try {
      // ✅ BACKUP ATUALIZADO - 2024-11-01: Tenta RPC primeiro, fallback para updates individuais
      // Desabilitar temporariamente o realtime para evitar conflitos
      console.log('[REORDER] Iniciando reordenação - desabilitando realtime temporariamente');

      // ✅ Tentar usar RPC se existir (mais eficiente)
      let rpcError = null;
      if (selectedFunil) {
        try {
          const { error: rpcErr } = await supabase.rpc('reorder_etapas', {
            p_funil_id: selectedFunil,
            p_order: updatedEtapas.map(etapa => etapa.id)
          });
          if (rpcErr) {
            console.warn('[REORDER] RPC reorder_etapas não disponível, usando updates individuais:', rpcErr);
            rpcError = rpcErr;
          } else {
            console.log('[REORDER] Etapas reordenadas com sucesso via RPC - Confirmado pelo servidor');
            toast.success('Etapas reordenadas com sucesso');
            // ✅ CRÍTICO: Liberar bloqueio APÓS confirmação do servidor (via RPC)
            isMovingRef.current = false;
            if (blockTimeoutRef.current) {
              clearTimeout(blockTimeoutRef.current);
              blockTimeoutRef.current = null;
            }
            console.log('🔓 [REORDER] ✅ BLOQUEIO LIBERADO - Após confirmação do servidor (RPC)');
            return; // Sucesso via RPC, não precisa fazer updates individuais
          }
        } catch (e) {
          console.warn('[REORDER] RPC reorder_etapas não disponível, usando updates individuais');
          rpcError = e;
        }
      }

      // ✅ CRÍTICO: Fallback para updates individuais - NÃO REMOVER
      // ✅ IMPORTANTE: Tabela etapas usa campo "atualizado_em" (NÃO "updated_at")
      // Schema: Ver migration 20251022210449_fa6c8264-1153-40d0-a942-f85e5035729b.sql linha 59
      // RPC function: Ver migration 20251031221500_reorder_etapas_function.sql linha 64
      const updates = updatedEtapas.map(etapa => ({
        id: etapa.id,
        posicao: etapa.posicao,
        atualizado_em: new Date().toISOString() // ✅ CRÍTICO: Campo correto é "atualizado_em"
      }));

      // Executar todas as atualizações em paralelo para ser mais rápido
      // ✅ CRÍTICO: Usar campo "atualizado_em" (schema da tabela etapas)
      const updatePromises = updates.map(update =>
        supabase
          .from('etapas')
          .update({
            posicao: update.posicao,
            atualizado_em: update.atualizado_em // ✅ Schema: atualizado_em TIMESTAMP (migration linha 59)
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);

      // Verificar se todas as atualizações foram bem-sucedidas
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('[REORDER] Erros nas atualizações:', errors);
        throw new Error('Erro ao atualizar posições das etapas');
      }

      // ✅ CRÍTICO: Confirmar sucesso do servidor ANTES de liberar bloqueio
      console.log('[REORDER] Etapas reordenadas com sucesso no banco - Confirmado pelo servidor');
      toast.success('Etapas reordenadas com sucesso');

      // ✅ CRÍTICO: Liberar bloqueio APÓS confirmação do servidor
      isMovingRef.current = false;
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      console.log('🔓 [REORDER] ✅ BLOQUEIO LIBERADO - Após confirmação do servidor');

    } catch (error) {
      console.error('[REORDER] Erro ao reordenar etapas:', error);
      toast.error('Erro ao reordenar etapas - revertendo mudanças');

      // Reverter mudanças locais em caso de erro
      await refreshEtapas();

      // ✅ Liberar bloqueio em caso de erro
      isMovingRef.current = false;
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      console.log('🔓 [REORDER] ✅ BLOQUEIO LIBERADO - Após erro');

    } finally {
      // ✅ CRÍTICO: Garantir que bloqueio seja sempre liberado (mesmo em caso de erro)
      if (isMovingRef.current) {
        console.log('🔓 [REORDER] ✅ BLOQUEIO LIBERADO (finally) - Garantindo liberação segura');
        isMovingRef.current = false;
      }
      // ✅ Limpar timeout de segurança
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
    }
  }, [etapasFiltradas, selectedFunil]);

  const funilSelecionado = funis.find(f => f.id === selectedFunil);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">Gerencie seus leads por etapas</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Carregando funil de vendas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">Gerencie seus leads por etapas</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!funis || funis.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">Gerencie seus leads por etapas</p>
          </div>
          <NovoFunilDialog onFunilCreated={() => window.location.reload()} />
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum funil criado ainda</p>
          <NovoFunilDialog onFunilCreated={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header com indicador de conexão */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Funil de Vendas
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            {/* ✅ Indicador de loading das métricas */}
            {calculatingMetrics && (
              <div className="flex items-center gap-2 ml-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-xs text-muted-foreground">Calculando métricas...</span>
              </div>
            )}
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus leads por etapas • {isOnline ? 'Online' : 'Offline'}
            {leads.length > MAX_LEADS_TO_PROCESS && (
              <span className="ml-2 text-xs text-yellow-600">
                • Processando {MAX_LEADS_TO_PROCESS} de {leads.length} leads
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <NovoFunilDialog onFunilCreated={async () => { await refreshFunis(); await refreshEtapas(); }} />
          <NovoLeadDialog
            onLeadCreated={refreshLeads}
            triggerButton={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            }
          />
          {funilSelecionado && etapasFiltradas.length > 0 && (
            <AdicionarLeadExistenteDialog
              funilId={funilSelecionado.id}
              etapaInicial={{ id: etapasFiltradas[0].id, nome: etapasFiltradas[0].nome }}
              onLeadAdded={refreshLeads}
            />
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Label>Funil</Label>
          <select
            value={selectedFunil}
            onChange={(e) => setSelectedFunil(e.target.value)}
            className="w-full p-2 border rounded-md mt-2"
          >
            {funis.map((funil) => (
              <option key={funil.id} value={funil.id}>{funil.nome}</option>
            ))}
          </select>
        </div>
        {funilSelecionado && (
          <div className="mt-6 flex gap-2">
            <AdicionarEtapaDialog
              funilId={funilSelecionado.id}
              onEtapaAdded={async () => { await refreshEtapas(); }}
            />
            <EditarFunilDialog
              funilId={funilSelecionado.id}
              funilNome={funilSelecionado.nome}
              onFunilUpdated={async () => { await refreshFunis(); await refreshEtapas(); }}
            />
          </div>
        )}
        {/* 🎯 Botões de navegação horizontal */}
        {etapasFiltradas.length > 3 && (
          <div className="mt-6 flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollHorizontal('left')}
              title="Rolar para esquerda"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollHorizontal('right')}
              title="Rolar para direita"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          const { active } = event;
          const activeData = active.data.current;

          // Verificar se estamos arrastando uma etapa
          if (activeData?.type === 'etapa') {
            const etapa = etapasFiltradas.find(e => e.id === active.id);
            setActiveColumn(etapa || null);
          } else {
            handleDragStart(event);
          }
        }}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={etapasFiltradas.map(e => e.id)} strategy={horizontalListSortingStrategy}>
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 pb-4 min-h-[600px] scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-muted/20 hover:scrollbar-thumb-primary/50 snap-x snap-mandatory scroll-smooth"
          >
            {etapasFiltradas.map((etapa, index) => {
            // 🎯 Usar funções otimizadas pré-calculadas
            const totalEtapa = calcularTotalEtapa(etapa.id);
            const quantidadeLeads = getQuantidadeLeads(etapa.id);
            const leadsNaEtapa = getLeadsEtapa(etapa.id);
            const maxLeadsToShow = leadsPerEtapa[etapa.id] || LEADS_PER_PAGE;
            const leadsToShow = leadsNaEtapa.slice(0, maxLeadsToShow);
            const hasMoreLeads = leadsNaEtapa.length > maxLeadsToShow;

            return (
                <React.Fragment key={etapa.id}>
                  <SortableColumn
                    id={etapa.id}
                    isDragging={activeColumn?.id === etapa.id}
                  >
                <DroppableColumn
                  id={etapa.id}
                  cor={etapa.cor}
                  nome={etapa.nome}
                  quantidadeLeads={quantidadeLeads}
                  totalEtapa={totalEtapa}
                  valorMedio={etapaStats[etapa.id]?.valorMedio || 0}
                  taxaConversao={etapaStats[etapa.id]?.taxaConversao || 0}
                  tempoMedio={etapaStats[etapa.id]?.tempoMedio || 0}
                  onEtapaUpdated={async () => { await refreshEtapas(); await refreshLeads(); }}
                  isDraggingOver={dragOperation.isDragging && dragOperation.sourceEtapa !== etapa.id}
                >
                  {leadsToShow.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onDelete={async (id) => {
                        try {
                          // Remover do funil sem deletar o lead (evita falha por relacionamentos)
                          const { error } = await supabase
                            .from("leads")
                            .update({ funil_id: null, etapa_id: null })
                            .eq("id", id);
                          if (error) throw error;

                          setLeads(current => current.filter(l => l.id !== id));
                          toast.success("Lead removido do funil");
                        } catch (error) {
                          console.error("Erro ao remover do funil:", error);
                          toast.error("Erro ao remover do funil");
                        }
                      }}
                      onLeadMoved={refreshLeads}
                      isDragging={dragOperation.isDragging && dragOperation.leadId === lead.id}
                    />
                  ))}

                  {hasMoreLeads && (
                    <div className="text-center py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadMoreLeads(etapa.id)}
                        className="text-xs"
                      >
                        Carregar mais leads ({leadsNaEtapa.length - maxLeadsToShow} restantes)
                      </Button>
                    </div>
                  )}

                  {leadsNaEtapa.length === 0 && (
                    <div className={`text-center py-8 text-muted-foreground text-sm transition-all duration-200 ${
                      dragOperation.isDragging ? 'bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg' : ''
                    }`}>
                      {dragOperation.isDragging ? 'Solte aqui para mover' : 'Arraste leads para cá'}
                    </div>
                  )}
                  </DroppableColumn>
                  </SortableColumn>
                </React.Fragment>
            );
          })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeColumn ? (
            <div className="min-w-[320px] opacity-90 rotate-3 scale-105">
              <DroppableColumn
                id={activeColumn.id}
                cor={activeColumn.cor}
                nome={activeColumn.nome}
                quantidadeLeads={leads.filter(l => l.etapa_id === activeColumn.id).length}
                totalEtapa={calcularTotalEtapa(activeColumn.id)}
                onEtapaUpdated={() => {}}
                isDraggingOver={false}
              >
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Movendo etapa...
                </div>
              </DroppableColumn>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}