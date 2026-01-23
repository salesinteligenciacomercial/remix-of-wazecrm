import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/hooks/useMeetingChat';
import { cn } from '@/lib/utils';

interface MeetingChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

const QUICK_EMOJIS = ['👍', '👏', '❤️', '😊', '🎉', '🤔', '✅', '👋'];

export const MeetingChatPanel: React.FC<MeetingChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(inputValue);
      setInputValue('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    setIsSending(true);
    try {
      await onSendMessage(emoji);
      setShowEmojis(false);
    } catch (err) {
      console.error('Failed to send emoji:', err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-4 top-4 bottom-24 w-80 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Chat da Reunião</span>
          <span className="text-xs text-muted-foreground">({messages.length})</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <MessageSquare className="h-8 w-8 opacity-50" />
            <p>Nenhuma mensagem ainda</p>
            <p className="text-xs">Seja o primeiro a enviar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const isSystem = msg.message_type === 'system';
              const isEmoji = msg.message_type === 'emoji' || /^[\p{Emoji}]+$/u.test(msg.message);

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col gap-1',
                    isOwn ? 'items-end' : 'items-start'
                  )}
                >
                  {!isOwn && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2',
                      isEmoji && 'bg-transparent text-3xl px-1 py-0',
                      !isEmoji && isOwn && 'bg-primary text-primary-foreground',
                      !isEmoji && !isOwn && 'bg-muted'
                    )}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mx-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Quick Emojis */}
      {showEmojis && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center justify-around">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1"
                disabled={isSending}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowEmojis(!showEmojis)}
          >
            <Smile className={cn('h-4 w-4', showEmojis && 'text-primary')} />
          </Button>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="h-9 text-sm"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
