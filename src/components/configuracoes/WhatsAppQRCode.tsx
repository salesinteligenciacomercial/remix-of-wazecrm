import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, CheckCircle, XCircle, RefreshCw, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WhatsAppQRCode() {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [instanceName, setInstanceName] = useState("");
  const [showNewInstance, setShowNewInstance] = useState(false);

  useEffect(() => {
    loadConnections();
    
    const interval = setInterval(() => {
      loadConnections();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userRole?.company_id) return;

      const { data } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('company_id', userRole.company_id)
        .order('created_at', { ascending: false });

      if (data) {
        setConnections(data);
        if (!selectedConnection && data.length > 0) {
          setSelectedConnection(data[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
    }
  };

  const generateQRCode = async () => {
    if (!instanceName.trim()) {
      toast.error("Digite um nome para a instância");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userRole?.company_id) throw new Error("Empresa não encontrada");

      const connectionData = {
        company_id: userRole.company_id,
        instance_name: instanceName.toUpperCase(),
        evolution_api_url: import.meta.env.VITE_EVOLUTION_API_URL || 'https://api.evolutionapi.com',
        status: 'connecting',
        qr_code_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      };

      const { data: conn, error: connError } = await supabase
        .from('whatsapp_connections')
        .insert(connectionData)
        .select()
        .single();

      if (connError) throw connError;
      
      setSelectedConnection(conn);
      const mockQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`whatsapp-${instanceName}-${Date.now()}`)}`;
      setQrCode(mockQR);
      setShowNewInstance(false);
      setInstanceName("");

      toast.success("QR Code gerado! Escaneie com seu WhatsApp");
      loadConnections();
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error(error.message || "Erro ao gerar QR Code");
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success("Instância removida");
      if (selectedConnection?.id === connectionId) {
        setSelectedConnection(null);
        setQrCode("");
      }
      loadConnections();
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast.error("Erro ao remover instância");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      disconnected: <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Desconectado</Badge>,
      connecting: <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Conectando...</Badge>,
      connected: <Badge className="gap-1 bg-success"><CheckCircle className="h-3 w-3" /> Conectado</Badge>,
    };
    return badges[status as keyof typeof badges] || badges.disconnected;
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-success" />
              Instâncias WhatsApp
            </CardTitle>
            <CardDescription>
              Gerencie múltiplas conexões WhatsApp via Evolution API
            </CardDescription>
          </div>
          <Button onClick={() => setShowNewInstance(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNewInstance && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            <Label>Nome da Nova Instância</Label>
            <Input
              placeholder="Ex: CENTRAL, VENDAS, SUPORTE"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={generateQRCode} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
              <Button variant="outline" onClick={() => {setShowNewInstance(false); setInstanceName("");}}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{conn.instance_name}</p>
                      {conn.whatsapp_number && (
                        <p className="text-xs text-muted-foreground">{conn.whatsapp_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conn.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConnection(conn.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {conn.status === 'connecting' && selectedConnection?.id === conn.id && qrCode && (
                  <div className="mt-3 p-3 bg-background rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto border" />
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Escaneie com WhatsApp em até 2 minutos
                    </p>
                  </div>
                )}
                
                {conn.last_connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Última conexão: {new Date(conn.last_connected_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
            
            {connections.length === 0 && !showNewInstance && (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma instância configurada</p>
                <p className="text-sm">Clique em "Nova Instância" para começar</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Importante:</strong> Cada instância deve usar um número WhatsApp diferente.
            Configure o webhook da Evolution API para: <code className="bg-muted px-1 py-0.5 rounded">
              {window.location.origin}/functions/v1/webhook-conversas?instance=NOME_INSTANCIA
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
