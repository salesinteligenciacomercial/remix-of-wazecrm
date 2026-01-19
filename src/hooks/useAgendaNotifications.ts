import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Store global para notificações de agenda
let globalAgendaCount = 0;
const listeners = new Set<(count: number) => void>();

const notifyListeners = (count: number) => {
  globalAgendaCount = count;
  listeners.forEach(listener => listener(count));
};

export const useAgendaNotifications = () => {
  const [todayCount, setTodayCount] = useState(globalAgendaCount);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const initializedRef = useRef(false);

  // Sincronizar com store global
  useEffect(() => {
    const listener = (count: number) => {
      setTodayCount(count);
    };
    
    listeners.add(listener);
    setTodayCount(globalAgendaCount);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Inicializar contagem
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    initializeNotifications();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Obter company_id do usuário
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole?.company_id) return;
      
      setCompanyId(userRole.company_id);
      await loadTodayCount(userRole.company_id);
      setupRealtimeSubscription(userRole.company_id);
    } catch (error) {
      console.error('Error initializing agenda notifications:', error);
    }
  };

  const loadTodayCount = async (companyId: string) => {
    try {
      // Definir início e fim do dia atual
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Buscar compromissos do dia que não foram cancelados
      const { data: compromissos, count } = await supabase
        .from('compromissos')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('data_hora_inicio', startOfDay.toISOString())
        .lte('data_hora_inicio', endOfDay.toISOString())
        .neq('status', 'cancelado');

      const todayAppointments = count || 0;
      console.log('📅 [AgendaNotifications] Compromissos hoje:', todayAppointments);
      notifyListeners(todayAppointments);
    } catch (error) {
      console.error('Error loading agenda today count:', error);
    }
  };

  const setupRealtimeSubscription = (companyId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`agenda-notifications-${companyId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compromissos',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          console.log('📅 [AgendaNotifications] Compromisso alterado, recarregando contagem');
          loadTodayCount(companyId);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const refreshCount = async () => {
    if (companyId) {
      await loadTodayCount(companyId);
    }
  };

  return {
    todayCount,
    refreshCount
  };
};
