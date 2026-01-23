import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  meeting_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'emoji' | 'system';
  created_at: string;
}

interface UseMeetingChatReturn {
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;
  sendMessage: (message: string, type?: 'text' | 'emoji' | 'system') => Promise<void>;
  markAsRead: () => void;
}

export const useMeetingChat = (
  meetingId: string | null,
  currentUserId: string,
  currentUserName: string
): UseMeetingChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastReadTimestampRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!meetingId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('meeting_chat_messages')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error loading chat messages:', error);
          return;
        }

        setMessages(data as ChatMessage[]);
        lastReadTimestampRef.current = new Date().toISOString();
      } catch (err) {
        console.error('Error loading chat messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [meetingId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_chat_messages',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Increment unread if not from current user
          if (newMessage.sender_id !== currentUserId) {
            setUnreadCount(prev => prev + 1);
            
            // Play notification sound
            playNotificationSound();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [meetingId, currentUserId]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Ignore audio errors
    }
  };

  const sendMessage = useCallback(async (
    message: string,
    type: 'text' | 'emoji' | 'system' = 'text'
  ) => {
    if (!meetingId || !message.trim()) return;

    try {
      const { error } = await supabase
        .from('meeting_chat_messages')
        .insert({
          meeting_id: meetingId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          message: message.trim(),
          message_type: type
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [meetingId, currentUserId, currentUserName]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    lastReadTimestampRef.current = new Date().toISOString();
  }, []);

  return {
    messages,
    unreadCount,
    isLoading,
    sendMessage,
    markAsRead
  };
};
