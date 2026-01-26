import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  CreditCard, 
  FileText, 
  ArrowLeftRight,
  TrendingUp,
  ShieldAlert,
  Building2,
  Zap,
  Calculator,
  Clock,
  PieChart
} from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { FinanceiroDashboardEnhanced } from '@/components/financeiro/FinanceiroDashboardEnhanced';
import { AssinaturasManager } from '@/components/financeiro/AssinaturasManager';
import { FaturasManager } from '@/components/financeiro/FaturasManager';
import { TransacoesManager } from '@/components/financeiro/TransacoesManager';
import { MRRChart } from '@/components/financeiro/MRRChart';
import { SubcontasFinanceiroManager } from '@/components/financeiro/SubcontasFinanceiroManager';
import { AsaasIntegration } from '@/components/financeiro/AsaasIntegration';
import { CustoCalculator } from '@/components/financeiro/CustoCalculator';
import { TrialManager } from '@/components/financeiro/TrialManager';
import { FluxoCaixaChart } from '@/components/financeiro/FluxoCaixaChart';
import { AgingReport } from '@/components/financeiro/AgingReport';
import { supabase } from '@/integrations/supabase/client';

export default function Financeiro() {
  const [isMasterAccount, setIsMasterAccount] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const {
    loading,
    plans,
    subscriptions,
    invoices,
    transactions,
    kpis,
    createSubscription,
    updateSubscription,
    createInvoice,
    updateInvoice,
    markInvoiceAsPaid,
  } = useFinanceiro();

  const refreshData = useCallback(() => {
    window.location.reload();
  }, []);

  // Handle trial conversion
  const handleConvertTrial = async (subscriptionId: string, data: { 
    status: string; 
    monthly_value: number;
    billing_plan_id?: string;
    converted_from_trial: boolean;
  }) => {
    return await updateSubscription(subscriptionId, data as any);
  };

  // Handle trial extension
  const handleExtendTrial = async (subscriptionId: string, newEndDate: string) => {
    return await updateSubscription(subscriptionId, { trial_end_date: newEndDate } as any);
  };

  // Check if user has access (is master account)
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: company } = await supabase
          .rpc('get_my_company');
        
        if (company && company.length > 0) {
          setIsMasterAccount(company[0].is_master_account === true);
        } else {
          setIsMasterAccount(false);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsMasterAccount(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, []);

  // Show loading while checking access
  if (checkingAccess) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect if not master account
  if (!isMasterAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground max-w-md">
          Esta área é exclusiva para contas master. 
          Entre em contato com o administrador se precisar de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Gerencie assinaturas, faturas e acompanhe o MRR das suas subcontas
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 md:grid-cols-10 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="trials" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Trials</span>
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Fluxo</span>
          </TabsTrigger>
          <TabsTrigger value="aging" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Aging</span>
          </TabsTrigger>
          <TabsTrigger value="subcontas" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Subcontas</span>
          </TabsTrigger>
          <TabsTrigger value="custos" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Custos</span>
          </TabsTrigger>
          <TabsTrigger value="asaas" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Asaas</span>
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Assinaturas</span>
          </TabsTrigger>
          <TabsTrigger value="faturas" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Faturas</span>
          </TabsTrigger>
          <TabsTrigger value="transacoes" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <FinanceiroDashboardEnhanced 
            kpis={kpis} 
            subscriptions={subscriptions}
            invoices={invoices}
            loading={loading} 
          />
          <FluxoCaixaChart 
            subscriptions={subscriptions}
            invoices={invoices}
            loading={loading}
          />
          <MRRChart 
            subscriptions={subscriptions} 
            transactions={transactions} 
            loading={loading} 
          />
        </TabsContent>

        <TabsContent value="trials">
          <TrialManager
            subscriptions={subscriptions}
            plans={plans}
            loading={loading}
            onConvertTrial={handleConvertTrial}
            onExtendTrial={handleExtendTrial}
          />
        </TabsContent>

        <TabsContent value="fluxo">
          <FluxoCaixaChart 
            subscriptions={subscriptions}
            invoices={invoices}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="aging">
          <AgingReport 
            invoices={invoices}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="subcontas">
          <SubcontasFinanceiroManager
            subscriptions={subscriptions}
            plans={plans}
            loading={loading}
            onCreateSubscription={createSubscription}
          />
        </TabsContent>

        <TabsContent value="custos">
          <CustoCalculator />
        </TabsContent>

        <TabsContent value="asaas">
          <AsaasIntegration
            subscriptions={subscriptions}
            invoices={invoices}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="assinaturas">
          <AssinaturasManager
            subscriptions={subscriptions}
            plans={plans}
            loading={loading}
            onCreateSubscription={createSubscription}
            onUpdateSubscription={updateSubscription}
            onCreateInvoice={createInvoice}
          />
        </TabsContent>

        <TabsContent value="faturas">
          <FaturasManager
            invoices={invoices}
            subscriptions={subscriptions}
            loading={loading}
            onCreateInvoice={createInvoice}
            onUpdateInvoice={updateInvoice}
            onMarkAsPaid={markInvoiceAsPaid}
          />
        </TabsContent>

        <TabsContent value="transacoes">
          <TransacoesManager
            transactions={transactions}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
