import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { CompanyCostBreakdown } from '@/hooks/useCompanyCosts';
import { TrendingUp } from 'lucide-react';

interface CostComparisonChartProps {
  data: CompanyCostBreakdown[];
  formatCurrency: (cents: number) => string;
}

export function CostComparisonChart({ data, formatCurrency }: CostComparisonChartProps) {
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.companyName.length > 12 
      ? item.companyName.substring(0, 12) + '...' 
      : item.companyName,
    fullName: item.companyName,
    custo: item.totalCost / 100,
    receita: item.monthlyRevenue / 100,
    margem: item.margin / 100,
    margemPercent: item.marginPercent,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-2">{item.fullName}</p>
          <div className="space-y-1">
            <p className="text-red-500">
              Custo: {formatCurrency(item.custo * 100)}
            </p>
            <p className="text-green-500">
              Receita: {formatCurrency(item.receita * 100)}
            </p>
            <p className={item.margem >= 0 ? 'text-blue-500' : 'text-orange-500'}>
              Margem: {formatCurrency(item.margem * 100)} ({item.margemPercent.toFixed(1)}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Custo vs Receita por Subconta
        </CardTitle>
        <CardDescription>
          Comparativo dos custos operacionais e receitas das principais subcontas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$${value}`}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar 
                dataKey="custo" 
                name="Custo" 
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                dataKey="receita" 
                name="Receita" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
