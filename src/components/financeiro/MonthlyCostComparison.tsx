import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, BarChart3 } from 'lucide-react';
import { useMonthlyCostHistory, MonthlyCompanyData } from '@/hooks/useMonthlyCostHistory';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type MonthFilter = 3 | 6 | 12;

export function MonthlyCostComparison() {
  const { loading, monthlyData, loadMonthlyData, formatCurrency, formatMonth } = useMonthlyCostHistory();
  const [monthFilter, setMonthFilter] = useState<MonthFilter>(6);

  useEffect(() => {
    loadMonthlyData(monthFilter);
  }, [monthFilter]);

  // Get unique companies across all months
  const allCompanies = new Map<string, string>();
  monthlyData.forEach((month) => {
    month.companies.forEach((company) => {
      allCompanies.set(company.companyId, company.companyName);
    });
  });

  // Create pivot table data
  const getPivotData = () => {
    const pivotData: {
      companyId: string;
      companyName: string;
      monthlyValues: { [month: string]: MonthlyCompanyData | null };
      lastMonthChange: number;
    }[] = [];

    allCompanies.forEach((name, id) => {
      const monthlyValues: { [month: string]: MonthlyCompanyData | null } = {};
      let lastValue: number | null = null;
      let prevValue: number | null = null;

      monthlyData.forEach((month, index) => {
        const companyData = month.companies.find((c) => c.companyId === id) || null;
        monthlyValues[month.monthYear] = companyData;

        if (companyData) {
          if (index === monthlyData.length - 1) {
            lastValue = companyData.totalCost;
          } else if (index === monthlyData.length - 2) {
            prevValue = companyData.totalCost;
          }
        }
      });

      const lastMonthChange = lastValue && prevValue 
        ? ((lastValue - prevValue) / prevValue) * 100 
        : 0;

      pivotData.push({
        companyId: id,
        companyName: name,
        monthlyValues,
        lastMonthChange,
      });
    });

    return pivotData.sort((a, b) => a.companyName.localeCompare(b.companyName));
  };

  // Prepare chart data
  const getChartData = () => {
    return monthlyData.map((month) => ({
      month: formatMonth(month.monthYear),
      custo: month.totals.totalCost / 100,
      receita: month.totals.totalRevenue / 100,
      margem: month.totals.totalMargin / 100,
    }));
  };

  const pivotData = getPivotData();
  const chartData = getChartData();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Comparativo Mensal
          </h3>
          <p className="text-sm text-muted-foreground">
            Evolução de custos mês a mês por subconta
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {([3, 6, 12] as MonthFilter[]).map((m) => (
              <Button
                key={m}
                variant={monthFilter === m ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setMonthFilter(m)}
              >
                {m}m
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => loadMonthlyData(monthFilter)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução Total
          </CardTitle>
          <CardDescription>
            Comparativo de custo total, receita e margem ao longo dos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.3)"
                />
                <Area
                  type="monotone"
                  dataKey="custo"
                  name="Custo"
                  stackId="2"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.3)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pivot Table */}
      <Card>
        <CardHeader>
          <CardTitle>Custos por Subconta</CardTitle>
          <CardDescription>
            Tabela detalhada com custos mensais e variação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pivotData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nenhuma subconta encontrada no período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Subconta</TableHead>
                    {monthlyData.map((month) => (
                      <TableHead key={month.monthYear} className="text-right min-w-[100px]">
                        {formatMonth(month.monthYear)}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotData.map((row) => (
                    <TableRow key={row.companyId}>
                      <TableCell className="font-medium sticky left-0 bg-background">
                        {row.companyName}
                      </TableCell>
                      {monthlyData.map((month) => {
                        const data = row.monthlyValues[month.monthYear];
                        return (
                          <TableCell key={month.monthYear} className="text-right">
                            {data ? formatCurrency(data.totalCost) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {row.lastMonthChange !== 0 ? (
                          <Badge
                            variant="outline"
                            className={
                              row.lastMonthChange > 0
                                ? 'text-red-600 border-red-300'
                                : 'text-green-600 border-green-300'
                            }
                          >
                            {row.lastMonthChange > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {row.lastMonthChange > 0 ? '+' : ''}
                            {row.lastMonthChange.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell className="sticky left-0 bg-muted/50">Total</TableCell>
                    {monthlyData.map((month) => (
                      <TableCell key={month.monthYear} className="text-right">
                        {formatCurrency(month.totals.totalCost)}
                      </TableCell>
                    ))}
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
