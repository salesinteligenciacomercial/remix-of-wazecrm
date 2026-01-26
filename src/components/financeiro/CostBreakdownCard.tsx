import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Users, MessageSquare, Image, Zap, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { CompanyCostBreakdown } from '@/hooks/useCompanyCosts';

interface CostBreakdownCardProps {
  breakdown: CompanyCostBreakdown;
  formatCurrency: (cents: number) => string;
  onClose: () => void;
}

export function CostBreakdownCard({ breakdown, formatCurrency, onClose }: CostBreakdownCardProps) {
  const costItems = [
    {
      label: 'Custo Base',
      value: breakdown.baseCost,
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      label: 'Leads',
      value: breakdown.leadsCost,
      count: breakdown.totalLeads,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      label: 'Usuários',
      value: breakdown.usersCost,
      count: breakdown.totalUsers,
      icon: Users,
      color: 'text-indigo-500',
    },
    {
      label: 'Mensagens',
      value: breakdown.messagesCost,
      count: breakdown.messagesSent + breakdown.messagesReceived,
      icon: MessageSquare,
      color: 'text-green-500',
    },
    {
      label: 'Mídia',
      value: breakdown.mediaCost,
      count: breakdown.mediaFiles,
      icon: Image,
      color: 'text-orange-500',
    },
    {
      label: 'Automações',
      value: breakdown.automationCost,
      count: breakdown.automationExecutions,
      icon: Zap,
      color: 'text-yellow-500',
    },
  ];

  const totalPercentage = (value: number) => {
    return breakdown.totalCost > 0 ? ((value / breakdown.totalCost) * 100).toFixed(1) : '0';
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg z-50 animate-in slide-in-from-right">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{breakdown.companyName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {breakdown.subscriptionStatus === 'active' ? (
                <Badge variant="outline" className="text-xs">Assinatura Ativa</Badge>
              ) : breakdown.subscriptionStatus === 'sem_assinatura' ? (
                <Badge variant="secondary" className="text-xs">Sem Assinatura</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">{breakdown.subscriptionStatus}</Badge>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="text-xl font-bold">{formatCurrency(breakdown.totalCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-xl font-bold">{formatCurrency(breakdown.monthlyRevenue)}</p>
          </div>
        </div>

        {/* Margin */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          breakdown.margin >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          <div className="flex items-center gap-2">
            {breakdown.margin >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium">Margem</p>
              <p className={`text-lg font-bold ${
                breakdown.margin >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(breakdown.margin)} ({breakdown.marginPercent.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Detalhamento de Custos</p>
          {costItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm">{item.label}</span>
                  {item.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{totalPercentage(item.value)}%</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning for negative margin */}
        {breakdown.margin < 0 && (
          <>
            <Separator />
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-600 font-medium">⚠️ Margem Negativa</p>
              <p className="text-xs text-red-500 mt-1">
                Esta subconta está gerando prejuízo de {formatCurrency(Math.abs(breakdown.margin))} por mês.
                Considere revisar o plano ou os custos operacionais.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
