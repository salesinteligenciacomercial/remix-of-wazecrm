import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  MessageSquare,
  Target,
  Zap,
  Award
} from "lucide-react";

export function PainelInsights() {
  const insights = {
    today: {
      conversationsHandled: 47,
      autoResponses: 38,
      humanTransfers: 9,
      avgResponseTime: "12s",
      leadsQualified: 15,
      appointmentsScheduled: 8,
    },
    trends: [
      { metric: "Taxa de Conversão", value: "+23%", trend: "up", icon: TrendingUp },
      { metric: "Tempo de Resposta", value: "-34%", trend: "up", icon: Clock },
      { metric: "Transferências", value: "-12%", trend: "up", icon: Users },
      { metric: "Satisfação", value: "+18%", trend: "up", icon: Award },
    ],
    suggestions: [
      {
        title: "Otimização de Horário",
        description: "Picos de atendimento detectados entre 14h-16h. Considere alocar mais recursos.",
        priority: "high"
      },
      {
        title: "Qualificação Automática",
        description: "67% dos leads poderiam ser qualificados automaticamente com mais perguntas.",
        priority: "medium"
      },
      {
        title: "Respostas Rápidas",
        description: "12 perguntas frequentes identificadas. Crie respostas rápidas para economizar tempo.",
        priority: "medium"
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel de Inteligência</h2>
        <p className="text-muted-foreground">Insights e métricas da IA em tempo real</p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversas Atendidas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{insights.today.conversationsHandled}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-success text-xs">
                {insights.today.autoResponses} automáticas
              </Badge>
              <Badge variant="outline" className="text-xs">
                {insights.today.humanTransfers} transferidas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Qualificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{insights.today.leadsQualified}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {((insights.today.leadsQualified / insights.today.conversationsHandled) * 100).toFixed(0)}% de taxa de qualificação
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Criados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{insights.today.appointmentsScheduled}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Conversão automática de {((insights.today.appointmentsScheduled / insights.today.leadsQualified) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tendências */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Tendências da Semana</CardTitle>
          <CardDescription>Comparação com semana anterior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {insights.trends.map((trend) => (
              <div key={trend.metric} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className={`p-2 rounded-lg ${
                  trend.trend === 'up' ? 'bg-success/10' : 'bg-destructive/10'
                }`}>
                  <trend.icon className={`h-5 w-5 ${
                    trend.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">{trend.metric}</div>
                  <div className={`text-lg font-bold ${
                    trend.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    {trend.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sugestões da IA */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Sugestões de Melhoria
          </CardTitle>
          <CardDescription>Insights automatizados para otimizar seu atendimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${
                suggestion.priority === 'high' ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <Target className={`h-5 w-5 ${
                  suggestion.priority === 'high' ? 'text-warning' : 'text-primary'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{suggestion.title}</h4>
                  <Badge variant={suggestion.priority === 'high' ? 'default' : 'outline'} className="text-xs">
                    {suggestion.priority === 'high' ? 'Alta Prioridade' : 'Média Prioridade'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance por Agente */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Performance por Agente de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "IA de Atendimento", conversations: 23, satisfaction: "94%", color: "bg-blue-500" },
              { name: "IA Vendedora", conversations: 15, satisfaction: "89%", color: "bg-purple-500" },
              { name: "IA de Suporte", conversations: 9, satisfaction: "96%", color: "bg-cyan-500" },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg ${agent.color} flex items-center justify-center`}>
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-sm text-muted-foreground">{agent.conversations} conversas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${agent.color}`}
                        style={{ width: agent.satisfaction }}
                      />
                    </div>
                    <span className="text-sm font-medium">{agent.satisfaction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
