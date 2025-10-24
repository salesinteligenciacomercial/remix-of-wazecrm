import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Target, Zap, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IAMetrics {
  agent_type: string;
  total_interactions: number;
  successful_interactions: number;
  corrections_needed: number;
  conversions_assisted: number;
  avg_response_accuracy: number;
  learning_progress: number;
}

export function TreinamentoIA() {
  const [metrics, setMetrics] = useState<IAMetrics[]>([]);
  const [config, setConfig] = useState({
    learning_mode: true,
    auto_optimization: false,
    collaborative_mode: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadConfig();
  }, []);

  const loadMetrics = async () => {
    const { data, error } = await supabase
      .from('ia_metrics')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Erro ao carregar métricas:', error);
    } else {
      setMetrics(data || []);
    }
    setLoading(false);
  };

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole) return;

    const { data, error } = await supabase
      .from('ia_configurations')
      .select('*')
      .eq('company_id', userRole.company_id)
      .maybeSingle();

    if (data) {
      setConfig({
        learning_mode: data.learning_mode,
        auto_optimization: data.auto_optimization,
        collaborative_mode: data.collaborative_mode
      });
    }
  };

  const updateConfig = async (field: string, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole) return;

    const { error } = await supabase
      .from('ia_configurations')
      .upsert({
        company_id: userRole.company_id,
        learning_mode: field === 'learning_mode' ? value : config.learning_mode,
        auto_optimization: field === 'auto_optimization' ? value : config.auto_optimization,
        collaborative_mode: field === 'collaborative_mode' ? value : config.collaborative_mode
      }, {
        onConflict: 'company_id'
      });

    if (error) {
      toast.error('Erro ao atualizar configuração');
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
      toast.success('Configuração atualizada!');
    }
  };

  const analyzePatterns = async () => {
    toast.info('Analisando padrões...');
    
    const { data, error } = await supabase.functions.invoke('ia-aprendizado', {
      body: { action: 'analyze_patterns', data: {} }
    });

    if (error) {
      toast.error('Erro ao analisar padrões');
    } else {
      toast.success(`${data.patterns?.length || 0} padrões identificados!`);
      loadMetrics();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Sistema de Aprendizado Contínuo</CardTitle>
              <CardDescription>
                A IA está aprendendo e se aprimorando com cada interação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="learning">Modo Aprendizado</Label>
                  <p className="text-xs text-muted-foreground">Aprende com interações</p>
                </div>
              </div>
              <Switch
                id="learning"
                checked={config.learning_mode}
                onCheckedChange={(v) => updateConfig('learning_mode', v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent" />
                <div>
                  <Label htmlFor="auto">Auto-otimização</Label>
                  <p className="text-xs text-muted-foreground">Melhoria automática</p>
                </div>
              </div>
              <Switch
                id="auto"
                checked={config.auto_optimization}
                onCheckedChange={(v) => updateConfig('auto_optimization', v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-success" />
                <div>
                  <Label htmlFor="collab">Modo Colaborativo</Label>
                  <p className="text-xs text-muted-foreground">IA + Humano</p>
                </div>
              </div>
              <Switch
                id="collab"
                checked={config.collaborative_mode}
                onCheckedChange={(v) => updateConfig('collaborative_mode', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metricas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metricas">Métricas de Performance</TabsTrigger>
          <TabsTrigger value="padroes">Padrões Identificados</TabsTrigger>
          <TabsTrigger value="treinamento">Dados de Treinamento</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4">
          {metrics.map((metric) => (
            <Card key={metric.agent_type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>IA de {metric.agent_type}</span>
                  <Badge variant="secondary">
                    {(metric.avg_response_accuracy * 100).toFixed(0)}% precisão
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Progresso de Aprendizado</span>
                    <span className="text-sm font-semibold">
                      {(metric.learning_progress * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={metric.learning_progress * 100} />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {metric.total_interactions}
                    </div>
                    <div className="text-xs text-muted-foreground">Interações</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-success">
                      {metric.successful_interactions}
                    </div>
                    <div className="text-xs text-muted-foreground">Bem-sucedidas</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-accent">
                      {metric.corrections_needed}
                    </div>
                    <div className="text-xs text-muted-foreground">Correções</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-warning">
                      {metric.conversions_assisted}
                    </div>
                    <div className="text-xs text-muted-foreground">Conversões</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={analyzePatterns} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Analisar Padrões de Conversão
          </Button>
        </TabsContent>

        <TabsContent value="padroes" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Padrões serão exibidos após análise de dados suficientes
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treinamento" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Histórico de treinamento e feedbacks
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}