import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Settings2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Users,
  AlertTriangle,
  Download,
  RefreshCw,
  History,
  Calendar,
  Bell
} from 'lucide-react';
import { useCompanyCosts, CompanyCostBreakdown } from '@/hooks/useCompanyCosts';
import { useCostAlerts } from '@/hooks/useCostAlerts';
import { CostConfigurationDialog } from './CostConfigurationDialog';
import { CostBreakdownCard } from './CostBreakdownCard';
import { CostComparisonChart } from './CostComparisonChart';
import { HistoricalCostCard } from './HistoricalCostCard';
import { MonthlyCostComparison } from './MonthlyCostComparison';
import { CostAlertsManager } from './CostAlertsManager';

type PeriodFilter = 'current_month' | 'last_month' | 'last_3_months' | 'custom';

export function CustoCalculator() {
  const {
    loading,
    costConfig,
    costBreakdowns,
    summary,
    loadData,
    updateCostConfig,
    formatCurrency,
  } = useCompanyCosts();

  const { activeAlertsCount } = useCostAlerts();

  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyCostBreakdown | null>(null);
  const [historicalCompanyId, setHistoricalCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handlePeriodChange = (value: PeriodFilter) => {
    setPeriod(value);
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (value) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    loadData(startDate, endDate);
  };

  const handleExportCSV = () => {
    const headers = [
      'Subconta',
      'Status',
      'Leads',
      'Usuários',
      'Msgs Enviadas',
      'Msgs Recebidas',
      'Mídia',
      'Automações',
      'Custo Total',
      'Receita',
      'Margem',
      'Margem %'
    ];

    const rows = costBreakdowns.map(b => [
      b.companyName,
      b.subscriptionStatus,
      b.totalLeads,
      b.totalUsers,
      b.messagesSent,
      b.messagesReceived,
      b.mediaFiles,
      b.automationExecutions,
      (b.totalCost / 100).toFixed(2),
      (b.monthlyRevenue / 100).toFixed(2),
      (b.margin / 100).toFixed(2),
      b.marginPercent.toFixed(1) + '%'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custos-subcontas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getMarginBadge = (marginPercent: number) => {
    if (marginPercent >= 60) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">{marginPercent.toFixed(1)}%</Badge>;
    } else if (marginPercent >= 30) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{marginPercent.toFixed(1)}%</Badge>;
    } else if (marginPercent >= 0) {
      return <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">{marginPercent.toFixed(1)}%</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">{marginPercent.toFixed(1)}%</Badge>;
  };

  const selectedHistoricalCompany = historicalCompanyId 
    ? costBreakdowns.find(b => b.companyId === historicalCompanyId) 
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Calculador de Custos
          </h2>
          <p className="text-muted-foreground">
            Análise de custos operacionais por subconta
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Configurar Custos
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Internal Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
            {activeAlertsCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Period Filter */}
          <div className="flex justify-end">
            <Select value={period} onValueChange={(v) => handlePeriodChange(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="last_month">Mês Anterior</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.subcontasCount} subconta{summary.subcontasCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.averageCost)}</div>
                <p className="text-xs text-muted-foreground">por subconta</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
                {summary.averageMarginPercent >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.averageMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.averageMarginPercent.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Lucro: {formatCurrency(summary.grossProfit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.subcontasWithNegativeMargin}</div>
                <p className="text-xs text-muted-foreground">com margem negativa</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <CostComparisonChart data={costBreakdowns} formatCurrency={formatCurrency} />

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Custos por Subconta
              </CardTitle>
              <CardDescription>
                Detalhamento de custos operacionais e margens de cada subconta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costBreakdowns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma subconta encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie subcontas para visualizar os custos aqui
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subconta</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Msgs</TableHead>
                        <TableHead className="text-right">Mídia</TableHead>
                        <TableHead className="text-right">Automações</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Margem</TableHead>
                        <TableHead className="text-center">Histórico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costBreakdowns.map((breakdown) => (
                        <TableRow 
                          key={breakdown.companyId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedCompany(breakdown)}
                        >
                          <TableCell>
                            <div className="font-medium">{breakdown.companyName}</div>
                            <div className="text-xs text-muted-foreground">
                              {breakdown.subscriptionStatus === 'active' ? (
                                <Badge variant="outline" className="text-xs">Ativa</Badge>
                              ) : breakdown.subscriptionStatus === 'sem_assinatura' ? (
                                <Badge variant="secondary" className="text-xs">Sem plano</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">{breakdown.subscriptionStatus}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{breakdown.totalLeads}</TableCell>
                          <TableCell className="text-right">
                            {breakdown.messagesSent + breakdown.messagesReceived}
                          </TableCell>
                          <TableCell className="text-right">{breakdown.mediaFiles}</TableCell>
                          <TableCell className="text-right">{breakdown.automationExecutions}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(breakdown.totalCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(breakdown.monthlyRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {getMarginBadge(breakdown.marginPercent)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoricalCompanyId(breakdown.companyId);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Comparison Tab */}
        <TabsContent value="monthly" className="mt-6">
          <MonthlyCostComparison />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <CostAlertsManager />
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <CostConfigurationDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        config={costConfig}
        onSave={updateCostConfig}
      />

      {/* Breakdown Detail Card */}
      {selectedCompany && (
        <CostBreakdownCard
          breakdown={selectedCompany}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Historical Cost Card */}
      {selectedHistoricalCompany && costConfig && (
        <HistoricalCostCard
          companyId={selectedHistoricalCompany.companyId}
          companyName={selectedHistoricalCompany.companyName}
          formatCurrency={formatCurrency}
          costConfig={{
            cost_per_message_sent: costConfig.cost_per_message_sent,
            cost_per_message_received: costConfig.cost_per_message_received,
            cost_per_media_file: costConfig.cost_per_media_file,
            cost_per_automation: costConfig.cost_per_automation,
            cost_per_lead: costConfig.cost_per_lead,
            cost_per_user: costConfig.cost_per_user,
            base_monthly_cost: costConfig.base_monthly_cost,
          }}
          onClose={() => setHistoricalCompanyId(null)}
        />
      )}
    </div>
  );
}
