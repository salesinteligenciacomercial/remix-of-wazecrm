/**
 * ✅ Hook para gerenciar timer de tempo gasto em tarefas
 * 
 * Funcionalidades:
 * - Iniciar/pausar timer
 * - Salvar tempo em tempo real
 * - Calcular tempo decorrido
 * - Atualizar tempo_gasto ao pausar/concluir
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseTaskTimerProps {
  taskId: string;
  initialTimeSpent?: number; // em minutos
  timeTrackingStarted?: string | null;
  timeTrackingPaused?: boolean;
  onTimeUpdated?: () => void;
}

interface UseTaskTimerReturn {
  currentTime: number; // em segundos
  isTracking: boolean;
  formattedTime: string;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
}

export function useTaskTimer({
  taskId,
  initialTimeSpent = 0,
  timeTrackingStarted = null,
  timeTrackingPaused = false,
  onTimeUpdated
}: UseTaskTimerProps): UseTaskTimerReturn {
  const [currentTime, setCurrentTime] = useState(0); // em segundos
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date | null>(null);

  // ✅ Calcular tempo decorrido baseado em tempo_gasto + tempo desde início
  const calculateCurrentTime = useCallback(() => {
    const baseTimeMinutes = initialTimeSpent || 0;
    const baseTimeSeconds = baseTimeMinutes * 60;

    if (timeTrackingStarted && !timeTrackingPaused) {
      const startTime = new Date(timeTrackingStarted).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      return baseTimeSeconds + elapsedSeconds;
    }

    return baseTimeSeconds;
  }, [initialTimeSpent, timeTrackingStarted, timeTrackingPaused]);

  // ✅ Formatar tempo em formato legível (HH:MM:SS ou MM:SS)
  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // ✅ Salvar tempo em background sem bloquear UI
  const saveTimeInBackground = useCallback(async () => {
    try {
      const baseTimeMinutes = initialTimeSpent || 0;
      const baseTimeSeconds = baseTimeMinutes * 60;
      
      if (timeTrackingStarted && !timeTrackingPaused) {
        const startTime = new Date(timeTrackingStarted).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const totalSeconds = baseTimeSeconds + elapsedSeconds;
        const totalMinutes = Math.floor(totalSeconds / 60);

        await supabase
          .from('tasks')
          .update({ tempo_gasto: totalMinutes })
          .eq('id', taskId);

        // Não mostrar toast para saves em background
      }
    } catch (error) {
      console.error('[Timer] Erro ao salvar tempo em background:', error);
    }
  }, [taskId, initialTimeSpent, timeTrackingStarted, timeTrackingPaused]);

  // ✅ Atualizar tempo atual
  useEffect(() => {
    const updateTime = () => {
      const calculated = calculateCurrentTime();
      setCurrentTime(calculated);
      setIsTracking(!!(timeTrackingStarted && !timeTrackingPaused));
    };

    updateTime();

    // ✅ Salvar tempo em tempo real a cada 30 segundos
    if (timeTrackingStarted && !timeTrackingPaused) {
      intervalRef.current = setInterval(() => {
        updateTime();

        // Salvar a cada 30 segundos
        const now = new Date();
        if (!lastSaveRef.current || (now.getTime() - lastSaveRef.current.getTime()) >= 30000) {
          saveTimeInBackground();
          lastSaveRef.current = now;
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [timeTrackingStarted, timeTrackingPaused, calculateCurrentTime, saveTimeInBackground]);

  // ✅ Iniciar timer
  const startTimer = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({
          time_tracking_iniciado: now,
          time_tracking_pausado: false
        })
        .eq('id', taskId);

      if (error) throw error;

      setIsTracking(true);
      lastSaveRef.current = new Date();
      onTimeUpdated?.();
      toast.success("Timer iniciado!");
    } catch (error: any) {
      console.error('[Timer] Erro ao iniciar timer:', error);
      toast.error(error?.message || "Erro ao iniciar timer");
    }
  }, [taskId, onTimeUpdated]);

  // ✅ Pausar timer e salvar tempo acumulado
  const pauseTimer = useCallback(async () => {
    try {
      if (!timeTrackingStarted) {
        toast.error("Timer não está rodando");
        return;
      }

      const now = new Date();
      const startTime = new Date(timeTrackingStarted);
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const totalMinutes = (initialTimeSpent || 0) + elapsedMinutes;

      const { error } = await supabase
        .from('tasks')
        .update({
          tempo_gasto: totalMinutes,
          time_tracking_iniciado: null,
          time_tracking_pausado: true
        })
        .eq('id', taskId);

      if (error) throw error;

      setIsTracking(false);
      setCurrentTime(totalMinutes * 60);
      onTimeUpdated?.();
      toast.success(`Timer pausado! Tempo total: ${formatTime(totalMinutes * 60)}`);
    } catch (error: any) {
      console.error('[Timer] Erro ao pausar timer:', error);
      toast.error(error?.message || "Erro ao pausar timer");
    }
  }, [taskId, timeTrackingStarted, initialTimeSpent, formatTime, onTimeUpdated]);

  // ✅ Parar timer (igual a pausar mas sem manter paused flag)
  const stopTimer = useCallback(async () => {
    try {
      if (!timeTrackingStarted) {
        toast.error("Timer não está rodando");
        return;
      }

      const now = new Date();
      const startTime = new Date(timeTrackingStarted);
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const totalMinutes = (initialTimeSpent || 0) + elapsedMinutes;

      const { error } = await supabase
        .from('tasks')
        .update({
          tempo_gasto: totalMinutes,
          time_tracking_iniciado: null,
          time_tracking_pausado: false
        })
        .eq('id', taskId);

      if (error) throw error;

      setIsTracking(false);
      setCurrentTime(totalMinutes * 60);
      onTimeUpdated?.();
      toast.success(`Timer parado! Tempo total: ${formatTime(totalMinutes * 60)}`);
    } catch (error: any) {
      console.error('[Timer] Erro ao parar timer:', error);
      toast.error(error?.message || "Erro ao parar timer");
    }
  }, [taskId, timeTrackingStarted, initialTimeSpent, formatTime, onTimeUpdated]);

  // ✅ Resetar timer (zerar tempo_gasto)
  const resetTimer = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          tempo_gasto: 0,
          time_tracking_iniciado: null,
          time_tracking_pausado: false
        })
        .eq('id', taskId);

      if (error) throw error;

      setIsTracking(false);
      setCurrentTime(0);
      onTimeUpdated?.();
      toast.success("Timer resetado!");
    } catch (error: any) {
      console.error('[Timer] Erro ao resetar timer:', error);
      toast.error(error?.message || "Erro ao resetar timer");
    }
  }, [taskId, onTimeUpdated]);

  return {
    currentTime,
    isTracking,
    formattedTime: formatTime(currentTime),
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer
  };
}

