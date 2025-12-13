/**
 * GlobalCallListenerV2 - Listener Global de Chamadas Refatorado
 * 
 * Responsável por:
 * - Escutar chamadas recebidas em qualquer página
 * - Gerenciar estado de chamadas ativas
 * - Prevenir chamadas duplicadas
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IncomingCallModal } from './IncomingCallModal';
import { VideoCallModalV2 } from './VideoCallModalV2';

interface IncomingCall {
  meetingId: string;
  callerId: string;
  callerName: string;
  callType: 'audio' | 'video';
}

interface ActiveCall {
  meetingId: string;
  remoteUserId: string;
  remoteUserName: string;
  callType: 'audio' | 'video';
  isCaller: boolean;
}

export const GlobalCallListenerV2 = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  // Refs para prevenir duplicação
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedMeetingsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);

  // ========== INITIALIZE USER ==========
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        console.log('[CallListener] User initialized:', user.id);
      }
    };

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ========== HANDLE INCOMING CALL ==========
  const handleIncomingSignal = useCallback(async (signal: any) => {
    // Prevent duplicate processing
    if (isProcessingRef.current) {
      console.log('[CallListener] Already processing, skip');
      return;
    }

    if (processedMeetingsRef.current.has(signal.meeting_id)) {
      console.log('[CallListener] Meeting already processed:', signal.meeting_id);
      return;
    }

    // Check if already in call
    if (activeCall || incomingCall) {
      console.log('[CallListener] Already in call, rejecting new call');
      return;
    }

    isProcessingRef.current = true;
    processedMeetingsRef.current.add(signal.meeting_id);

    try {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', signal.from_user)
        .maybeSingle();

      console.log('[CallListener] Incoming call from:', callerProfile?.full_name);

      setIncomingCall({
        meetingId: signal.meeting_id,
        callerId: signal.from_user,
        callerName: callerProfile?.full_name || 'Usuário',
        callType: signal.signal_data?.callType || 'audio',
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [activeCall, incomingCall]);

  // ========== SUBSCRIBE TO SIGNALS ==========
  useEffect(() => {
    if (!currentUserId) return;

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Reset state on user change
    processedMeetingsRef.current.clear();
    isProcessingRef.current = false;

    const channelId = `global-calls-v2-${currentUserId}-${Date.now()}`;
    console.log('[CallListener] Subscribing:', channelId);

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_signals',
          filter: `to_user=eq.${currentUserId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          console.log('[CallListener] Signal received:', signal.signal_type);

          if (signal.signal_type === 'call-request') {
            await handleIncomingSignal(signal);
          }
        }
      )
      .subscribe((status) => {
        console.log('[CallListener] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, handleIncomingSignal]);

  // ========== ACCEPT CALL ==========
  const handleAccept = async () => {
    if (!incomingCall || !currentUserId) return;

    const callData = { ...incomingCall };
    setIncomingCall(null);

    try {
      console.log('[CallListener] Accepting call:', callData.meetingId);

      // Update meeting status
      await supabase
        .from('meetings')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', callData.meetingId);

      // Send accept signal to caller
      await supabase.from('meeting_signals').insert({
        meeting_id: callData.meetingId,
        from_user: currentUserId,
        to_user: callData.callerId,
        signal_type: 'call-accept',
        signal_data: {},
      });

      // Open call modal as participant
      setActiveCall({
        meetingId: callData.meetingId,
        remoteUserId: callData.callerId,
        remoteUserName: callData.callerName,
        callType: callData.callType,
        isCaller: false,
      });

    } catch (error) {
      console.error('[CallListener] Accept error:', error);
      processedMeetingsRef.current.delete(callData.meetingId);
    }
  };

  // ========== REJECT CALL ==========
  const handleReject = async () => {
    if (!incomingCall || !currentUserId) return;

    const { meetingId, callerId } = incomingCall;
    setIncomingCall(null);

    try {
      console.log('[CallListener] Rejecting call:', meetingId);

      await supabase
        .from('meetings')
        .update({ status: 'missed' })
        .eq('id', meetingId);

      await supabase.from('meeting_signals').insert({
        meeting_id: meetingId,
        from_user: currentUserId,
        to_user: callerId,
        signal_type: 'call-reject',
        signal_data: {},
      });

    } catch (error) {
      console.error('[CallListener] Reject error:', error);
    }
  };

  // ========== END CALL ==========
  const handleEndCall = async () => {
    if (!activeCall) {
      setActiveCall(null);
      return;
    }

    const { meetingId } = activeCall;
    setActiveCall(null);
    processedMeetingsRef.current.delete(meetingId);

    try {
      await supabase
        .from('meetings')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', meetingId);
    } catch (error) {
      console.error('[CallListener] End call error:', error);
    }
  };

  // ========== RENDER ==========
  return (
    <>
      {/* Incoming Call Modal */}
      <IncomingCallModal
        open={!!incomingCall}
        callerName={incomingCall?.callerName || ''}
        callType={incomingCall?.callType || 'audio'}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Active Call Modal */}
      {activeCall && currentUserId && (
        <VideoCallModalV2
          open={true}
          onClose={handleEndCall}
          meetingId={activeCall.meetingId}
          localUserId={currentUserId}
          remoteUserId={activeCall.remoteUserId}
          remoteUserName={activeCall.remoteUserName}
          callType={activeCall.callType}
          isCaller={activeCall.isCaller}
          onCallEnded={handleEndCall}
        />
      )}
    </>
  );
};
