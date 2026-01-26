import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Calendar, TrendingUp, MessageSquare, Image, Zap, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoricalData {
  activation_date: string;
  months_active: number;
  total_messages_sent: number;
  total_messages_received: number;
  total_media_files: number;
  total_automations: number;
  total_leads: number;
  total_users: number;
}

interface HistoricalCostCardProps {
  companyId: string;
  companyName: string;
  formatCurrency: (cents: number) => string;
  costConfig: {
    cost_per_message_sent: number;
    cost_per_message_received: number;
    cost_per_media_file: number;
    cost_per_automation: number;
    cost_per_lead: number;
    cost_per_user: number;
    base_monthly_cost: number;
  };
  onClose: () => void;
}

export function HistoricalCostCard({
  companyId,
  companyName,
  formatCurrency,
  costConfig,
  onClose,
}: HistoricalCostCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoricalData | null>(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const { data: masterCompanyId } = await supabase.rpc('get_my_company_id');
        if (!masterCompanyId) return;

        const { data: result, error } = await supabase.rpc('get_subconta_historical_cost', {
          p_master_company_id: masterCompanyId,
          p_company_id: companyId,
        });

        if (error) throw error;
        if (result && typeof result === 'object' && 'activation_date' in result) {
          setData(result as unknown as HistoricalData);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [companyId]);

  const calculateTotalCost = () => {
    if (!data) return 0;

    const messagesCost =
      data.total_messages_sent * costConfig.cost_per_message_sent +
      data.total_messages_received * costConfig.cost_per_message_received;
    const mediaCost = data.total_media_files * costConfig.cost_per_media_file;
    const automationCost = data.total_automations * costConfig.cost_per_automation;
    const leadsCost = data.total_leads * costConfig.cost_per_lead;
    const usersCost = data.total_users * costConfig.cost_per_user;
    const baseCost = data.months_active * costConfig.base_monthly_cost;

    return messagesCost + mediaCost + automationCost + leadsCost + usersCost + baseCost;
  };

  const averageMonthlyCost = () => {
    if (!data || data.months_active === 0) return 0;
    return calculateTotalCost() / data.months_active;
  };

  if (loading) {
    return (
      <Card className="fixed bottom-4 right-4 w-96 shadow-lg z-50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg z-50 border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Histórico: {companyName}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Ativa desde {new Date(data.activation_date).toLocaleDateString('pt-BR')}
          <span className="mx-1">•</span>
          {data.months_active} {data.months_active === 1 ? 'mês' : 'meses'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Cost */}
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground">Custo Total Histórico</div>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(calculateTotalCost())}
          </div>
          <div className="text-sm text-muted-foreground">
            Média mensal: {formatCurrency(averageMonthlyCost())}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <MessageSquare className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Mensagens</div>
              <div className="font-semibold">
                {(data.total_messages_sent + data.total_messages_received).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Image className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Mídias</div>
              <div className="font-semibold">{data.total_media_files.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Automações</div>
              <div className="font-semibold">{data.total_automations.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Leads / Users</div>
              <div className="font-semibold">
                {data.total_leads} / {data.total_users}
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="text-xs space-y-1 text-muted-foreground border-t pt-3">
          <div className="flex justify-between">
            <span>Mensagens enviadas ({data.total_messages_sent})</span>
            <span>{formatCurrency(data.total_messages_sent * costConfig.cost_per_message_sent)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mensagens recebidas ({data.total_messages_received})</span>
            <span>{formatCurrency(data.total_messages_received * costConfig.cost_per_message_received)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mídias ({data.total_media_files})</span>
            <span>{formatCurrency(data.total_media_files * costConfig.cost_per_media_file)}</span>
          </div>
          <div className="flex justify-between">
            <span>Automações ({data.total_automations})</span>
            <span>{formatCurrency(data.total_automations * costConfig.cost_per_automation)}</span>
          </div>
          <div className="flex justify-between">
            <span>Custo base ({data.months_active} meses)</span>
            <span>{formatCurrency(data.months_active * costConfig.base_monthly_cost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
