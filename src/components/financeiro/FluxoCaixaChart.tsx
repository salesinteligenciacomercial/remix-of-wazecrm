import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { CompanySubscription, BillingInvoice } from '@/hooks/useFinanceiro';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FluxoCaixaChartProps {
  subscriptions: CompanySubscription[];
  invoices: BillingInvoice[];
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

export function FluxoCaixaChart({ subscriptions, invoices, loading }: FluxoCaixaChartProps) {
  const chartData = useMemo(() => {
    if (loading) return [];
    
    const now = new Date();
    const months: { 
      month: string; 
      previsto: number; 
      recebido: number;
      aReceber: number;
      vencido: number;
    }[] = [];
    
    // Gerar dados para o mês atual + 2 próximos
    for (let i = 0; i < 3; i++) {
      const monthDate = addMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });
      
      // MRR previsto (assinaturas ativas)
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const mrr = activeSubscriptions.reduce((sum, s) => sum + Number(s.monthly_value || 0), 0);
      
      // Faturas do mês
      const monthInvoices = invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
      });
      
      // Recebido (faturas pagas)
      const recebido = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      // A receber (faturas pendentes)
      const aReceber = monthInvoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      // Vencido (faturas overdue)
      const vencido = monthInvoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      
      months.push({
        month: monthLabel,
        previsto: mrr,
        recebido,
        aReceber: aReceber + (i === 0 ? 0 : mrr - recebido - vencido), // Projeção
        vencido
      });
    }
    
    return months;
  }, [subscriptions, invoices, loading]);

  // Calcular totais
  const totals = useMemo(() => {
    const previsto = chartData.reduce((sum, d) => sum + d.previsto, 0);
    const recebido = chartData.reduce((sum, d) => sum + d.recebido, 0);
    const aReceber = chartData.reduce((sum, d) => sum + d.aReceber, 0);
    const vencido = chartData.reduce((sum, d) => sum + d.vencido, 0);
    
    return { previsto, recebido, aReceber, vencido };
  }, [chartData]);

  // Verificar concentração de vencimentos
  const concentrationWarning = useMemo(() => {
    if (!invoices.length) return null;
    
    const pendingByDate: Record<string, number> = {};
    invoices
      .filter(inv => inv.status === 'pending')
      .forEach(inv => {
        const date = format(new Date(inv.due_date), 'dd/MM');
        pendingByDate[date] = (pendingByDate[date] || 0) + 1;
      });
    
    const maxConcentration = Math.max(...Object.values(pendingByDate));
    if (maxConcentration >= 3) {
      const date = Object.entries(pendingByDate).find(([, count]) => count === maxConcentration)?.[0];
      return `${maxConcentration} faturas vencem em ${date}`;
    }
    return null;
  }, [invoices]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fluxo de Caixa - Próximos 3 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fluxo de Caixa - Próximos 3 Meses
            </CardTitle>
            <CardDescription>
              Projeção de recebimentos baseada nas assinaturas ativas
            </CardDescription>
          </div>
          {concentrationWarning && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              {concentrationWarning}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatCompact}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'previsto' ? 'Previsto (MRR)' :
                  name === 'recebido' ? 'Recebido' :
                  name === 'aReceber' ? 'A Receber' : 'Vencido'
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                formatter={(value) => 
                  value === 'previsto' ? 'Previsto (MRR)' :
                  value === 'recebido' ? 'Recebido' :
                  value === 'aReceber' ? 'A Receber' : 'Vencido'
                }
              />
              <Bar dataKey="previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.3} />
              <Bar dataKey="recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aReceber" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              {chartData.some(d => d.vencido > 0) && (
                <Bar dataKey="vencido" fill="#ef4444" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Previsto (3 meses)</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totals.previsto)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Recebido</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.recebido)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">A Receber</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totals.aReceber)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Vencido</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.vencido)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
