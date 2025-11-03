import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Bot, User, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "audio" | "pdf" | "video";
  sender: "user" | "contact";
  timestamp: Date;
  delivered?: boolean;
  read?: boolean;
  mediaUrl?: string;
}

interface ConversasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
  };
}

export function ConversasModal({ open, onOpenChange, lead }: ConversasModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens do lead
  useEffect(() => {
    if (open && lead.id) {
      carregarMensagens();
      // Configurar realtime para novas mensagens
      const channel = supabase
        .channel(`conversas-lead-${lead.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `lead_id=eq.${lead.id}`
          },
          () => {
            carregarMensagens();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, lead.id]);

  // Scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const carregarMensagens = async () => {
    try {
      setLoading(true);
      
      // Buscar mensagens do lead
      const { data: messagesData, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Converter mensagens do banco para formato do componente
      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content || msg.body || "",
        type: msg.type || "text",
        sender: msg.direction === "inbound" || msg.from_user === false ? "contact" : "user",
        timestamp: new Date(msg.created_at || msg.timestamp),
        delivered: msg.status === "delivered" || msg.status === "read",
        read: msg.status === "read",
        mediaUrl: msg.media_url || msg.mediaUrl,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !lead.telefone) {
      return;
    }

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Buscar company_id
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .single();

      // Criar mensagem otimista
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageInput.trim(),
        type: "text",
        sender: "user",
        timestamp: new Date(),
        delivered: false,
        read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessageInput("");

      // Enviar via Edge Function ou API
      const { error: sendError } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          to: lead.telefone,
          message: messageInput.trim(),
          lead_id: lead.id,
          company_id: userRole?.company_id,
        },
      });

      if (sendError) throw sendError;

      toast.success("Mensagem enviada!");
      
      // Recarregar mensagens após envio
      setTimeout(() => {
        carregarMensagens();
      }, 1000);

    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
      // Remover mensagem otimista em caso de erro
      setMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {lead.nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-lg">{lead.nome}</DialogTitle>
              {lead.telefone && (
                <p className="text-sm text-muted-foreground">{lead.telefone}</p>
              )}
            </div>
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              WhatsApp
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-4 min-h-[400px]">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-muted-foreground">Carregando conversas...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Comece a conversa enviando uma mensagem
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "contact" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {lead.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`flex flex-col max-w-[70%] ${
                      message.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      {message.mediaUrl && (
                        <div className="mt-2">
                          <img
                            src={message.mediaUrl}
                            alt="Mídia"
                            className="max-w-full h-auto rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(message.timestamp, "HH:mm", { locale: ptBR })}
                      </span>
                      {message.sender === "user" && (
                        <div className="flex items-center">
                          {message.read ? (
                            <CheckCheck className="h-3 w-3 text-blue-500" />
                          ) : message.delivered ? (
                            <CheckCheck className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {message.sender === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={enviarMensagem} className="px-4 pb-4 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={lead.telefone ? "Digite sua mensagem..." : "Lead sem telefone"}
              disabled={!lead.telefone || sending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!messageInput.trim() || !lead.telefone || sending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

