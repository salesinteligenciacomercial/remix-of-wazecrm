import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  Receipt,
  Percent,
  Target,
  Calendar,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { FinanceiroKPIs, CompanySubscription, BillingInvoice } from '@/hooks/useFinanceiro';

interface FinanceiroDashboardEnhancedProps {
  kpis: FinanceiroKPIs;
  subscriptions: CompanySubscription[];
  invoices: BillingInvoice[];
  loading?: boolean;
  onClickOverdue?: () => void;
  onClickActive?: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

// Mini sparkline component
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="ml-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FinanceiroDashboardEnhanced({ 
  kpis, 
  subscriptions,
  invoices,
  loading,
  onClickOverdue,
  onClickActive
}: FinanceiroDashboardEnhancedProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calcular KPIs adicionais
  const arr = kpis.mrr * 12;
  const arpu = kpis.activeClients > 0 ? kpis.mrr / kpis.activeClients : 0;
  
  // Projeção 3 meses (considerando churn estimado)
  const churnMultiplier = 1 - (kpis.churnRate / 100);
  const projection3Months = kpis.mrr * 3 * churnMultiplier;
  
  // Trials ativos
  const activeTrials = subscriptions.filter(s => s.status === 'trial').length;
  const trialsExpiringSoon = subscriptions.filter(s => {
    if (s.status !== 'trial') return false;
    const trialEnd = s.trial_end_date ? new Date(s.trial_end_date) : null;
    if (!trialEnd) return false;
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3 && daysLeft > 0;
  }).length;

  // Dados simulados para sparklines (em produção viriam de dados históricos)
  const mrrTrend = [kpis.mrr * 0.85, kpis.mrr * 0.88, kpis.mrr * 0.92, kpis.mrr * 0.95, kpis.mrr];

  const cards = [
    // Linha 1 - Receita
    {
      title: 'MRR Atual',
      value: formatCurrency(kpis.mrr),
      icon: DollarSign,
      description: 'Receita Recorrente Mensal',
      tooltip: 'Soma de todas as assinaturas ativas',
      trend: mrrTrend,
      color: 'text-emerald-600',
      trendColor: '#10b981'
    },
    {
      title: 'ARR',
      value: formatCurrency(arr),
      icon: Calendar,
      description: 'Receita Anual Recorrente',
      tooltip: 'MRR x 12 meses',
      color: 'text-emerald-600'
    },
    {
      title: 'ARPU',
      value: formatCurrency(arpu),
      icon: BarChart3,
      description: 'Receita média por cliente',
      tooltip: 'MRR dividido pelo número de clientes ativos',
      color: 'text-blue-600'
    },
    {
      title: 'Projeção 3 Meses',
      value: formatCurrency(projection3Months),
      icon: TrendingUp,
      description: 'Estimativa considerando churn',
      tooltip: `MRR x 3 x (1 - ${formatPercent(kpis.churnRate)} churn)`,
      color: 'text-purple-600'
    },
    // Linha 2 - Clientes
    {
      title: 'Clientes Ativos',
      value: kpis.activeClients.toString(),
      icon: Users,
      description: 'subcontas pagantes',
      tooltip: 'Total de assinaturas com status ativo',
      color: 'text-blue-600',
      onClick: onClickActive
    },
    {
      title: 'Trials Ativos',
      value: activeTrials.toString(),
      icon: Clock,
      description: trialsExpiringSoon > 0 ? `${trialsExpiringSoon} expirando em breve ⚠️` : 'em período de teste',
      tooltip: 'Assinaturas em período de trial',
      color: trialsExpiringSoon > 0 ? 'text-amber-600' : 'text-blue-600',
      badge: trialsExpiringSoon > 0 ? trialsExpiringSoon : undefined
    },
    {
      title: 'Variação MRR',
      value: formatPercent(kpis.mrrVariation),
      icon: kpis.mrrVariation >= 0 ? TrendingUp : TrendingDown,
      description: 'vs mês anterior',
      tooltip: 'Crescimento ou queda em relação ao mês passado',
      color: kpis.mrrVariation >= 0 ? 'text-emerald-600' : 'text-red-600'
    },
    {
      title: 'Churn Rate',
      value: formatPercent(kpis.churnRate),
      icon: Percent,
      description: 'taxa de cancelamento',
      tooltip: 'Percentual de cancelamentos nos últimos 30 dias',
      color: kpis.churnRate < 5 ? 'text-emerald-600' : 'text-red-600'
    },
    // Linha 3 - Financeiro
    {
      title: 'Pago no Mês',
      value: formatCurrency(kpis.paidThisMonth),
      icon: Receipt,
      description: 'recebido este mês',
      tooltip: 'Total de faturas pagas no mês atual',
      color: 'text-emerald-600'
    },
    {
      title: 'A Receber',
      value: formatCurrency(kpis.pendingAmount),
      icon: Clock,
      description: 'faturas pendentes',
      tooltip: 'Valor total de faturas aguardando pagamento',
      color: 'text-amber-600'
    },
    {
      title: 'Inadimplentes',
      value: formatCurrency(kpis.overdueAmount),
      icon: AlertTriangle,
      description: `${kpis.overdueCount} fatura(s) em atraso`,
      tooltip: 'Faturas vencidas não pagas',
      color: 'text-red-600',
      onClick: onClickOverdue,
      badge: kpis.overdueCount > 0 ? kpis.overdueCount : undefined
    },
    {
      title: 'Taxa Setup (Ano)',
      value: formatCurrency(kpis.setupFeesYear),
      icon: Target,
      description: 'implantações este ano',
      tooltip: 'Soma das taxas de setup pagas no ano',
      color: 'text-purple-600'
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            className={`hover:shadow-md transition-shadow relative ${card.onClick ? 'cursor-pointer hover:border-primary' : ''}`}
            onClick={card.onClick}
          >
            {card.badge && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {card.badge}
              </span>
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{card.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </div>
                {card.trend && card.trendColor && (
                  <MiniSparkline data={card.trend} color={card.trendColor} />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
