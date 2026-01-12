import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Filter, 
  BarChart3, 
  TrendingDown, 
  Clock, 
  Target,
  Brain,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Calendar,
  CheckSquare,
  GitBranch
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useAIWatcher, AIInsight } from "@/hooks/useAIWatcher";

interface ProcessInsightsReportProps {
  companyId: string | null;
  onSuggestionsGenerated?: () => void;
}

interface Funil {
  id: string;
  nome: string;
}

interface Etapa {
  id: string;
  nome: string;
  cor: string | null;
  posicao: number | null;
  funil_id: string;
}

interface Lead {
  id: string;
  etapa_id: string | null;
  funil_id: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
}

interface Bottleneck {
  etapaId: string;
  etapaNome: string;
  funilNome: string;
  leadsCount: number;
  avgDaysInStage: number;
  lossRate: number;
  severity: 'high' | 'medium' | 'low';
  type: 'time' | 'loss' | 'stuck';
}

interface StageMetrics {
  etapaId: string;
  etapaNome: string;
  funilNome: string;
  leadsCount: number;
  avgDaysInStage: number;
  lossRate: number;
  conversionRate: number;
  color: string;
}

export function ProcessInsightsReport({ companyId, onSuggestionsGenerated }: ProcessInsightsReportProps) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [selectedFunilId, setSelectedFunilId] = useState<string>("all");
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [stageMetrics, setStageMetrics] = useState<StageMetrics[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [activeTab, setActiveTab] = useState("funnel");
  const { toast } = useToast();
  
  // Real-time AI monitoring
  const { insights, unseenCount, refresh: refreshInsights, markAsSeen } = useAIWatcher();
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <MessageSquare className="h-4 w-4" />;
      case 'agenda': return <Calendar className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'funnel': return <GitBranch className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };
  
  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'conversation': return 'Conversas';
      case 'agenda': return 'Agenda';
      case 'task': return 'Tarefas';
      case 'funnel': return 'Funil';
      default: return 'Geral';
    }
  };

  useEffect(() => {
    if (companyId) {
      loadFunis();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      analyzeProcesses();
    }
  }, [selectedFunilId, companyId]);

  const loadFunis = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('funis')
      .select('id, nome')
      .eq('company_id', companyId)
      .order('nome');
    
    if (data) {
      setFunis(data);
    }
  };

  const analyzeProcesses = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const isAllFunis = selectedFunilId === "all";

      // Buscar etapas
      let etapasQuery = supabase
        .from('etapas')
        .select('id, nome, cor, posicao, funil_id')
        .eq('company_id', companyId)
        .order('posicao');

      if (!isAllFunis) {
        etapasQuery = etapasQuery.eq('funil_id', selectedFunilId);
      }

      const { data: etapasData } = await etapasQuery;

      // Buscar leads
      let leadsQuery = supabase
        .from('leads')
        .select('id, etapa_id, funil_id, created_at, updated_at, status')
        .eq('company_id', companyId);

      if (!isAllFunis) {
        leadsQuery = leadsQuery.eq('funil_id', selectedFunilId);
      }

      const { data: leadsData } = await leadsQuery;

      // Buscar nomes dos funis
      const funisMap: Record<string, string> = {};
      funis.forEach(f => funisMap[f.id] = f.nome);

      // Calcular métricas por etapa
      const now = new Date();
      const metricsMap: Record<string, {
        leads: Lead[];
        lostLeads: number;
      }> = {};

      etapasData?.forEach(etapa => {
        metricsMap[etapa.id] = { leads: [], lostLeads: 0 };
      });

      leadsData?.forEach(lead => {
        if (lead.etapa_id && metricsMap[lead.etapa_id]) {
          metricsMap[lead.etapa_id].leads.push(lead);
          if (lead.status === 'lost' || lead.status === 'perdido') {
            metricsMap[lead.etapa_id].lostLeads++;
          }
        }
      });

      const stageColors = [
        '#3b82f6', '#22c55e', '#eab308', '#a855f7', 
        '#f97316', '#06b6d4', '#ec4899', '#6366f1'
      ];

      // Calcular métricas detalhadas
      const metrics: StageMetrics[] = [];
      const bottlenecksFound: Bottleneck[] = [];

      etapasData?.forEach((etapa, index) => {
        const stageData = metricsMap[etapa.id];
        const leadsCount = stageData.leads.length;
        const totalLeads = leadsData?.length || 1;

        // Calcular tempo médio na etapa
        let totalDays = 0;
        stageData.leads.forEach(lead => {
          const createdAt = new Date(lead.updated_at || lead.created_at);
          const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          totalDays += daysDiff;
        });
        const avgDaysInStage = leadsCount > 0 ? Math.round(totalDays / leadsCount) : 0;

        // Taxa de perda
        const lossRate = leadsCount > 0 ? (stageData.lostLeads / leadsCount) * 100 : 0;

        // Taxa de conversão (leads que passaram para próxima etapa)
        const conversionRate = totalLeads > 0 ? (leadsCount / totalLeads) * 100 : 0;

        const funilNome = funisMap[etapa.funil_id] || 'Funil';

        metrics.push({
          etapaId: etapa.id,
          etapaNome: etapa.nome,
          funilNome,
          leadsCount,
          avgDaysInStage,
          lossRate,
          conversionRate,
          color: etapa.cor || stageColors[index % stageColors.length]
        });

        // Identificar gargalos
        if (avgDaysInStage > 7 && leadsCount > 3) {
          bottlenecksFound.push({
            etapaId: etapa.id,
            etapaNome: etapa.nome,
            funilNome,
            leadsCount,
            avgDaysInStage,
            lossRate,
            severity: avgDaysInStage > 14 ? 'high' : avgDaysInStage > 7 ? 'medium' : 'low',
            type: 'time'
          });
        }

        if (lossRate > 30 && leadsCount > 2) {
          bottlenecksFound.push({
            etapaId: etapa.id,
            etapaNome: etapa.nome,
            funilNome,
            leadsCount,
            avgDaysInStage,
            lossRate,
            severity: lossRate > 50 ? 'high' : lossRate > 30 ? 'medium' : 'low',
            type: 'loss'
          });
        }

        // Leads parados (muitos leads acumulados)
        if (leadsCount > 10 && conversionRate > 40) {
          bottlenecksFound.push({
            etapaId: etapa.id,
            etapaNome: etapa.nome,
            funilNome,
            leadsCount,
            avgDaysInStage,
            lossRate,
            severity: leadsCount > 20 ? 'high' : 'medium',
            type: 'stuck'
          });
        }
      });

      // Buscar sugestões pendentes
      const { count } = await supabase
        .from('ai_process_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending');

      setStageMetrics(metrics.filter(m => m.leadsCount > 0));
      setBottlenecks(bottlenecksFound);
      setPendingSuggestions(count || 0);

    } catch (error) {
      console.error('Erro ao analisar processos:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    if (!companyId) return;
    setAnalyzing(true);

    try {
      // Gerar sugestões baseadas nos gargalos encontrados
      for (const bottleneck of bottlenecks) {
        let title = '';
        let description = '';
        let suggestionType = 'melhoria';

        if (bottleneck.type === 'time') {
          title = `Otimizar tempo na etapa "${bottleneck.etapaNome}"`;
          description = `Leads estão ficando em média ${bottleneck.avgDaysInStage} dias nesta etapa. Considere criar uma rotina de follow-up mais frequente ou revisar os critérios de passagem para a próxima etapa.`;
        } else if (bottleneck.type === 'loss') {
          title = `Reduzir perda de leads na etapa "${bottleneck.etapaNome}"`;
          description = `Taxa de perda de ${bottleneck.lossRate.toFixed(1)}% nesta etapa. Revise o processo de qualificação e considere criar um playbook específico para recuperação de leads.`;
          suggestionType = 'playbook';
        } else if (bottleneck.type === 'stuck') {
          title = `Descongestionar etapa "${bottleneck.etapaNome}"`;
          description = `${bottleneck.leadsCount} leads acumulados nesta etapa. Considere adicionar mais recursos ou criar uma rotina de priorização.`;
          suggestionType = 'rotina';
        }

        // Verificar se sugestão similar já existe
        const { data: existing } = await supabase
          .from('ai_process_suggestions')
          .select('id')
          .eq('company_id', companyId)
          .eq('title', title)
          .eq('status', 'pending')
          .single();

        if (!existing) {
          await supabase.from('ai_process_suggestions').insert({
            company_id: companyId,
            title,
            suggestion_type: suggestionType,
            status: 'pending',
            details: {
              description,
              bottleneck: {
                etapaId: bottleneck.etapaId,
                etapaNome: bottleneck.etapaNome,
                funilNome: bottleneck.funilNome,
                severity: bottleneck.severity,
                metrics: {
                  leadsCount: bottleneck.leadsCount,
                  avgDaysInStage: bottleneck.avgDaysInStage,
                  lossRate: bottleneck.lossRate
                }
              },
              generatedBy: 'process_insights'
            }
          });
        }
      }

      toast({ title: "Sugestões geradas com sucesso!", description: "Acesse a aba 'Sugestões da IA' para revisar" });
      onSuggestionsGenerated?.();
      analyzeProcesses();
    } catch (error: any) {
      toast({ title: "Erro ao gerar sugestões", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500';
      default: return 'text-muted-foreground bg-muted/50';
    }
  };

  const getBottleneckIcon = (type: string) => {
    switch (type) {
      case 'time': return <Clock className="h-4 w-4" />;
      case 'loss': return <TrendingDown className="h-4 w-4" />;
      case 'stuck': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getBottleneckLabel = (type: string) => {
    switch (type) {
      case 'time': return 'Tempo Elevado';
      case 'loss': return 'Alta Perda';
      case 'stuck': return 'Congestionado';
      default: return 'Alerta';
    }
  };

  if (funis.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum funil encontrado</p>
        <p className="text-sm">Crie um funil para visualizar insights de processos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Monitoramento em Tempo Real</span>
          {unseenCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              {unseenCount} novos alertas
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => refreshInsights()}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button 
            onClick={generateSuggestions} 
            disabled={analyzing || (bottlenecks.length === 0 && insights.length === 0)}
            size="sm"
            className="gap-2"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Gerar Sugestões IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs por área */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Todos</span>
            {insights.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{insights.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversation" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Conversas</span>
            {insights.filter(i => i.type === 'conversation').length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{insights.filter(i => i.type === 'conversation').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
            {insights.filter(i => i.type === 'agenda').length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{insights.filter(i => i.type === 'agenda').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="task" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tarefas</span>
            {insights.filter(i => i.type === 'task').length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{insights.filter(i => i.type === 'task').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Funil</span>
            {insights.filter(i => i.type === 'funnel').length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{insights.filter(i => i.type === 'funnel').length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Content for each tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <InsightsList 
            insights={insights} 
            getSeverityColor={getSeverityColor}
            getInsightIcon={getInsightIcon}
            getInsightTypeLabel={getInsightTypeLabel}
            markAsSeen={markAsSeen}
          />
        </TabsContent>

        <TabsContent value="conversation" className="space-y-4 mt-4">
          <InsightsList 
            insights={insights.filter(i => i.type === 'conversation')} 
            getSeverityColor={getSeverityColor}
            getInsightIcon={getInsightIcon}
            getInsightTypeLabel={getInsightTypeLabel}
            markAsSeen={markAsSeen}
            emptyMessage="Nenhum alerta de conversas. O atendimento está fluindo bem!"
          />
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4 mt-4">
          <InsightsList 
            insights={insights.filter(i => i.type === 'agenda')} 
            getSeverityColor={getSeverityColor}
            getInsightIcon={getInsightIcon}
            getInsightTypeLabel={getInsightTypeLabel}
            markAsSeen={markAsSeen}
            emptyMessage="Nenhum alerta de agenda. Compromissos em dia!"
          />
        </TabsContent>

        <TabsContent value="task" className="space-y-4 mt-4">
          <InsightsList 
            insights={insights.filter(i => i.type === 'task')} 
            getSeverityColor={getSeverityColor}
            getInsightIcon={getInsightIcon}
            getInsightTypeLabel={getInsightTypeLabel}
            markAsSeen={markAsSeen}
            emptyMessage="Nenhum alerta de tarefas. Time produtivo!"
          />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4 mt-4">
          {/* Funnel specific content with stage metrics */}
          <div className="space-y-4">
            {/* Funnel filter */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Filtrar:</span>
              <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Todos os Funis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funis</SelectItem>
                  {funis.map((funil) => (
                    <SelectItem key={funil.id} value={funil.id}>
                      {funil.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Funnel insights */}
            <InsightsList 
              insights={insights.filter(i => i.type === 'funnel')} 
              getSeverityColor={getSeverityColor}
              getInsightIcon={getInsightIcon}
              getInsightTypeLabel={getInsightTypeLabel}
              markAsSeen={markAsSeen}
              emptyMessage="Nenhum gargalo no funil. Leads fluindo bem!"
            />

            {/* Stage Metrics */}
            {stageMetrics.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Métricas por Etapa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stageMetrics.map((metric) => (
                      <div key={metric.etapaId} className="p-3 border border-border/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: metric.color }}
                            />
                            <span className="font-medium text-sm">{metric.etapaNome}</span>
                            <Badge variant="outline" className="text-xs">
                              {metric.funilNome}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">{metric.leadsCount} leads</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Tempo Médio</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {metric.avgDaysInStage} dias
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taxa de Perda</p>
                            <p className={`font-medium flex items-center gap-1 ${metric.lossRate > 30 ? 'text-red-500' : ''}`}>
                              <TrendingDown className="h-3 w-3" />
                              {metric.lossRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Distribuição</p>
                            <p className="font-medium">
                              {metric.conversionRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <Progress value={metric.conversionRate} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      {insights.filter(i => i.severity === 'high').length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {insights.filter(i => i.severity === 'high').length} problema(s) crítico(s) detectado(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Gere sugestões da IA para receber recomendações de correção
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Subcomponent for insights list
interface InsightsListProps {
  insights: AIInsight[];
  getSeverityColor: (severity: string) => string;
  getInsightIcon: (type: string) => React.ReactNode;
  getInsightTypeLabel: (type: string) => string;
  markAsSeen: (id: string) => void;
  emptyMessage?: string;
}

function InsightsList({ 
  insights, 
  getSeverityColor, 
  getInsightIcon,
  getInsightTypeLabel,
  markAsSeen,
  emptyMessage = "Nenhum alerta encontrado. Tudo funcionando bem!"
}: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-medium text-green-700 dark:text-green-400">Tudo em ordem!</p>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {insights.map((insight) => (
        <div 
          key={insight.id}
          className={`flex items-start justify-between p-4 rounded-lg border transition-all ${getSeverityColor(insight.severity)} ${!insight.seen ? 'ring-2 ring-primary/20' : ''}`}
          onClick={() => markAsSeen(insight.id)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-background flex-shrink-0">
              {getInsightIcon(insight.type)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{insight.title}</p>
                <Badge variant="outline" className="text-xs">
                  {getInsightTypeLabel(insight.type)}
                </Badge>
                {!insight.seen && (
                  <Badge variant="default" className="text-xs bg-primary">Novo</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(insight.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={getSeverityColor(insight.severity)}>
            {insight.severity === 'high' ? 'Crítico' : insight.severity === 'medium' ? 'Médio' : 'Baixo'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
