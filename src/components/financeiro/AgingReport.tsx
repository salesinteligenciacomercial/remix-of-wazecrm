import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from 'recharts';
import { Clock, AlertTriangle } from 'lucide-react';
import { BillingInvoice } from '@/hooks/useFinanceiro';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgingReportProps {
  invoices: BillingInvoice[];
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#991b1b'];

export function AgingReport({ invoices, loading }: AgingReportProps) {
  const agingData = useMemo(() => {
    if (loading) return { buckets: [], total: 0, byCompany: [] };
    
    const now = new Date();
    
    // Filtrar apenas faturas não pagas
    const unpaidInvoices = invoices.filter(inv => 
      inv.status === 'pending' || inv.status === 'overdue'
    );
    
    // Agrupar por faixa de dias
    const buckets = [
      { range: 'A vencer', min: -Infinity, max: 0, invoices: [] as BillingInvoice[], color: COLORS[0] },
      { range: '1-30 dias', min: 1, max: 30, invoices: [] as BillingInvoice[], color: COLORS[1] },
      { range: '31-60 dias', min: 31, max: 60, invoices: [] as BillingInvoice[], color: COLORS[2] },
      { range: '61-90 dias', min: 61, max: 90, invoices: [] as BillingInvoice[], color: COLORS[3] },
      { range: '90+ dias', min: 91, max: Infinity, invoices: [] as BillingInvoice[], color: COLORS[4] },
    ];
    
    unpaidInvoices.forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = differenceInDays(now, dueDate);
      
      const bucket = buckets.find(b => daysOverdue >= b.min && daysOverdue <= b.max);
      if (bucket) {
        bucket.invoices.push(inv);
      }
    });
    
    // Calcular valor total por faixa
    const bucketData = buckets.map(b => ({
      name: b.range,
      value: b.invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0),
      count: b.invoices.length,
      color: b.color,
      invoices: b.invoices
    }));
    
    // Total geral
    const total = bucketData.reduce((sum, b) => sum + b.value, 0);
    
    // Agrupar por empresa (top 5 inadimplentes)
    const byCompany: { company: string; total: number; count: number }[] = [];
    const companyMap = new Map<string, { total: number; count: number }>();
    
    unpaidInvoices.forEach(inv => {
      const companyName = inv.company?.name || 'Desconhecido';
      const current = companyMap.get(companyName) || { total: 0, count: 0 };
      companyMap.set(companyName, {
        total: current.total + Number(inv.amount || 0),
        count: current.count + 1
      });
    });
    
    companyMap.forEach((data, company) => {
      byCompany.push({ company, ...data });
    });
    
    byCompany.sort((a, b) => b.total - a.total);
    
    return { 
      buckets: bucketData.filter(b => b.value > 0), 
      total,
      byCompany: byCompany.slice(0, 5)
    };
  }, [invoices, loading]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aging Report
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
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Aging Report - Faturas por Tempo de Atraso
        </CardTitle>
        <CardDescription>
          Análise de inadimplência por faixa de dias em atraso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="h-[250px]">
            {agingData.buckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agingData.buckets}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {agingData.buckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhuma fatura em aberto
              </div>
            )}
          </div>

          {/* Summary Table */}
          <div>
            <h4 className="font-semibold mb-3">Resumo por Faixa</h4>
            <div className="space-y-2">
              {agingData.buckets.map((bucket, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: bucket.color }}
                    />
                    <span className="text-sm">{bucket.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {bucket.count} fatura{bucket.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(bucket.value)}</span>
                </div>
              ))}
              
              {agingData.buckets.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 mt-3">
                  <span className="font-semibold">Total em Aberto</span>
                  <span className="font-bold text-lg">{formatCurrency(agingData.total)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Inadimplentes */}
        {agingData.byCompany.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Top 5 Maiores Devedores</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Faturas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.byCompany.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.company}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
