import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTaskTimerParams {
  taskId: string;
  initialTimeSpent?: number; // em segundos
  timeTrackingStarted?: string | null; // ISO
  timeTrackingPaused?: boolean;
  onTimeUpdated?: () => void;
}

interface UseTaskTimerResult {
  currentTime: number; // em segundos
  isTracking: boolean;
  formattedTime: string;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
}

export function useTaskTimer({
  taskId,
  initialTimeSpent = 0,
  timeTrackingStarted = null,
  timeTrackingPaused = false,
  onTimeUpdated,
}: UseTaskTimerParams): UseTaskTimerResult {
  const [currentTime, setCurrentTime] = useState<number>(initialTimeSpent);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const startedAtRef = useRef<Date | null>(timeTrackingStarted ? new Date(timeTrackingStarted) : null);
  const intervalRef = useRef<number | null>(null);

  const clear = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Tique do relógio
  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000);
    setCurrentTime(initialTimeSpent + elapsed);
  }, [initialTimeSpent]);

  // Inicialização a partir do estado vindo do banco
  useEffect(() => {
    clear();
    setCurrentTime(initialTimeSpent);
    if (timeTrackingStarted && !timeTrackingPaused) {
      startedAtRef.current = new Date(timeTrackingStarted);
      setIsTracking(true);
      tick();
      intervalRef.current = window.setInterval(tick, 1000) as unknown as number;
    } else {
      setIsTracking(false);
      startedAtRef.current = null;
    }
    return clear;
  }, [initialTimeSpent, timeTrackingStarted, timeTrackingPaused, tick]);

  const persist = useCallback(async (fields: Record<string, any>) => {
    try {
      await supabase.from('tasks').update(fields).eq('id', taskId);
      onTimeUpdated?.();
    } catch (e) {
      // Silencioso: não quebrar UI por falha de persistência
      // console.error('[useTaskTimer] Persist error:', e);
    }
  }, [taskId, onTimeUpdated]);

  const startTimer = useCallback(async () => {
    if (isTracking) return;
    startedAtRef.current = new Date();
    setIsTracking(true);
    intervalRef.current = window.setInterval(tick, 1000) as unknown as number;
    await persist({ time_tracking_iniciado: startedAtRef.current.toISOString(), time_tracking_pausado: false });
  }, [isTracking, tick, persist]);

  const pauseTimer = useCallback(async () => {
    if (!isTracking) return;
    clear();
    // Consolidar tempo atual
    const now = new Date();
    if (startedAtRef.current) {
      const delta = Math.floor((now.getTime() - startedAtRef.current.getTime()) / 1000);
      setCurrentTime((prev) => prev + Math.max(0, delta));
    }
    startedAtRef.current = null;
    setIsTracking(false);
    await persist({ tempo_gasto: currentTime, time_tracking_iniciado: null, time_tracking_pausado: true });
  }, [isTracking, currentTime, persist]);

  const stopTimer = useCallback(async () => {
    clear();
    const now = new Date();
    if (startedAtRef.current) {
      const delta = Math.floor((now.getTime() - startedAtRef.current.getTime()) / 1000);
      startedAtRef.current = null;
      setCurrentTime((prev) => prev + Math.max(0, delta));
    }
    setIsTracking(false);
    await persist({ tempo_gasto: currentTime, time_tracking_iniciado: null, time_tracking_pausado: false });
  }, [currentTime, persist]);

  const formattedTime = (() => {
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    const seconds = currentTime % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  })();

  return { currentTime, isTracking, formattedTime, startTimer, pauseTimer, stopTimer };
}
