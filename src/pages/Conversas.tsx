import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversationListItem } from "@/components/conversas/ConversationListItem";
import { ConversationHeader } from "@/components/conversas/ConversationHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Conversa {
  id: string;
  numero: string;
  telefone_formatado: string;
  nome_contato: string;
  ultima_mensagem: string;
  created_at: string;
  status: string;
  origem: string;
}

interface ConversaMessage {
  id: string;
  mensagem: string;
  fromme: boolean;
  created_at: string;
  tipo_mensagem: string | null;
  midia_url: string | null;
  arquivo_nome: string | null;
}

export default function Conversas() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [messages, setMessages] = useState<ConversaMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  useEffect(() => {
    carregarConversas();
  }, []);

  const carregarConversas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.company_id) {
        toast.error("Usuário não está associado a uma empresa");
        return;
      }

      // Buscar conversas agrupadas por número de telefone
      const { data, error } = await supabase
        .from("conversas")
        .select("*")
        .eq("company_id", userRole.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Agrupar conversas por telefone e pegar a última mensagem de cada uma
      const conversasAgrupadas = new Map<string, Conversa>();
      
      (data || []).forEach((conv: any) => {
        const telefone = conv.telefone_formatado || conv.numero;
        if (!conversasAgrupadas.has(telefone)) {
          conversasAgrupadas.set(telefone, {
            id: conv.id,
            numero: telefone,
            telefone_formatado: telefone,
            nome_contato: conv.nome_contato || telefone,
            ultima_mensagem: conv.mensagem || "",
            created_at: conv.created_at,
            status: conv.status || "recebida",
            origem: conv.origem || "WhatsApp",
          });
        }
      });

      setConversas(Array.from(conversasAgrupadas.values()));
    } catch (error: any) {
      console.error("Erro ao carregar conversas:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  const conversasFiltradas = conversas.filter((conv) =>
    conv.nome_contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.numero.includes(searchTerm)
  );

  const abrirConversa = async (conversa: Conversa) => {
    setSelectedConversa(conversa);
    setLoadingMessages(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.company_id) return;

      // Carregar mensagens da conversa
      const { data, error } = await supabase
        .from("conversas")
        .select("*")
        .eq("company_id", userRole.company_id)
        .eq("telefone_formatado", conversa.telefone_formatado)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Coluna Esquerda - Lista de Conversas */}
      <Card className="w-96 flex flex-col">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando conversas...</p>
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                </p>
              </div>
            ) : (
              <div>
                {conversasFiltradas.map((conversa) => (
                  <ConversationListItem
                    key={conversa.id}
                    contactName={conversa.nome_contato}
                    channel="whatsapp"
                    lastMessage={conversa.ultima_mensagem}
                    timestamp={new Date(conversa.created_at)}
                    unread={0}
                    isSelected={selectedConversa?.id === conversa.id}
                    onClick={() => abrirConversa(conversa)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Coluna Direita - Conteúdo da Conversa */}
      <Card className="flex-1 flex flex-col">
        {selectedConversa ? (
          <>
            <ConversationHeader
              contactName={selectedConversa.nome_contato}
              channel="whatsapp"
              showInfoPanel={showInfoPanel}
              onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
            />
            <Separator />
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.fromme ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg p-3 ${
                        message.fromme 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.mensagem}
                        </p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <Separator />
            <div className="p-4 flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button>
                Enviar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Selecione uma conversa para visualizar
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

