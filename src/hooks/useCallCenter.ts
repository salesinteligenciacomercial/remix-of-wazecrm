import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CallRecord {
  id: string;
  company_id: string;
  lead_id: string | null;
  user_id: string;
  phone_number: string;
  lead_name: string | null;
  call_start: string;
  call_end: string | null;
  duration_seconds: number;
  status: string;
  call_result: string | null;
  notes: string | null;
  notes_required: boolean;
  created_at: string;
  updated_at: string;
}

export type CallStatus = 'idle' | 'iniciando' | 'chamando' | 'tocando' | 'conectado' | 'finalizado' | 'falha';

interface CallState {
  isActive: boolean;
  status: CallStatus;
  leadId: string | null;
  leadName: string;
  phoneNumber: string;
  callRecordId: string | null;
  startTime: Date | null;
  duration: number;
  isMuted: boolean;
}

export const useCallCenter = () => {
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    status: 'idle',
    leadId: null,
    leadName: '',
    phoneNumber: '',
    callRecordId: null,
    startTime: null,
    duration: 0,
    isMuted: false
  });

  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load call history
  const loadCallHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!userRole?.company_id) return;

      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('company_id', userRole.company_id)
        .order('call_start', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCallHistory((data as CallRecord[]) || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a call
  const startCall = useCallback(async (leadId: string | null, leadName: string, phoneNumber: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return false;
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!userRole?.company_id) {
        toast.error('Empresa não encontrada');
        return false;
      }

      // Create call record
      const { data: callRecord, error } = await supabase
        .from('call_history')
        .insert({
          company_id: userRole.company_id,
          lead_id: leadId,
          user_id: userData.user.id,
          phone_number: phoneNumber,
          lead_name: leadName,
          status: 'iniciando'
        })
        .select()
        .single();

      if (error) throw error;

      setCallState({
        isActive: true,
        status: 'iniciando',
        leadId,
        leadName,
        phoneNumber,
        callRecordId: callRecord.id,
        startTime: new Date(),
        duration: 0,
        isMuted: false
      });

      // Simulate call progression (will be replaced with real telephony integration)
      simulateCallProgression(callRecord.id);

      return true;
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast.error('Erro ao iniciar ligação');
      return false;
    }
  }, []);

  // Simulate call status changes (for testing - will be replaced with real telephony)
  const simulateCallProgression = useCallback((callId: string) => {
    // After 1s: chamando
    simulationTimeoutRef.current = setTimeout(async () => {
      setCallState(prev => ({ ...prev, status: 'chamando' }));
      await supabase.from('call_history').update({ status: 'chamando' }).eq('id', callId);

      // After 2s more: tocando
      simulationTimeoutRef.current = setTimeout(async () => {
        setCallState(prev => ({ ...prev, status: 'tocando' }));
        await supabase.from('call_history').update({ status: 'tocando' }).eq('id', callId);

        // After 2s more: conectado (simulating answer)
        simulationTimeoutRef.current = setTimeout(async () => {
          setCallState(prev => ({ ...prev, status: 'conectado' }));
          await supabase.from('call_history').update({ status: 'conectado' }).eq('id', callId);

          // Start duration counter
          durationIntervalRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
          }, 1000);
        }, 2000);
      }, 2000);
    }, 1000);
  }, []);

  // End call
  const endCall = useCallback(async (result?: string) => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }

    if (callState.callRecordId) {
      try {
        await supabase
          .from('call_history')
          .update({
            status: 'finalizado',
            call_end: new Date().toISOString(),
            duration_seconds: callState.duration,
            call_result: result || 'encerrada'
          })
          .eq('id', callState.callRecordId);
      } catch (error) {
        console.error('Erro ao finalizar ligação:', error);
      }
    }

    setCallState(prev => ({
      ...prev,
      status: 'finalizado'
    }));
  }, [callState.callRecordId, callState.duration]);

  // Save notes after call
  const saveCallNotes = useCallback(async (notes: string) => {
    if (!callState.callRecordId) return false;

    try {
      const { error } = await supabase
        .from('call_history')
        .update({ notes, notes_required: false })
        .eq('id', callState.callRecordId);

      if (error) throw error;

      // Reset call state
      setCallState({
        isActive: false,
        status: 'idle',
        leadId: null,
        leadName: '',
        phoneNumber: '',
        callRecordId: null,
        startTime: null,
        duration: 0,
        isMuted: false
      });

      await loadCallHistory();
      toast.success('Anotações salvas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
      return false;
    }
  }, [callState.callRecordId, loadCallHistory]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Get SDR metrics
  const getSDRMetrics = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!userRole?.company_id) return null;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayCalls } = await supabase
        .from('call_history')
        .select('*')
        .eq('company_id', userRole.company_id)
        .gte('call_start', today.toISOString())
        .lt('call_start', tomorrow.toISOString());

      const { data: allCalls } = await supabase
        .from('call_history')
        .select('*')
        .eq('company_id', userRole.company_id);

      const calls = (todayCalls as CallRecord[]) || [];
      const allCallsData = (allCalls as CallRecord[]) || [];

      const totalCalls = calls.length;
      const answeredCalls = calls.filter(c => c.call_result === 'atendida').length;
      const missedCalls = calls.filter(c => ['recusada', 'caixa_postal', 'falha'].includes(c.call_result || '')).length;
      const totalDuration = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      // Calculate user rankings
      const userCallCounts: Record<string, number> = {};
      allCallsData.forEach(call => {
        userCallCounts[call.user_id] = (userCallCounts[call.user_id] || 0) + 1;
      });

      return {
        totalCalls,
        answeredCalls,
        missedCalls,
        avgDuration,
        totalDuration,
        conversionRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        userRankings: userCallCounts
      };
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, []);

  return {
    callState,
    callHistory,
    isLoading,
    startCall,
    endCall,
    saveCallNotes,
    toggleMute,
    loadCallHistory,
    getSDRMetrics
  };
};
