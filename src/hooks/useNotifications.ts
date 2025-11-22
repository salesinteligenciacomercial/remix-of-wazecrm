import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  compromisso_id?: string;
  company_id?: string;
  lida: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Solicitar permissão de notificação ao carregar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Não solicitar automaticamente, apenas quando necessário
      console.log('🔔 [NOTIFICAÇÕES] API de notificações disponível');
    }
  }, []);

  // Função para enviar notificação push do navegador
  const sendBrowserNotification = useCallback((titulo: string, mensagem: string, tag?: string) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(titulo, {
          body: mensagem,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag,
          requireInteraction: false,
        });
        console.log('🔔 [NOTIFICAÇÕES] Notificação push enviada:', titulo);
      } else if (Notification.permission === 'default') {
        // Solicitar permissão se ainda não foi solicitada
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(titulo, {
              body: mensagem,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: tag,
            });
            console.log('🔔 [NOTIFICAÇÕES] Permissão concedida e notificação enviada');
          }
        });
      }
    }
  }, []);

  // Carregar notificações do banco
  const loadNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ [NOTIFICAÇÕES] Erro ao carregar notificações:', error);
        return;
      }

      if (data) {
        setNotifications(data);
        const unread = data.filter(n => !n.lida).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao carregar notificações:', error);
    }
  }, []);

  // Carregar notificações ao montar
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Escutar novas notificações via realtime
  useEffect(() => {
    let channel: any = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notificacoes_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `usuario_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('🔔 [NOTIFICAÇÕES] Nova notificação recebida:', payload.new);
            const novaNotificacao = payload.new as Notification;
            
            // Adicionar à lista
            setNotifications(prev => [novaNotificacao, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Enviar notificação push do navegador
            if (novaNotificacao.tipo === 'lembrete_enviado') {
              sendBrowserNotification(
                novaNotificacao.titulo,
                novaNotificacao.mensagem,
                `lembrete-${novaNotificacao.compromisso_id || novaNotificacao.id}`
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sendBrowserNotification]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);

      if (error) {
        console.error('❌ [NOTIFICAÇÕES] Erro ao marcar como lida:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao marcar como lida:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('usuario_id', user.id)
        .eq('lida', false);

      if (error) {
        console.error('❌ [NOTIFICAÇÕES] Erro ao marcar todas como lidas:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao marcar todas como lidas:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ [NOTIFICAÇÕES] Erro ao deletar notificação:', error);
        return;
      }

      setNotifications(prev => {
        const notif = prev.find(n => n.id === id);
        if (notif && !notif.lida) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return prev.filter(n => n.id !== id);
      });
    } catch (error) {
      console.error('❌ [NOTIFICAÇÕES] Erro ao deletar notificação:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}
