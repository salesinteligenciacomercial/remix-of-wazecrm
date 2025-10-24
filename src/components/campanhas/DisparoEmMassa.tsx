import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Send, 
  Users, 
  Calendar,
  Image as ImageIcon,
  FileText,
  Loader2,
  Check,
  Filter
} from "lucide-react";
import { toast } from "sonner";

export function DisparoEmMassa() {
  const [campanhaOpen, setCampanhaOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "texto",
    mensagem: "",
    segmentacao: "todos",
    agendamento: "",
    arquivo: null as File | null,
  });

  const campanhasRecentes = [
    {
      id: "1",
      nome: "Promoção Black Friday",
      status: "enviada",
      total: 150,
      lidos: 123,
      respondidos: 45,
      data: "2024-01-15",
    },
    {
      id: "2",
      nome: "Follow-up Pendentes",
      status: "agendada",
      total: 78,
      data: "2024-01-20",
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 20MB");
        return;
      }
      setFormData({ ...formData, arquivo: file });
      toast.success("Arquivo anexado com sucesso");
    }
  };

  const handleEnviar = async () => {
    if (!formData.mensagem.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setLoading(true);

    try {
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Campanha ${formData.agendamento ? 'agendada' : 'enviada'} com sucesso!`);
      setCampanhaOpen(false);
      
      // Reset form
      setFormData({
        nome: "",
        tipo: "texto",
        mensagem: "",
        segmentacao: "todos",
        agendamento: "",
        arquivo: null,
      });
    } catch (error: any) {
      toast.error("Erro ao enviar campanha");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      enviada: <Badge className="bg-success">Enviada</Badge>,
      agendada: <Badge className="bg-info">Agendada</Badge>,
      rascunho: <Badge variant="outline">Rascunho</Badge>,
    };
    return badges[status as keyof typeof badges];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Disparo em Massa</h2>
          <p className="text-muted-foreground">Envie mensagens segmentadas via WhatsApp</p>
        </div>
        <Dialog open={campanhaOpen} onOpenChange={setCampanhaOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Campanha de Disparo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha *</Label>
                <Input
                  placeholder="Ex: Promoção Janeiro 2024"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Mídia</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Apenas Texto</SelectItem>
                    <SelectItem value="imagem">Imagem + Texto</SelectItem>
                    <SelectItem value="video">Vídeo + Texto</SelectItem>
                    <SelectItem value="documento">Documento + Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo !== "texto" && (
                <div className="space-y-2">
                  <Label>Arquivo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept={
                        formData.tipo === "imagem" ? "image/*" :
                        formData.tipo === "video" ? "video/*" :
                        ".pdf,.doc,.docx"
                      }
                      onChange={handleFileChange}
                    />
                    {formData.arquivo && (
                      <Badge className="bg-success">
                        <Check className="h-3 w-3 mr-1" />
                        Anexado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Tamanho máximo: 20MB</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea
                  placeholder="Digite a mensagem que será enviada..."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  rows={6}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Use variáveis: {'{nome}'}, {'{empresa}'}, {'{valor}'}</span>
                  <span>{formData.mensagem.length}/4096 caracteres</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Segmentação</Label>
                <Select 
                  value={formData.segmentacao} 
                  onValueChange={(value) => setFormData({ ...formData, segmentacao: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os leads</SelectItem>
                    <SelectItem value="etapa_novo">Leads: Novos</SelectItem>
                    <SelectItem value="etapa_qualificado">Leads: Qualificados</SelectItem>
                    <SelectItem value="tag_cliente">Tag: Cliente</SelectItem>
                    <SelectItem value="tag_interesse">Tag: Interesse</SelectItem>
                    <SelectItem value="sem_resposta">Sem resposta há 7 dias</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <Users className="h-3 w-3 inline mr-1" />
                  Aproximadamente 150 contatos serão alcançados
                </p>
              </div>

              <div className="space-y-2">
                <Label>Agendamento (Opcional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.agendamento}
                  onChange={(e) => setFormData({ ...formData, agendamento: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para enviar imediatamente
                </p>
              </div>

              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm">
                  <strong>⚠️ Importante:</strong> Respeite as regras do WhatsApp para evitar bloqueios:
                </p>
                <ul className="text-xs space-y-1 mt-2 ml-4">
                  <li>• Envie apenas para contatos que autorizaram</li>
                  <li>• Evite spam ou mensagens não solicitadas</li>
                  <li>• Respeite horários comerciais</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCampanhaOpen(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEnviar}
                  disabled={loading || !formData.mensagem.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : formData.agendamento ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Envio
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Agora
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Neste mês</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Abertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">82%</div>
            <p className="text-xs text-muted-foreground mt-1">Média geral</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">34%</div>
            <p className="text-xs text-muted-foreground mt-1">Conversões ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Campanhas Recentes */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Campanhas Recentes</CardTitle>
          <CardDescription>Histórico e performance das últimas campanhas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campanhasRecentes.map((campanha) => (
              <div
                key={campanha.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{campanha.nome}</h4>
                    {getStatusBadge(campanha.status)}
                  </div>
                  {campanha.status === "enviada" ? (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{campanha.total} enviadas</span>
                      <span>{campanha.lidos} lidas ({((campanha.lidos! / campanha.total) * 100).toFixed(0)}%)</span>
                      <span>{campanha.respondidos} responderam</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {campanha.total} destinatários • Agendada para {new Date(campanha.data).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
