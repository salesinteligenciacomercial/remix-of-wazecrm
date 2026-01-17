import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  XCircle, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Lightbulb
} from "lucide-react";
import { Bar } from "react-chartjs-2";

interface LossReasonsReportProps {
  userCompanyId: string | null;
  globalFilters?: {
    period: string;
    startDate?: string;
    endDate?: string;
  };
}

interface LossReasonData {
  reason: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
}

const LOSS_REASON_LABELS: Record<string, string> = {
  'preco': 'Preço muito alto',
  'concorrencia': 'Escolheu concorrente',
  'timing': 'Momento inadequado',
  'sem_resposta': 'Sem resposta/Sumiu',
  'nao_qualificado': 'Lead não qualificado',
  'orcamento': 'Sem orçamento',
  'funcionalidade': 'Falta funcionalidade',
  'outro': 'Outro motivo',
  'nao_informado': 'Não informado'
};

const LOSS_REASON_SUGGESTIONS: Record<string, string> = {
  'preco': 'Considere revisar sua política de descontos ou criar pacotes alternativos',
  'concorrencia': 'Analise o diferencial competitivo e destaque seus pontos fortes',
  'timing': 'Implemente um sistema de follow-up para retomar contato no momento certo',
  'sem_resposta': 'Melhore a cadência de contato e use múltiplos canais',
  'nao_qualificado': 'Refine os critérios de qualificação no início do funil',
  'orcamento': 'Ofereça opções de parcelamento ou versões mais acessíveis',
  'funcionalidade': 'Colete feedback para o roadmap de produto',
  'outro': 'Analise os motivos específicos para identificar padrões',
  'nao_informado': 'Treine a equipe para registrar o motivo de perda'
};

export function LossReasonsReport({ userCompanyId, globalFilters }: LossReasonsReportProps) {
  const [lossReasons, setLossReasons] = useState<LossReasonData[]>([]);
  const [totalLost, setTotalLost] = useState({ count: 0, value: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userCompanyId) {
      fetchLossReasons();
    }
  }, [userCompanyId, globalFilters]);

  const fetchLossReasons = async () => {
    if (!userCompanyId) return;
    setLoading(true);

    try {
      // Calcular datas baseado no período
      let startDate: Date | null = null;
      const now = new Date();
      
      if (globalFilters?.period && globalFilters.period !== 'all') {
        switch (globalFilters.period) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStart, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
      }

      // Buscar leads perdidos
      let query = supabase
        .from("leads")
        .select("id, value, loss_reason, lost_at")
        .eq("company_id", userCompanyId)
        .eq("status", "perdido");

      if (startDate) {
        query = query.gte('lost_at', startDate.toISOString());
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      const allLeads = leads || [];
      
      // Calcular totais
      const totalCount = allLeads.length;
      const totalValue = allLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      setTotalLost({ count: totalCount, value: totalValue });

      // Agrupar por motivo
      const reasonsMap: Record<string, { count: number; value: number }> = {};
      
      allLeads.forEach(lead => {
        const reason = lead.loss_reason || 'nao_informado';
        if (!reasonsMap[reason]) {
          reasonsMap[reason] = { count: 0, value: 0 };
        }
        reasonsMap[reason].count++;
        reasonsMap[reason].value += Number(lead.value) || 0;
      });

      // Converter para array e calcular percentuais
      const reasonsArray: LossReasonData[] = Object.entries(reasonsMap)
        .map(([reason, data]) => ({
          reason,
          label: LOSS_REASON_LABELS[reason] || reason,
          count: data.count,
          value: data.value,
          percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      setLossReasons(reasonsArray);

    } catch (error) {
      console.error("Erro ao carregar motivos de perda:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const chartData = {
    labels: lossReasons.slice(0, 5).map(r => r.label),
    datasets: [
      {
        label: 'Quantidade de Perdas',
        data: lossReasons.slice(0, 5).map(r => r.count),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (totalLost.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Motivos de Perda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda perdida no período</p>
            <p className="text-sm">Ótimo trabalho! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Análise de Perdas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Total de Perdas</p>
              <p className="text-2xl font-bold text-red-600">{totalLost.count}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor Perdido</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLost.value)}</p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-48">
            <Bar data={chartData} options={chartOptions} />
          </div>

          {/* Lista detalhada */}
          <div className="space-y-3">
            {lossReasons.map((reason) => (
              <div key={reason.reason} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{reason.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reason.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(reason.value)}
                    </span>
                  </div>
                </div>
                <Progress value={reason.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sugestões */}
      {lossReasons.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lightbulb className="h-5 w-5" />
              Sugestões de Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lossReasons.slice(0, 3).map((reason) => (
              <div key={reason.reason} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {reason.label} ({reason.percentage.toFixed(0)}%)
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    {LOSS_REASON_SUGGESTIONS[reason.reason] || 'Analise os casos específicos para identificar melhorias'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
