import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Send,
  Eye,
  MessageSquare,
  TrendingUp,
  Users,
  Calendar,
  Search,
  Download,
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campanha {
  id: string;
  nome: string;
  data_criacao: string;
  total_enviados: number;
  total_visualizados: number;
  total_respostas: number;
  total_nao_abriram: number;
  total_conversoes: number;
  taxa_resposta: number;
  taxa_visualizacao: number;
  taxa_conversao: number;
}

export function CampanhasDashboard() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  useEffect(() => {
    loadCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadCampanhas();
    }
  }, [companyId, selectedPeriod]);

  const loadCompanyId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userRole?.company_id) {
        setCompanyId(userRole.company_id);
      }
    } catch (error) {
      console.error("Erro ao carregar company_id:", error);
    }
  };

  const loadCampanhas = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      // Buscar todas as conversas - tentar com campos de campanha primeiro
      let query = supabase
        .from("conversas")
        .select("id, mensagem, status, tipo_mensagem, nome_contato, lead_id, campanha_nome, campanha_id, created_at, delivered, read")
        .eq("company_id", companyId)
        .not("campanha_nome", "is", null)
        .order("created_at", { ascending: false });
      
      // Aplicar filtro de período
      if (selectedPeriod !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (selectedPeriod) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data: conversas, error } = await query;

      if (error) {
        console.error("Erro ao buscar conversas:", error);
        
        // Se o erro for porque os campos não existem, tentar sem os campos
        if (error.code === "42703" || error.message?.includes("does not exist")) {
          console.warn("Campos de campanha não existem. Buscando sem filtro de campanha...");
          
          // Buscar sem os campos de campanha
          const { data: allConversas, error: errorAll } = await supabase
            .from("conversas")
            .select("id, mensagem, status, tipo_mensagem, nome_contato, lead_id, created_at")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });
          
          if (errorAll) {
            console.error("Erro ao buscar conversas:", errorAll);
            toast.error("Erro ao carregar conversas. Verifique a conexão com o banco de dados.");
            setCampanhas([]);
            setLoading(false);
            return;
          }
          
          // Se não há conversas ou não há campanhas, retornar vazio
          if (!allConversas || allConversas.length === 0) {
            setCampanhas([]);
            setLoading(false);
            return;
          }
          
          // Mostrar aviso que precisa aplicar migration
          setMigrationNeeded(true);
          setCampanhas([]);
          setLoading(false);
          return;
        }
        
        toast.error("Erro ao carregar campanhas: " + (error.message || "Erro desconhecido"));
        setCampanhas([]);
        setLoading(false);
        return;
      }

      if (!conversas || conversas.length === 0) {
        setCampanhas([]);
        setLoading(false);
        return;
      }

      // Agrupar por campanha
      const campanhasMap = new Map<string, {
        nome: string;
        data_criacao: string;
        enviados: Set<string>; // IDs de leads únicos
        visualizados: Set<string>;
        respostas: Set<string>;
        conversoes: Set<string>;
        dataEnvio: Map<string, string>; // lead_id -> data do envio
      }>();

      if (conversas && Array.isArray(conversas)) {
        conversas.forEach((conv: any) => {
          if (!conv) return;
          
          const campanhaNome = conv.campanha_nome || "Sem nome";
          const campanhaId = conv.campanha_id || campanhaNome;
          const leadId = conv.lead_id;

          if (!campanhasMap.has(campanhaId)) {
            campanhasMap.set(campanhaId, {
              nome: campanhaNome,
              data_criacao: conv.created_at || new Date().toISOString(),
              enviados: new Set(),
              visualizados: new Set(),
              respostas: new Set(),
              conversoes: new Set(),
              dataEnvio: new Map(),
            });
          }

          const campanha = campanhasMap.get(campanhaId);
          if (!campanha) return;

          // Contar enviados (leads únicos)
          if (leadId) {
            campanha.enviados.add(leadId);
            // Guardar data do envio para verificar respostas posteriores
            if (conv.created_at && !campanha.dataEnvio.has(leadId)) {
              campanha.dataEnvio.set(leadId, conv.created_at);
            }
          }

          // Contar visualizados (read = true)
          if (conv.read && leadId) {
            campanha.visualizados.add(leadId);
          }
        });
      }

      // Buscar mensagens recebidas dos leads após o envio da campanha
      if (campanhasMap.size > 0 && conversas && Array.isArray(conversas)) {
        const allLeadIds = Array.from(new Set(
          conversas.map((c: any) => c.lead_id).filter(Boolean) || []
        ));

        if (allLeadIds.length > 0) {
          // Buscar todas as mensagens recebidas desses leads
          const { data: mensagensRecebidas, error: errorMensagens } = await supabase
            .from("conversas")
            .select("id, lead_id, created_at, status")
            .in("lead_id", allLeadIds)
            .eq("company_id", companyId)
            .neq("status", "Enviada")
            .order("created_at", { ascending: true });
          
          if (errorMensagens) {
            console.error("Erro ao buscar mensagens recebidas:", errorMensagens);
          }

          // Verificar quais leads responderam após receber a campanha
          if (mensagensRecebidas && Array.isArray(mensagensRecebidas)) {
            mensagensRecebidas.forEach((msg: any) => {
              if (!msg || !msg.lead_id) return;

              // Encontrar a campanha deste lead
              // NOTA: conversas não tem campos campanha_id ou campanha_nome no schema
              // Esta funcionalidade precisa ser implementada adicionando essas colunas
              const convCampanha = conversas?.find((c: any) => c.lead_id === msg.lead_id);
              if (convCampanha && false) { // Desabilitado até colunas serem adicionadas
                const campanhaId = ""; // convCampanha.campanha_id || convCampanha.campanha_nome;
                const campanha = campanhasMap.get(campanhaId);
                
                if (campanha && msg.created_at) {
                  const dataEnvio = campanha.dataEnvio.get(msg.lead_id);
                  // Se a mensagem foi recebida após o envio da campanha, conta como resposta
                  try {
                    if (dataEnvio && new Date(msg.created_at) > new Date(dataEnvio)) {
                      campanha.respostas.add(msg.lead_id);
                    }
                  } catch (dateError) {
                    console.error("Erro ao comparar datas:", dateError);
                  }
                }
              }
            });
          }
        }
      }

      // Buscar leads que tiveram conversão (status negociacao ou ganho)
      if (campanhasMap.size > 0 && conversas && Array.isArray(conversas)) {
        const leadIds = Array.from(new Set(
          conversas.map((c: any) => c.lead_id).filter(Boolean) || []
        ));

        if (leadIds.length > 0) {
          const { data: leads, error: errorLeads } = await supabase
            .from("leads")
            .select("id, status")
            .in("id", leadIds)
            .in("status", ["negociacao", "ganho"]);
          
          if (errorLeads) {
            console.error("Erro ao buscar leads para conversão:", errorLeads);
          } else {
            if (leads && Array.isArray(leads)) {
              leads.forEach((lead: any) => {
                if (!lead || !lead.id) return;
                
                // Encontrar campanha do lead
                // NOTA: conversas não tem campos campanha_id ou campanha_nome no schema
                const conv = conversas?.find((c: any) => c.lead_id === lead.id);
                if (conv && false) { // Desabilitado até colunas serem adicionadas
                  const campanhaId = ""; // conv.campanha_id || conv.campanha_nome;
                  const campanha = campanhasMap.get(campanhaId);
                  if (campanha && lead.status === "ganho") {
                    campanha.conversoes.add(lead.id);
                  }
                }
              });
            }
          }
        }
      }

      // Converter para array e calcular métricas
      const campanhasArray: Campanha[] = Array.from(campanhasMap.entries()).map(
        ([id, data]) => {
          const totalEnviados = data.enviados.size;
          const totalVisualizados = data.visualizados.size;
          const totalRespostas = data.respostas.size;
          const totalNaoAbriram = totalEnviados - totalVisualizados;
          const totalConversoes = data.conversoes.size;

          return {
            id,
            nome: data.nome,
            data_criacao: data.data_criacao,
            total_enviados: totalEnviados,
            total_visualizados: totalVisualizados,
            total_respostas: totalRespostas,
            total_nao_abriram: totalNaoAbriram,
            total_conversoes: totalConversoes,
            taxa_resposta: totalEnviados > 0 ? (totalRespostas / totalEnviados) * 100 : 0,
            taxa_visualizacao: totalEnviados > 0 ? (totalVisualizados / totalEnviados) * 100 : 0,
            taxa_conversao: totalEnviados > 0 ? (totalConversoes / totalEnviados) * 100 : 0,
          };
        }
      );

      // Ordenar por data (mais recente primeiro)
      campanhasArray.sort((a, b) => 
        new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
      );

      setCampanhas(campanhasArray);
    } catch (error: any) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar relatório de campanhas");
    } finally {
      setLoading(false);
    }
  };

  const filteredCampanhas = campanhas.filter((campanha) =>
    campanha.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStats = campanhas.reduce(
    (acc, campanha) => ({
      enviados: acc.enviados + campanha.total_enviados,
      visualizados: acc.visualizados + campanha.total_visualizados,
      respostas: acc.respostas + campanha.total_respostas,
      conversoes: acc.conversoes + campanha.total_conversoes,
    }),
    { enviados: 0, visualizados: 0, respostas: 0, conversoes: 0 }
  );

  const mediaTaxaResposta =
    campanhas.length > 0
      ? campanhas.reduce((acc, c) => acc + c.taxa_resposta, 0) / campanhas.length
      : 0;
  const mediaTaxaVisualizacao =
    campanhas.length > 0
      ? campanhas.reduce((acc, c) => acc + c.taxa_visualizacao, 0) / campanhas.length
      : 0;
  const mediaTaxaConversao =
    campanhas.length > 0
      ? campanhas.reduce((acc, c) => acc + c.taxa_conversao, 0) / campanhas.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Campanhas</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das suas campanhas de disparo em massa
          </p>
        </div>
        <Button variant="outline" onClick={loadCampanhas} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Alerta de Migration Necessária */}
      {migrationNeeded && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-2">
              <strong>Migration Necessária</strong>
              <p>
                Os campos de campanha não existem no banco de dados. É necessário aplicar a migration para que o relatório funcione.
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 mt-2">
                <p className="text-sm font-mono text-xs mb-2">
                  <strong>Arquivo:</strong> 20251121000000_add_campanha_fields_to_conversas.sql
                </p>
                <p className="text-sm mb-2">
                  <strong>SQL para executar no Supabase Dashboard (SQL Editor):</strong>
                </p>
                <div className="bg-gray-50 p-3 rounded border font-mono text-xs overflow-x-auto mb-3">
                  <pre className="whitespace-pre-wrap">
{`-- Adicionar campos de campanha na tabela conversas
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS campanha_nome TEXT,
ADD COLUMN IF NOT EXISTS campanha_id TEXT;

-- Adicionar campos de rastreamento de leitura
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_id ON public.conversas(campanha_id);
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_nome ON public.conversas(campanha_nome);`}
                  </pre>
                </div>
                <p className="text-sm mb-2">
                  <strong>Como aplicar:</strong>
                </p>
                <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                  <li>Acesse o Supabase Dashboard</li>
                  <li>Vá em SQL Editor</li>
                  <li>Cole e execute o SQL acima</li>
                  <li>Clique em "Tentar Novamente" após executar</li>
                </ol>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const sql = `-- Adicionar campos de campanha na tabela conversas
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS campanha_nome TEXT,
ADD COLUMN IF NOT EXISTS campanha_id TEXT;

-- Adicionar campos de rastreamento de leitura
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_id ON public.conversas(campanha_id);
CREATE INDEX IF NOT EXISTS idx_conversas_campanha_nome ON public.conversas(campanha_nome);`;
                      navigator.clipboard.writeText(sql);
                      toast.success("SQL copiado para a área de transferência!");
                    }}
                  >
                    Copiar SQL
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setMigrationNeeded(false);
                      loadCampanhas();
                    }}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{totalStats.enviados}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visualizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{totalStats.visualizados}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mediaTaxaVisualizacao.toFixed(1)}% média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{totalStats.respostas}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mediaTaxaResposta.toFixed(1)}% média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{totalStats.conversoes}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mediaTaxaConversao.toFixed(1)}% média
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar Campanha</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da campanha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Carregando campanhas...</p>
            </div>
          ) : filteredCampanhas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma campanha encontrada
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Campanha</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Enviados</TableHead>
                    <TableHead className="text-right">Visualizados</TableHead>
                    <TableHead className="text-right">Não Abriram</TableHead>
                    <TableHead className="text-right">Respostas</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                    <TableHead className="text-right">Taxa Visualização</TableHead>
                    <TableHead className="text-right">Taxa Resposta</TableHead>
                    <TableHead className="text-right">Taxa Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampanhas.map((campanha) => (
                    <TableRow key={campanha.id}>
                      <TableCell className="font-medium">
                        {campanha.nome}
                      </TableCell>
                      <TableCell>
                        {format(new Date(campanha.data_criacao), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{campanha.total_enviados}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-blue-500">
                          {campanha.total_visualizados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {campanha.total_nao_abriram}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-green-500">
                          {campanha.total_respostas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-purple-500">
                          {campanha.total_conversoes}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold">
                          {campanha.taxa_visualizacao.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold">
                          {campanha.taxa_resposta.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-purple-600">
                          {campanha.taxa_conversao.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

